'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFerrariModel } from '@/components/FerrariModel';
import type { DrivingTelemetry, Gear, Keys } from './types';

type CarProps = {
  gear: Gear;
  telemetryRef: React.MutableRefObject<DrivingTelemetry>;
  worldPositionRef: React.MutableRefObject<THREE.Vector3>;
  drivingStateRef: React.MutableRefObject<{
    position: THREE.Vector3;
    heading: number;
    velocity: number;
    steer: number;
    speedKmh: number;
  }>;
  speedRef?: React.MutableRefObject<number>;
};

export function Car({
  gear,
  telemetryRef,
  worldPositionRef,
  drivingStateRef,
  speedRef,
}: CarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const chassisRef = useRef<THREE.Group>(null);
  const brakeLightRef = useRef<THREE.Mesh>(null);
  const { object: carObject, wheels, frontWheels } = useFerrariModel({
    targetLength: 2.4,
  });

  const heading = useRef(0);
  const velocity = useRef(0);
  const steer = useRef(0);
  const throttleInput = useRef(0);
  const brakeInput = useRef(0);
  const slipRef = useRef(0);
  const absPhase = useRef(0);

  const keys = useRef<Keys>({
    w: false,
    s: false,
    a: false,
    d: false,
    space: false,
    shift: false,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') keys.current.w = down;
      if (k === 's' || k === 'arrowdown') keys.current.s = down;
      if (k === 'a' || k === 'arrowleft') keys.current.a = down;
      if (k === 'd' || k === 'arrowright') keys.current.d = down;
      if (k === ' ') keys.current.space = down;
      if (k === 'shift') keys.current.shift = down;
    };
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    return () => {
      window.removeEventListener('keydown', (e) => onKey(e, true));
      window.removeEventListener('keyup', (e) => onKey(e, false));
    };
  }, []);

  useFrame((_, dt) => {
    if (!groupRef.current || !chassisRef.current) return;

    const maxForward = 28;
    const maxReverse = -10;
    const accel = 18;
    const brakePower = 28;
    const drag = 6;

    const wantsThrottle = keys.current.w;
    const wantsBrake = keys.current.s || keys.current.space;

    let throttleTarget = 0;
    if (gear === 'D' && wantsThrottle) throttleTarget = 1;
    if (gear === 'R' && wantsThrottle) throttleTarget = -0.7;

    throttleInput.current = THREE.MathUtils.lerp(
      throttleInput.current,
      throttleTarget,
      0.14
    );
    brakeInput.current = THREE.MathUtils.lerp(
      brakeInput.current,
      wantsBrake ? 1 : 0,
      0.22
    );

    velocity.current += throttleInput.current * accel * dt;

    const speedAbsPreBrake = Math.abs(velocity.current);
    const absActive = wantsBrake && speedAbsPreBrake > 9;
    if (absActive) {
      absPhase.current += dt * 20;
      const pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(absPhase.current));
      velocity.current -=
        Math.sign(velocity.current || 1) * brakePower * pulse * dt;
    } else if (wantsBrake) {
      velocity.current -=
        Math.sign(velocity.current || 1) * brakePower * dt;
    }

    if (!wantsThrottle) {
      velocity.current -=
        Math.sign(velocity.current) *
        Math.min(Math.abs(velocity.current), drag * dt);
    }

    if (gear === 'P') velocity.current *= 1 - Math.min(0.95, dt * 10);
    if (gear === 'N') velocity.current *= 1 - Math.min(0.7, dt * 4.5);

    velocity.current = THREE.MathUtils.clamp(
      velocity.current,
      maxReverse,
      maxForward
    );

    const speedAbs = Math.abs(velocity.current);
    const steerTarget = (keys.current.a ? 1 : 0) + (keys.current.d ? -1 : 0);
    const grip = THREE.MathUtils.clamp(1 - speedAbs / 44, 0.35, 1);
    steer.current = THREE.MathUtils.lerp(steer.current, steerTarget * grip, 0.16);

    const slipDemand = THREE.MathUtils.clamp(
      (Math.abs(steer.current) * Math.abs(throttleInput.current) * speedAbs) /
        14,
      0,
      1
    );
    slipRef.current = THREE.MathUtils.lerp(slipRef.current, slipDemand, 0.08);
    const yawGrip = THREE.MathUtils.lerp(1, 0.58, slipRef.current);
    heading.current += steer.current * (velocity.current / 16) * dt * yawGrip;

    groupRef.current.rotation.y = heading.current + Math.PI;

    const forwardX = Math.sin(heading.current);
    const forwardZ = Math.cos(heading.current);

    worldPositionRef.current.x += forwardX * velocity.current * dt;
    worldPositionRef.current.z += forwardZ * velocity.current * dt;

    const steerAngle = THREE.MathUtils.clamp(steer.current * 0.44, -0.44, 0.44);

    const chassisBaseY = 0.42;
    const pitch = THREE.MathUtils.clamp(
      (throttleInput.current - brakeInput.current) * 0.06,
      -0.08,
      0.06
    );
    const bounce =
      Math.sin(performance.now() * 0.01 + speedAbs) * (speedAbs > 2 ? 0.007 : 0);
    chassisRef.current.rotation.z = THREE.MathUtils.lerp(
      chassisRef.current.rotation.z,
      pitch,
      0.1
    );
    chassisRef.current.rotation.x = steer.current * 0.04;
    chassisRef.current.position.y = chassisBaseY + bounce;

    const wheelRadius = 0.35;
    if (Math.abs(velocity.current) > 0.08) {
      const spin = (velocity.current / wheelRadius) * dt;
      wheels.forEach((w) => {
        if (w) w.rotation.x -= spin;
      });
    }
    frontWheels.forEach((w) => {
      if (w) w.rotation.y = steerAngle;
    });

    if (brakeLightRef.current) {
      const m = brakeLightRef.current.material as THREE.MeshStandardMaterial;
      const absBlink = absActive
        ? 2.0 + (0.5 + 0.5 * Math.sin(absPhase.current * 1.2)) * 1.2
        : 2.7;
      m.emissiveIntensity = wantsBrake ? absBlink : 0.35;
    }

    const speedKmh = Math.max(0, velocity.current * 3.6);
    drivingStateRef.current = {
      position: worldPositionRef.current.clone(),
      heading: heading.current,
      velocity: velocity.current,
      steer: steerAngle,
      speedKmh,
    };
    if (speedRef) speedRef.current = speedKmh;

    telemetryRef.current = {
      speedKmh,
      rpm: THREE.MathUtils.clamp(
        850 + speedAbs * 230 + Math.abs(throttleInput.current) * 1250,
        850,
        7600
      ),
      braking: wantsBrake,
      steer: steerAngle,
      slip: slipRef.current,
      absActive,
      worldPosition: {
        x: worldPositionRef.current.x,
        y: worldPositionRef.current.y,
        z: worldPositionRef.current.z,
      },
      heading: heading.current,
      velocity: velocity.current,
    };
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={chassisRef} position={[0, 0.42, 0]}>
        <primitive object={carObject} />
        <mesh position={[-1.2, 0.31, 0.34]}>
          <boxGeometry args={[0.06, 0.04, 0.12]} />
          <meshStandardMaterial
            color="#d8f2ff"
            emissive="#8ad8ff"
            emissiveIntensity={1.9}
          />
        </mesh>
        <mesh position={[-1.2, 0.31, -0.34]}>
          <boxGeometry args={[0.06, 0.04, 0.12]} />
          <meshStandardMaterial
            color="#d8f2ff"
            emissive="#8ad8ff"
            emissiveIntensity={1.9}
          />
        </mesh>
        <mesh ref={brakeLightRef} position={[1.2, 0.27, 0]}>
          <boxGeometry args={[0.12, 0.03, 0.94]} />
          <meshStandardMaterial
            color="#ff7f93"
            emissive="#ff334e"
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>
    </group>
  );
}
