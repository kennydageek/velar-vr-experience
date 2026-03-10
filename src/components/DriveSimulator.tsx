"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";

type Gear = "P" | "R" | "N" | "D";
type Keys = { w: boolean; s: boolean; a: boolean; d: boolean; space: boolean; shift: boolean };

type Telemetry = {
  speedKmh: number;
  braking: boolean;
  rpm: number;
};

function DriveCar({
  speedRef,
  brakeRefValue,
  gear,
  carRef,
  telemetryRef,
}: {
  speedRef: MutableRefObject<number>;
  brakeRefValue: MutableRefObject<boolean>;
  gear: Gear;
  carRef: MutableRefObject<THREE.Group | null>;
  telemetryRef: MutableRefObject<Telemetry>;
}) {
  const modelRef = useRef<THREE.Group>(null);
  const chassisRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const brakeLight = useRef<THREE.Mesh>(null);

  const heading = useRef(0);
  const velocity = useRef(0); // world forward/back speed m/s-ish
  const steer = useRef(0);
  const throttleInput = useRef(0);
  const brakeInput = useRef(0);
  const keys = useRef<Keys>({ w: false, s: false, a: false, d: false, space: false, shift: false });

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const k = e.key.toLowerCase();
      if (k === "w") keys.current.w = down;
      if (k === "s") keys.current.s = down;
      if (k === "a") keys.current.a = down;
      if (k === "d") keys.current.d = down;
      if (k === " ") keys.current.space = down;
      if (k === "shift") keys.current.shift = down;
    };

    const down = (e: KeyboardEvent) => onKey(e, true);
    const up = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    if (!modelRef.current || !chassisRef.current) return;

    const boost = keys.current.shift ? 1.15 : 1;
    const maxForward = 23 * boost;
    const maxReverse = -8;
    const accel = 16;
    const brakePower = 28;
    const baseDrag = 6.8;

    const wantsThrottle = keys.current.w;
    const wantsBrake = keys.current.s || keys.current.space;

    // Gear-aware throttle/brake behavior
    let throttleTarget = 0;
    if (gear === "D" && wantsThrottle) throttleTarget = 1;
    if (gear === "R" && wantsThrottle) throttleTarget = -0.7;
    throttleInput.current = THREE.MathUtils.lerp(throttleInput.current, throttleTarget, 0.12);
    brakeInput.current = THREE.MathUtils.lerp(brakeInput.current, wantsBrake ? 1 : 0, 0.2);

    velocity.current += throttleInput.current * accel * dt;
    if (wantsBrake) velocity.current -= Math.sign(velocity.current || 1) * brakePower * dt;

    if (!wantsThrottle) {
      velocity.current -= Math.sign(velocity.current) * Math.min(Math.abs(velocity.current), baseDrag * dt);
    }

    if (gear === "P") velocity.current *= 1 - Math.min(0.95, dt * 10);
    if (gear === "N") velocity.current *= 1 - Math.min(0.65, dt * 4.2);

    velocity.current = THREE.MathUtils.clamp(velocity.current, maxReverse, maxForward);

    // Grip/slip: less grip at speed => wider turning feel
    const speedAbs = Math.abs(velocity.current);
    const steerTarget = (keys.current.a ? 1 : 0) + (keys.current.d ? -1 : 0);
    const grip = THREE.MathUtils.clamp(1 - speedAbs / 42, 0.38, 1);
    steer.current = THREE.MathUtils.lerp(steer.current, steerTarget * grip, 0.16);

    // Heading update with slight slip factor
    const slipFactor = THREE.MathUtils.clamp(speedAbs / 30, 0.05, 0.4);
    heading.current += steer.current * (velocity.current / 16) * dt * (1 - slipFactor * 0.35);

    // IMPORTANT: car forward orientation fix (no sideways driving)
    // Our model points along +X visually, so offset yaw to align movement with heading.
    const modelForwardOffset = -Math.PI / 2;
    modelRef.current.rotation.y = heading.current + modelForwardOffset;

    modelRef.current.position.x += Math.sin(heading.current) * velocity.current * dt;
    modelRef.current.position.z += Math.cos(heading.current) * velocity.current * dt;

    // short driveway limits
    modelRef.current.position.x = THREE.MathUtils.clamp(modelRef.current.position.x, -4.2, 4.2);
    modelRef.current.position.z = THREE.MathUtils.clamp(modelRef.current.position.z, -45, 45);

    // suspension pitch + bounce
    const accelPitch = THREE.MathUtils.clamp((throttleInput.current - brakeInput.current) * 0.06, -0.08, 0.06);
    const bounce = Math.sin(performance.now() * 0.008 + speedAbs) * (speedAbs > 1 ? 0.005 : 0);
    chassisRef.current.rotation.z = THREE.MathUtils.lerp(chassisRef.current.rotation.z, accelPitch, 0.1);
    chassisRef.current.position.y = THREE.MathUtils.lerp(chassisRef.current.position.y, bounce, 0.1);

    // wheel spin
    const wheelSpin = (velocity.current / 0.52) * dt;
    wheelRefs.current.forEach((w) => {
      if (w) w.rotation.z -= wheelSpin;
    });

    const braking = wantsBrake;
    brakeRefValue.current = braking;
    if (brakeLight.current) {
      const m = brakeLight.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = braking ? 2.6 : 0.35;
    }

    // telemetry
    speedRef.current = Math.max(0, velocity.current * 3.6);
    telemetryRef.current = {
      speedKmh: speedRef.current,
      braking,
      rpm: THREE.MathUtils.clamp(900 + speedAbs * 220 + Math.abs(throttleInput.current) * 1200, 850, 7600),
    };

    carRef.current = modelRef.current;
  });

  return (
    <group ref={modelRef} position={[0, 0, 0]}>
      <group ref={chassisRef}>
        <mesh position={[0, 0.28, 0]} scale={[2.7, 0.55, 1.1]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhysicalMaterial color="#0d1117" metalness={0.86} roughness={0.24} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>

        <mesh position={[0, 0.7, 0]} scale={[1.4, 0.35, 0.9]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhysicalMaterial color="#11161e" metalness={0.72} roughness={0.28} />
        </mesh>

        <mesh position={[0, 0.73, 0]} scale={[1.12, 0.2, 0.75]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshPhysicalMaterial color="#89d6ff" transmission={0.86} roughness={0.03} thickness={0.2} transparent opacity={0.78} />
        </mesh>
      </group>

      {[
        [1.02, -0.58],
        [1.02, 0.58],
        [-1.02, -0.58],
        [-1.02, 0.58],
      ].map((p, i) => (
        <group key={i} position={[p[0], -0.02, p[1]]}>
          <mesh
            ref={(el) => {
              if (el) wheelRefs.current[i] = el;
            }}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.23, 0.23, 0.15, 28]} />
            <meshStandardMaterial color="#05070b" metalness={0.95} roughness={0.28} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.24, 0.05, 10, 28]} />
            <meshStandardMaterial color="#12151a" roughness={0.86} />
          </mesh>
        </group>
      ))}

      <mesh position={[-1.2, 0.27, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.94]} />
        <meshStandardMaterial color="#8df3ff" emissive="#27d4ff" emissiveIntensity={0.8} />
      </mesh>

      <mesh ref={brakeLight} position={[1.2, 0.27, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.94]} />
        <meshStandardMaterial color="#ff7f93" emissive="#ff334e" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function DriveCamera({ carRef }: { carRef: MutableRefObject<THREE.Group | null> }) {
  const controlsRef = useRef<any>(null);

  useFrame((state) => {
    if (!carRef.current || !controlsRef.current) return;
    const target = carRef.current.position;
    controlsRef.current.target.lerp(new THREE.Vector3(target.x, target.y + 0.45, target.z), 0.12);
    controlsRef.current.update();

    // soft auto-follow only when very far
    const dist = state.camera.position.distanceTo(controlsRef.current.target);
    if (dist > 9) {
      const desired = new THREE.Vector3(target.x - 3.2, 1.9, target.z - 3.2);
      state.camera.position.lerp(desired, 0.03);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan={false}
      minDistance={2.2}
      maxDistance={10}
      minPolarAngle={0.35}
      maxPolarAngle={1.45}
      zoomSpeed={0.9}
      rotateSpeed={0.8}
    />
  );
}

export function DriveSimulator() {
  const speedRef = useRef(0);
  const brakeRefValue = useRef(false);
  const telemetryRef = useRef<Telemetry>({ speedKmh: 0, braking: false, rpm: 900 });
  const carRef = useRef<THREE.Group | null>(null);

  const [speed, setSpeed] = useState(0);
  const [rpm, setRpm] = useState(900);
  const [gear, setGear] = useState<Gear>("D");

  useEffect(() => {
    const t = setInterval(() => {
      setSpeed(speedRef.current);
      setRpm(telemetryRef.current.rpm);
    }, 90);
    return () => clearInterval(t);
  }, []);

  const gearButtons = useMemo(() => ["P", "R", "N", "D"] as Gear[], []);

  return (
    <section className="relative h-screen bg-[#020308] text-white">
      <Canvas dpr={[1, 1.5]} camera={{ position: [-3.2, 1.9, -3.2], fov: 56 }}>
        <color attach="background" args={["#050910"]} />
        <fog attach="fog" args={["#050910", 14, 65]} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[4, 7, 3]} intensity={2.1} color="#d5ebff" />
        <pointLight position={[0, 2.5, -8]} color="#58beff" intensity={11} distance={20} />

        <DriveCar speedRef={speedRef} brakeRefValue={brakeRefValue} gear={gear} carRef={carRef} telemetryRef={telemetryRef} />
        <DriveCamera carRef={carRef} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
          <planeGeometry args={[10, 110]} />
          <meshStandardMaterial color="#131a27" roughness={0.95} />
        </mesh>

        {Array.from({ length: 18 }).map((_, i) => (
          <mesh key={i} position={[0, -0.34, i * 6 - 52]}>
            <boxGeometry args={[0.25, 0.02, 2.1]} />
            <meshStandardMaterial color="#f3f6fb" />
          </mesh>
        ))}

        <Environment preset="sunset" />
      </Canvas>

      <div className="absolute left-0 top-0 flex w-full items-center justify-between px-6 py-6">
        <Link href="/" className="rounded-full border border-white/20 px-4 py-2 text-xs tracking-[0.2em] text-white/80">
          BACK
        </Link>
        <p className="text-xs tracking-[0.2em] text-white/70">LIVE DRIVE SIM</p>
      </div>

      <div className="absolute bottom-6 left-6 right-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/15 bg-black/35 p-4">
          <p className="text-[10px] tracking-[0.2em] text-white/60">SPEED / RPM</p>
          <p className="mt-1 text-3xl font-semibold">
            {Math.round(speed)} <span className="text-sm text-white/60">km/h</span>
          </p>
          <p className="mt-1 text-sm text-white/70">{Math.round(rpm)} rpm</p>
          <div className="mt-3 flex gap-2">
            {gearButtons.map((g) => (
              <button
                key={g}
                onClick={() => setGear(g)}
                className={`rounded-full px-3 py-1 text-xs ${gear === g ? "bg-white text-black" : "border border-white/30 text-white/85"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/35 p-4 text-xs text-white/80">
          <p className="mb-2 text-[10px] tracking-[0.2em] text-white/60">DRIVE CONTROLS</p>
          <p>W = Throttle (in D/R)</p>
          <p>S = Brake</p>
          <p>A / D = Steering</p>
          <p>Space = Handbrake</p>
          <p>Shift = Extra power</p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-black/35 p-4 text-xs text-white/80">
          <p className="mb-2 text-[10px] tracking-[0.2em] text-white/60">CAMERA CONTROLS</p>
          <p>Mouse drag = orbit angle</p>
          <p>Mouse wheel / trackpad = zoom in/out</p>
          <p>Auto-target tracks the car while driving</p>
          <p>Grip/slip + suspension + brake lights enabled</p>
        </div>
      </div>
    </section>
  );
}
