'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import Link from 'next/link';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import * as THREE from 'three';
import { useFerrariModel } from './FerrariModel';

type Gear = 'P' | 'R' | 'N' | 'D';
type GripMode = 'comfort' | 'sport' | 'track';
type Keys = {
  w: boolean;
  s: boolean;
  a: boolean;
  d: boolean;
  space: boolean;
  shift: boolean;
};

type Telemetry = {
  speedKmh: number;
  rpm: number;
  steer: number;
  slip: number;
  absActive: boolean;
};

type WorldState = {
  heading: number;
  speed: number;
  steer: number;
  offsetX: number;
  offsetZ: number;
  accel: number;
};

function n2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}


function Car({
  gear,
  gripMode,
  engineOn,
  headlightsOn,
  telemetryRef,
  worldRef,
}: {
  gear: Gear;
  gripMode: GripMode;
  engineOn: boolean;
  headlightsOn: boolean;
  telemetryRef: MutableRefObject<Telemetry>;
  worldRef: MutableRefObject<WorldState>;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const chassisRef = useRef<THREE.Group>(null);
  const brakeLight = useRef<THREE.Mesh>(null);
  const headLightL = useRef<THREE.Mesh>(null);
  const headLightR = useRef<THREE.Mesh>(null);
  const signalL = useRef<THREE.Mesh>(null);
  const signalR = useRef<THREE.Mesh>(null);
  const {
    object: fittedCar,
    wheels,
    frontWheels,
  } = useFerrariModel({ targetLength: 2.4 });

  const heading = useRef(0);
  const speed = useRef(0);
  const steer = useRef(0);
  const throttleInput = useRef(0);
  const brakeInput = useRef(0);
  const slipRef = useRef(0);
  const absPhase = useRef(0);
  const prevSpeed = useRef(0);
  const worldOffset = useRef(new THREE.Vector2(0, 0));

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
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, []);

  useFrame((_, dt) => {
    if (!modelRef.current || !chassisRef.current) return;

    const clampedDt = Math.min(dt, 0.05);
    const gripCfg =
      gripMode === 'comfort'
        ? { maxForward: 19, accel: 13, brake: 25, drag: 8.3, gripFloor: 0.56 }
        : gripMode === 'sport'
          ? { maxForward: 26, accel: 18, brake: 31, drag: 6.9, gripFloor: 0.44 }
          : {
              maxForward: 32,
              accel: 22,
              brake: 35,
              drag: 5.9,
              gripFloor: 0.34,
            };

    const boost = keys.current.shift ? 1.18 : 1;
    const maxForward = gripCfg.maxForward * boost;
    const maxReverse = -10;

    const wantsThrottle = engineOn && keys.current.w;
    const wantsBrake = keys.current.s || keys.current.space;

    let throttleTarget = 0;
    if (gear === 'D' && wantsThrottle) throttleTarget = 1;
    if (gear === 'R' && wantsThrottle) throttleTarget = -0.7;

    throttleInput.current = THREE.MathUtils.lerp(
      throttleInput.current,
      throttleTarget,
      0.14,
    );
    brakeInput.current = THREE.MathUtils.lerp(
      brakeInput.current,
      wantsBrake ? 1 : 0,
      0.22,
    );

    speed.current += throttleInput.current * gripCfg.accel * clampedDt;

    if (!engineOn) {
      speed.current *= 1 - Math.min(0.2, clampedDt * 4);
      throttleInput.current = 0;
    }

    const preBrakeSpeed = Math.abs(speed.current);
    const absActive = wantsBrake && preBrakeSpeed > 9;
    if (absActive) {
      absPhase.current += clampedDt * 20;
      const pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(absPhase.current));
      speed.current -=
        Math.sign(speed.current || 1) * gripCfg.brake * pulse * clampedDt;
    } else if (wantsBrake) {
      speed.current -= Math.sign(speed.current || 1) * gripCfg.brake * clampedDt;
    }

    if (!wantsThrottle) {
      speed.current -=
        Math.sign(speed.current) *
        Math.min(Math.abs(speed.current), gripCfg.drag * clampedDt);
    }

    if (gear === 'P') speed.current *= 1 - Math.min(0.95, clampedDt * 10);
    if (gear === 'N') speed.current *= 1 - Math.min(0.7, clampedDt * 4.5);

    speed.current = THREE.MathUtils.clamp(
      speed.current,
      maxReverse,
      maxForward,
    );

    const speedAbs = Math.abs(speed.current);
    const steerTarget = (keys.current.a ? 1 : 0) + (keys.current.d ? -1 : 0);
    const grip = THREE.MathUtils.clamp(1 - speedAbs / 46, gripCfg.gripFloor, 1);
    steer.current = THREE.MathUtils.lerp(
      steer.current,
      steerTarget * grip,
      0.16,
    );

    const slipDemand = THREE.MathUtils.clamp(
      (Math.abs(steer.current) * Math.abs(throttleInput.current) * speedAbs) /
        14,
      0,
      1,
    );
    slipRef.current = THREE.MathUtils.lerp(slipRef.current, slipDemand, 0.08);

    const yawGrip = THREE.MathUtils.lerp(1, 0.58, slipRef.current);
    heading.current += steer.current * (speed.current / 16) * clampedDt * yawGrip;

    const forwardX = Math.sin(heading.current);
    const forwardZ = Math.cos(heading.current);
    worldOffset.current.x += forwardX * speed.current * clampedDt;
    worldOffset.current.y += forwardZ * speed.current * clampedDt;

    modelRef.current.rotation.y = heading.current + Math.PI;

    const pitch = THREE.MathUtils.clamp(
      (throttleInput.current - brakeInput.current) * 0.06,
      -0.08,
      0.06,
    );
    const roll = THREE.MathUtils.clamp(-steer.current * 0.08, -0.09, 0.09);
    const bounce =
      Math.sin(performance.now() * 0.01 + speedAbs) *
      (speedAbs > 2 ? 0.008 : 0);
    chassisRef.current.rotation.z = THREE.MathUtils.lerp(
      chassisRef.current.rotation.z,
      pitch,
      0.1,
    );
    chassisRef.current.rotation.x = THREE.MathUtils.lerp(
      chassisRef.current.rotation.x,
      roll,
      0.1,
    );
    chassisRef.current.position.y = 0.42 + bounce;

    if (speedAbs > 0.08) {
      const spin = (speed.current / 0.35) * clampedDt;
      wheels.forEach((w) => (w.rotation.x -= spin));
    }

    const steerBase = THREE.MathUtils.clamp(steer.current * 0.44, -0.44, 0.44);
    frontWheels.forEach((w) => (w.rotation.y = steerBase));

    if (brakeLight.current) {
      const m = brakeLight.current.material as THREE.MeshStandardMaterial;
      const absBlink = absActive
        ? 2 + (0.5 + 0.5 * Math.sin(absPhase.current * 1.2)) * 1.2
        : 2.7;
      m.emissiveIntensity = wantsBrake ? absBlink : 0.35;
    }

    const blinkOn = Math.sin(performance.now() * 0.012) > 0;
    if (signalL.current) {
      const m = signalL.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = steer.current > 0.15 && blinkOn ? 2.3 : 0.08;
    }
    if (signalR.current) {
      const m = signalR.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = steer.current < -0.15 && blinkOn ? 2.3 : 0.08;
    }

    if (headLightL.current && headLightR.current) {
      const ml = headLightL.current.material as THREE.MeshStandardMaterial;
      const mr = headLightR.current.material as THREE.MeshStandardMaterial;
      ml.emissiveIntensity = headlightsOn ? 2.2 : 0.15;
      mr.emissiveIntensity = headlightsOn ? 2.2 : 0.15;
    }

    const accel = (speed.current - prevSpeed.current) / Math.max(0.0001, clampedDt);
    prevSpeed.current = speed.current;

    telemetryRef.current = {
      speedKmh: Math.max(0, speed.current * 3.6),
      rpm: THREE.MathUtils.clamp(
        850 + speedAbs * 230 + Math.abs(throttleInput.current) * 1250,
        850,
        7600,
      ),
      steer: steerBase,
      slip: slipRef.current,
      absActive,
    };

    worldRef.current = {
      heading: heading.current,
      speed: speed.current,
      steer: steerBase,
      offsetX: worldOffset.current.x,
      offsetZ: worldOffset.current.y,
      accel,
    };
  });

  return (
    <group ref={modelRef} position={[0, 0, 0]}>
      <group ref={chassisRef} position={[0, 0.42, 0]}>
        <primitive object={fittedCar} />

        <mesh ref={headLightL} position={[-1.18, 0.31, 0.34]}>
          <boxGeometry args={[0.06, 0.04, 0.12]} />
          <meshStandardMaterial color="#f4fbff" emissive="#a7e4ff" emissiveIntensity={0.15} />
        </mesh>
        <mesh ref={headLightR} position={[-1.18, 0.31, -0.34]}>
          <boxGeometry args={[0.06, 0.04, 0.12]} />
          <meshStandardMaterial color="#f4fbff" emissive="#a7e4ff" emissiveIntensity={0.15} />
        </mesh>

        <mesh ref={signalL} position={[1.18, 0.29, 0.38]}>
          <boxGeometry args={[0.05, 0.03, 0.09]} />
          <meshStandardMaterial color="#ffcf7a" emissive="#ff9a1f" emissiveIntensity={0.08} />
        </mesh>
        <mesh ref={signalR} position={[1.18, 0.29, -0.38]}>
          <boxGeometry args={[0.05, 0.03, 0.09]} />
          <meshStandardMaterial color="#ffcf7a" emissive="#ff9a1f" emissiveIntensity={0.08} />
        </mesh>

        <mesh ref={brakeLight} position={[1.2, 0.27, 0]}>
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

function Terrain({ worldRef }: { worldRef: MutableRefObject<WorldState> }) {
  const tileSize = 160;
  const tileGeom = useMemo(() => {
    const g = new THREE.PlaneGeometry(tileSize, tileSize, 1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  const tileRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame(() => {
    const { offsetX, offsetZ } = worldRef.current;
    const xWrap = ((offsetX % tileSize) + tileSize) % tileSize;
    const zWrap = ((offsetZ % tileSize) + tileSize) % tileSize;

    let idx = 0;
    for (let ix = -3; ix <= 3; ix++) {
      for (let iz = -3; iz <= 3; iz++) {
        const tile = tileRefs.current[idx++];
        if (!tile) continue;
        tile.position.set(ix * tileSize - xWrap, -1.15, iz * tileSize - zWrap);
      }
    }
  });

  return (
    <group>
      {[-3, -2, -1, 0, 1, 2, 3].flatMap((ix) =>
        [-3, -2, -1, 0, 1, 2, 3].map((iz, innerIdx) => {
          const index = (ix + 3) * 7 + innerIdx;
          return (
            <mesh
              key={`${ix}-${iz}`}
              ref={(el) => (tileRefs.current[index] = el)}
              geometry={tileGeom}
              receiveShadow
            >
              <meshPhysicalMaterial
                color="#717a87"
                roughness={0.78}
                metalness={0.06}
                clearcoat={0.18}
                clearcoatRoughness={0.62}
              />
            </mesh>
          );
        }),
      )}

    </group>
  );
}

function DistantDepth({ worldRef }: { worldRef: MutableRefObject<WorldState> }) {
  const skylineRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Points>(null);
  const mountainsNearFrontRef = useRef<THREE.Group>(null);
  const mountainsFarFrontRef = useRef<THREE.Group>(null);
  const mountainsNearBackRef = useRef<THREE.Group>(null);
  const mountainsSideLeftRef = useRef<THREE.Group>(null);
  const mountainsSideRightRef = useRef<THREE.Group>(null);

  const glowGeo = useMemo(() => {
    const count = 160;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (n2(i * 0.73, 1.3) - 0.5) * 420;
      arr[i * 3 + 1] = 7 + n2(i * 0.37, 2.8) * 22;
      arr[i * 3 + 2] = -180 - n2(i * 0.91, 4.2) * 240;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  useFrame(() => {
    const x = worldRef.current.offsetX;
    const z = worldRef.current.offsetZ;

    if (skylineRef.current) {
      skylineRef.current.position.x = -(x % 320) * 0.12;
      skylineRef.current.position.z = -(z % 320) * 0.12 - 150;
    }

    if (glowRef.current) {
      glowRef.current.position.x = -(x % 320) * 0.1;
      glowRef.current.position.z = -(z % 320) * 0.1 - 170;
    }

    if (mountainsNearFrontRef.current) {
      mountainsNearFrontRef.current.position.x = -(x % 400) * 0.06;
      mountainsNearFrontRef.current.position.z = -(z % 400) * 0.06 - 280;
    }

    if (mountainsFarFrontRef.current) {
      mountainsFarFrontRef.current.position.x = -(x % 500) * 0.04;
      mountainsFarFrontRef.current.position.z = -(z % 500) * 0.04 - 380;
    }

    if (mountainsNearBackRef.current) {
      mountainsNearBackRef.current.position.x = -(x % 420) * 0.06;
      mountainsNearBackRef.current.position.z = -(z % 420) * 0.06 + 280;
    }

    if (mountainsSideLeftRef.current) {
      mountainsSideLeftRef.current.position.x = -(x % 420) * 0.06 - 300;
      mountainsSideLeftRef.current.position.z = -(z % 420) * 0.06;
    }

    if (mountainsSideRightRef.current) {
      mountainsSideRightRef.current.position.x = -(x % 420) * 0.06 + 300;
      mountainsSideRightRef.current.position.z = -(z % 420) * 0.06;
    }
  });

  const mountainPeaks = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      x: -280 + i * 26 + (n2(i * 1.1, 2) - 0.5) * 20,
      height: 18 + n2(i * 0.7, 3) * 22,
      radius: 22 + n2(i * 0.5, 4) * 16,
    }));
  }, []);

  const mountainPeaksFar = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      x: -260 + i * 34 + (n2(i * 1.3, 5) - 0.5) * 25,
      height: 14 + n2(i * 0.9, 6) * 18,
      radius: 28 + n2(i * 0.6, 7) * 20,
    }));
  }, []);

  return (
    <group>
      <group ref={mountainsFarFrontRef} position={[0, -2, -380]}>
        {mountainPeaksFar.map((p, i) => (
          <mesh key={`far-front-${i}`} position={[p.x, p.height * 0.6, 0]}>
            <coneGeometry args={[p.radius * 1.15, p.height * 1.25, 5]} />
            <meshStandardMaterial
              color="#7d8fa3"
              roughness={0.98}
              metalness={0}
            />
          </mesh>
        ))}
      </group>

      <group ref={mountainsNearFrontRef} position={[0, -3, -280]}>
        {mountainPeaks.map((p, i) => (
          <mesh key={`near-front-${i}`} position={[p.x, p.height * 0.6, 0]}>
            <coneGeometry args={[p.radius * 1.2, p.height * 1.3, 6]} />
            <meshStandardMaterial
              color="#5a6578"
              roughness={0.95}
              metalness={0.02}
            />
          </mesh>
        ))}
      </group>

      <group ref={mountainsNearBackRef} position={[0, -3, 280]} rotation-y={Math.PI}>
        {mountainPeaks.map((p, i) => (
          <mesh key={`near-back-${i}`} position={[p.x, p.height * 0.55, 0]}>
            <coneGeometry args={[p.radius * 1.05, p.height * 1.15, 6]} />
            <meshStandardMaterial color="#667387" roughness={0.96} metalness={0.01} />
          </mesh>
        ))}
      </group>

      <group ref={mountainsSideLeftRef} position={[-300, -3, 0]} rotation-y={Math.PI / 2}>
        {mountainPeaks.map((p, i) => (
          <mesh key={`side-left-${i}`} position={[p.x, p.height * 0.5, 0]}>
            <coneGeometry args={[p.radius, p.height * 1.1, 6]} />
            <meshStandardMaterial color="#6c7a8f" roughness={0.97} metalness={0.01} />
          </mesh>
        ))}
      </group>

      <group ref={mountainsSideRightRef} position={[300, -3, 0]} rotation-y={-Math.PI / 2}>
        {mountainPeaks.map((p, i) => (
          <mesh key={`side-right-${i}`} position={[p.x, p.height * 0.5, 0]}>
            <coneGeometry args={[p.radius, p.height * 1.1, 6]} />
            <meshStandardMaterial color="#6c7a8f" roughness={0.97} metalness={0.01} />
          </mesh>
        ))}
      </group>

      <group ref={skylineRef}>
        {Array.from({ length: 26 }).map((_, i) => (
          <mesh key={i} position={[-200 + i * 16, 7 + (i % 5) * 2.2, -50]}>
            <boxGeometry args={[8, 14 + (i % 6) * 4, 8]} />
            <meshStandardMaterial color="#6b7a8a" roughness={0.85} metalness={0.08} />
          </mesh>
        ))}
      </group>

      <points ref={glowRef} geometry={glowGeo}>
        <pointsMaterial color="#fff5e0" size={0.9} transparent opacity={0.12} depthWrite={false} />
      </points>
    </group>
  );
}

function Sky({ worldRef }: { worldRef: MutableRefObject<WorldState> }) {
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const particleGeo = useMemo(() => {
    const count = 220;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (n2(i, 1) - 0.5) * 80;
      arr[i * 3 + 1] = n2(i, 2) * 14 + 0.5;
      arr[i * 3 + 2] = (n2(i, 3) - 0.5) * 90;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  const smoothSpeedRef = useRef(0);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const dir = worldRef.current.heading;
    const safeDt = Math.min(dt, 0.05);
    smoothSpeedRef.current = THREE.MathUtils.lerp(
      smoothSpeedRef.current,
      worldRef.current.speed,
      1 - Math.exp(-safeDt * 4),
    );

    if (sunRef.current) {
      sunRef.current.position.set(
        Math.sin(dir + t * 0.03) * 20,
        16 + Math.sin(t * 0.2) * 2.8,
        Math.cos(dir + t * 0.03) * 20,
      );
      sunRef.current.intensity = 3.2 + Math.sin(t * 0.3) * 0.2;
    }

    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0008;
      particlesRef.current.position.z = THREE.MathUtils.lerp(
        particlesRef.current.position.z,
        -smoothSpeedRef.current * 0.07,
        0.02,
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight intensity={0.6} color="#87ceeb" groundColor="#c4b8a8" />
      <directionalLight
        ref={sunRef}
        position={[10, 18, 8]}
        intensity={3.2}
        color="#fff5e6"
        castShadow
      />
      <pointLight
        position={[0, 3, -5]}
        color="#fff8f0"
        intensity={2}
        distance={40}
      />
      <points ref={particlesRef} geometry={particleGeo}>
        <pointsMaterial
          color="#ffffff"
          size={0.08}
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </points>
    </>
  );
}

export function DriveSimulator() {
  const telemetryRef = useRef<Telemetry>({
    speedKmh: 0,
    rpm: 900,
    steer: 0,
    slip: 0,
    absActive: false,
  });
  const worldRef = useRef<WorldState>({
    heading: 0,
    speed: 0,
    steer: 0,
    offsetX: 0,
    offsetZ: 0,
    accel: 0,
  });

  const [speed, setSpeed] = useState(0);
  const [rpm, setRpm] = useState(900);
  const [slip, setSlip] = useState(0);
  const [absActive, setAbsActive] = useState(false);
  const [gear, setGear] = useState<Gear>('P');
  const [gripMode, setGripMode] = useState<GripMode>('sport');
  const [engineOn, setEngineOn] = useState(false);
  const [engineState, setEngineState] = useState<'off' | 'starting' | 'running' | 'stopping'>('off');
  const [headlightsOn, setHeadlightsOn] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSpeed(telemetryRef.current.speedKmh);
      setRpm(telemetryRef.current.rpm);
      setSlip(telemetryRef.current.slip);
      setAbsActive(telemetryRef.current.absActive);
    }, 90);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!engineOn) return;

    const AC = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    const ctx = new AC();

    const idleOsc = ctx.createOscillator();
    const revOsc = ctx.createOscillator();
    const rumbleOsc = ctx.createOscillator();

    const idleGain = ctx.createGain();
    const revGain = ctx.createGain();
    const rumbleGain = ctx.createGain();
    const masterGain = ctx.createGain();

    idleOsc.type = 'triangle';
    revOsc.type = 'sawtooth';
    rumbleOsc.type = 'sine';

    idleOsc.frequency.value = 32;
    revOsc.frequency.value = 68;
    rumbleOsc.frequency.value = 22;

    idleGain.gain.value = 0.005;
    revGain.gain.value = 0.002;
    rumbleGain.gain.value = 0.003;
    masterGain.gain.value = 0.65;

    idleOsc.connect(idleGain);
    revOsc.connect(revGain);
    rumbleOsc.connect(rumbleGain);
    idleGain.connect(masterGain);
    revGain.connect(masterGain);
    rumbleGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    idleOsc.start();
    revOsc.start();
    rumbleOsc.start();

    const id = window.setInterval(() => {
      const rpmNow = telemetryRef.current.rpm;
      const speedNow = telemetryRef.current.speedKmh;
      const t = Math.min(1, (rpmNow - 850) / 5200);

      idleOsc.frequency.setTargetAtTime(30 + t * 18, ctx.currentTime, 0.07);
      revOsc.frequency.setTargetAtTime(62 + t * 180 + speedNow * 0.08, ctx.currentTime, 0.06);
      rumbleOsc.frequency.setTargetAtTime(18 + t * 16, ctx.currentTime, 0.09);

      revGain.gain.setTargetAtTime(0.0015 + t * 0.006, ctx.currentTime, 0.08);
      idleGain.gain.setTargetAtTime(0.006 - t * 0.002, ctx.currentTime, 0.08);
    }, 90);

    return () => {
      window.clearInterval(id);
      idleOsc.stop();
      revOsc.stop();
      rumbleOsc.stop();
      ctx.close();
    };
  }, [engineOn, telemetryRef]);

  const gears = useMemo(() => ['P', 'R', 'N', 'D'] as Gear[], []);
  const gripModes = useMemo(
    () => ['comfort', 'sport', 'track'] as GripMode[],
    [],
  );

  const startEngine = () => {
    if (engineState === 'starting' || engineState === 'stopping' || engineOn) return;
    setEngineState('starting');
    window.setTimeout(() => {
      setEngineOn(true);
      setEngineState('running');
      if (gear === 'P') setGear('D');
    }, 900);
  };

  const stopEngine = () => {
    if (engineState === 'starting' || engineState === 'stopping' || !engineOn) return;
    setEngineState('stopping');
    window.setTimeout(() => {
      setGear('P');
      setEngineOn(false);
      setEngineState('off');
    }, 700);
  };

  return (
    <section className="relative h-screen bg-[#87a8c4] text-white">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [-2.8, 1.75, -3.4], fov: 52 }}
        shadows
      >
        <color attach="background" args={['#87ceeb']} />

        <Car
          gear={gear}
          gripMode={gripMode}
          engineOn={engineOn}
          headlightsOn={headlightsOn}
          telemetryRef={telemetryRef}
          worldRef={worldRef}
        />
        <Sky worldRef={worldRef} />
        <Terrain worldRef={worldRef} />
        <DistantDepth worldRef={worldRef} />
        <OrbitControls makeDefault enablePan={false} minDistance={2.4} maxDistance={11} minPolarAngle={0.2} maxPolarAngle={1.45} target={[0,0.65,0]} />

        <Environment preset="sunset" />
      </Canvas>

      <div className="absolute left-0 top-0 flex w-full items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="rounded-full border border-white/25 px-4 py-2 text-xs tracking-[0.2em] text-white/80"
        >
          BACK
        </Link>
        <p className="text-xs tracking-[0.2em] text-white/80">
          CINEMATIC DRIVE
        </p>
      </div>

      <div className="absolute bottom-4 left-4 right-4 grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl border border-white/20 bg-black/35 p-3">
          <p className="text-[10px] tracking-[0.2em] text-white/60">
            SPEED / RPM
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {Math.round(speed)}{' '}
            <span className="text-xs text-white/60">km/h</span>
          </p>
          <p className="text-xs text-white/75">{Math.round(rpm)} rpm</p>
          <p className="text-[10px] text-white/70">
            Slip: {Math.round(slip * 100)}%
          </p>
          <p
            className={`text-[10px] ${absActive ? 'text-amber-300' : 'text-white/45'}`}
          >
            ABS: {absActive ? 'ACTIVE' : 'OFF'}
          </p>
          <div className="mt-2 flex gap-1.5">
            {gears.map((g) => (
              <button
                key={g}
                onClick={() => setGear(g)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-medium transition ${gear === g ? 'bg-white text-black' : 'border border-white/30 text-white/85 hover:bg-white/10'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/35 p-3 text-[11px] text-white/85">
          <p className="mb-1 text-[10px] tracking-[0.2em] text-white/60">
            DRIVE CONTROLS
          </p>
          <p>Drag to orbit camera · scroll to zoom</p>
          <p>Engine ON: W/↑ throttle · S/↓ brake · A,D or ←,→ steer</p>
          <p className="mt-1 text-white/60">Car stays static until you start engine</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/35 p-3 text-[11px] text-white/85">
          <p className="mb-1 text-[10px] tracking-[0.2em] text-white/60">VEHICLE</p>
          <p className="mb-2 text-[10px] text-white/70">
            Engine: {engineState.toUpperCase()} · Lights: {headlightsOn ? 'ON' : 'OFF'}
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <button
              onClick={startEngine}
              disabled={engineState === 'starting' || engineState === 'stopping' || engineOn}
              className={`rounded-full px-2.5 py-1 text-[10px] ${engineOn ? 'bg-emerald-300 text-black' : 'border border-white/30 text-white/85'} disabled:opacity-50`}
            >
              {engineState === 'starting' ? 'STARTING…' : engineOn ? 'ENGINE ON' : 'START ENGINE'}
            </button>
            <button
              onClick={stopEngine}
              disabled={!engineOn || engineState === 'starting' || engineState === 'stopping'}
              className="rounded-full border border-white/30 px-2.5 py-1 text-[10px] text-white/85 disabled:opacity-50"
            >
              {engineState === 'stopping' ? 'SHUTTING…' : 'PARK + OFF'}
            </button>
            <button
              onClick={() => setHeadlightsOn((v) => !v)}
              className={`rounded-full px-2.5 py-1 text-[10px] ${headlightsOn ? 'bg-amber-200 text-black' : 'border border-white/30 text-white/85'}`}
            >
              {headlightsOn ? 'HEADLIGHTS ON' : 'HEADLIGHTS OFF'}
            </button>
          </div>

          <p className="mb-1 text-[10px] tracking-[0.2em] text-white/60">HANDLING</p>
          <div className="flex gap-1.5">
            {gripModes.map((g) => (
              <button
                key={g}
                onClick={() => setGripMode(g)}
                className={`rounded-full px-2.5 py-1 text-[10px] capitalize ${gripMode === g ? 'bg-white text-black' : 'border border-white/30 text-white/85'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
