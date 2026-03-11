'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
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
  telemetryRef,
  worldRef,
}: {
  gear: Gear;
  gripMode: GripMode;
  telemetryRef: MutableRefObject<Telemetry>;
  worldRef: MutableRefObject<WorldState>;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const chassisRef = useRef<THREE.Group>(null);
  const brakeLight = useRef<THREE.Mesh>(null);
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

    const wantsThrottle = keys.current.w;
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
  const tileSize = 140;
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
    for (let ix = -2; ix <= 2; ix++) {
      for (let iz = -2; iz <= 2; iz++) {
        const tile = tileRefs.current[idx++];
        if (!tile) continue;
        tile.position.set(ix * tileSize - xWrap, -1.15, iz * tileSize - zWrap);
      }
    }
  });

  return (
    <group>
      {[-2, -1, 0, 1, 2].flatMap((ix) =>
        [-2, -1, 0, 1, 2].map((iz, innerIdx) => {
          const index = (ix + 2) * 5 + innerIdx;
          return (
            <mesh
              key={`${ix}-${iz}`}
              ref={(el) => (tileRefs.current[index] = el)}
              geometry={tileGeom}
              receiveShadow
            >
              <meshPhysicalMaterial
                color="#16181c"
                roughness={0.88}
                metalness={0.08}
                clearcoat={0.12}
                clearcoatRoughness={0.75}
              />
            </mesh>
          );
        }),
      )}

    </group>
  );
}

function CameraController({
  worldRef,
}: {
  worldRef: MutableRefObject<WorldState>;
}) {
  const { camera } = useThree();
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    cameraRef.current = camera as THREE.PerspectiveCamera;
  }, [camera]);

  const smoothSteer = useRef(0);
  const smoothSpeed = useRef(0);
  const smoothTilt = useRef(0);
  const smoothPos = useRef(new THREE.Vector3(-2.8, 1.75, -3.4));
  const smoothFov = useRef(52);

  useFrame(() => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;

    const { speed, steer } = worldRef.current;
    const speedAbs = Math.abs(speed);

    smoothSteer.current = THREE.MathUtils.lerp(smoothSteer.current, steer, 0.06);
    smoothSpeed.current = THREE.MathUtils.lerp(smoothSpeed.current, speedAbs, 0.08);

    const targetPos = new THREE.Vector3(
      -2.8 - smoothSteer.current * 1.1,
      1.75 + Math.min(smoothSpeed.current * 0.02, 0.7),
      -3.4,
    );
    const lookAt = new THREE.Vector3(0, 0.55 + smoothSpeed.current * 0.005, 4.5);

    smoothPos.current.lerp(targetPos, 0.08);
    cam.position.copy(smoothPos.current);
    cam.lookAt(lookAt);

    const targetTilt = -smoothSteer.current * 0.05;
    smoothTilt.current = THREE.MathUtils.lerp(smoothTilt.current, targetTilt, 0.06);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    cam.quaternion.premultiply(
      new THREE.Quaternion().setFromAxisAngle(forward, smoothTilt.current)
    );

    const targetFov = 52 + Math.min(smoothSpeed.current * 0.9, 12);
    smoothFov.current = THREE.MathUtils.lerp(smoothFov.current, targetFov, 0.08);
    cam.fov = smoothFov.current;
    cam.updateProjectionMatrix();
  });

  return null;
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
      sunRef.current.intensity = 2.3 + Math.sin(t * 0.3) * 0.25;
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
      <ambientLight intensity={0.45} />
      <hemisphereLight intensity={0.42} color="#b9d7ff" groundColor="#1c2330" />
      <directionalLight
        ref={sunRef}
        position={[10, 18, 8]}
        intensity={2.4}
        color="#dfe9ff"
        castShadow
      />
      <pointLight
        position={[0, 2.5, -5]}
        color="#76c8ff"
        intensity={8}
        distance={32}
      />
      <points ref={particlesRef} geometry={particleGeo}>
        <pointsMaterial
          color="#9fd8ff"
          size={0.12}
          transparent
          opacity={0.35}
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
  const [gear, setGear] = useState<Gear>('D');
  const [gripMode, setGripMode] = useState<GripMode>('sport');

  useEffect(() => {
    const t = setInterval(() => {
      setSpeed(telemetryRef.current.speedKmh);
      setRpm(telemetryRef.current.rpm);
      setSlip(telemetryRef.current.slip);
      setAbsActive(telemetryRef.current.absActive);
    }, 90);
    return () => clearInterval(t);
  }, []);

  const gears = useMemo(() => ['P', 'R', 'N', 'D'] as Gear[], []);
  const gripModes = useMemo(
    () => ['comfort', 'sport', 'track'] as GripMode[],
    [],
  );

  return (
    <section className="relative h-screen bg-[#1a1f2c] text-white">
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [-2.8, 1.75, -3.4], fov: 52 }}
        shadows
      >
        <color attach="background" args={['#1a1f2c']} />

        <Car
          gear={gear}
          gripMode={gripMode}
          telemetryRef={telemetryRef}
          worldRef={worldRef}
        />
        <Sky worldRef={worldRef} />
        <Terrain worldRef={worldRef} />
        <CameraController worldRef={worldRef} />

        <Environment preset="city" />
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
          <p>W/↑ throttle · S/↓ brake · A,D or ←,→ steer</p>
          <p>Space handbrake · Shift boost</p>
          <p className="mt-1 text-white/60">
            Terrain streams under the car (infinite-run illusion)
          </p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-black/35 p-3 text-[11px] text-white/85">
          <p className="mb-1 text-[10px] tracking-[0.2em] text-white/60">
            HANDLING
          </p>
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
