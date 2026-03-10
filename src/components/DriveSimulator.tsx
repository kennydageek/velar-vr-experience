"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import Link from "next/link";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";

type Keys = {
  w: boolean;
  s: boolean;
  a: boolean;
  d: boolean;
  space: boolean;
  shift: boolean;
};

function DriveCar({ speedRef, brakeRefValue }: { speedRef: MutableRefObject<number>; brakeRefValue: MutableRefObject<boolean> }) {
  const group = useRef<THREE.Group>(null);
  const wheelRefs = useRef<THREE.Mesh[]>([]);
  const brakeLight = useRef<THREE.Mesh>(null);
  const heading = useRef(0);
  const velocity = useRef(0);
  const steer = useRef(0);
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

  useFrame((state, dt) => {
    if (!group.current) return;

    const maxSpeed = keys.current.shift ? 34 : 24;
    const accel = 18;
    const brake = 30;
    const drag = 7.5;

    if (keys.current.w) velocity.current += accel * dt;
    if (keys.current.s) velocity.current -= brake * dt;
    if (keys.current.space) velocity.current *= 1 - Math.min(0.85, dt * 8.5);

    if (!keys.current.w && !keys.current.s) {
      velocity.current -= Math.sign(velocity.current) * Math.min(Math.abs(velocity.current), drag * dt);
    }

    velocity.current = THREE.MathUtils.clamp(velocity.current, -9, maxSpeed);

    const steerTarget = (keys.current.a ? 1 : 0) + (keys.current.d ? -1 : 0);
    steer.current = THREE.MathUtils.lerp(steer.current, steerTarget, 0.14);
    heading.current += steer.current * (velocity.current / 22) * dt;

    group.current.rotation.y = heading.current;
    group.current.position.x += Math.sin(heading.current) * velocity.current * dt;
    group.current.position.z += Math.cos(heading.current) * velocity.current * dt;

    // keep on shorter driveway lane
    group.current.position.x = THREE.MathUtils.clamp(group.current.position.x, -4.2, 4.2);
    group.current.position.z = THREE.MathUtils.clamp(group.current.position.z, -45, 45);

    const wheelSpin = (velocity.current / 0.52) * dt;
    wheelRefs.current.forEach((w) => {
      if (w) w.rotation.z -= wheelSpin;
    });

    const braking = keys.current.space || keys.current.s;
    brakeRefValue.current = braking;
    if (brakeLight.current) {
      const m = brakeLight.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = braking ? 2.6 : 0.35;
    }

    const chasePos = new THREE.Vector3(
      group.current.position.x - Math.sin(heading.current) * 3.4,
      1.8,
      group.current.position.z - Math.cos(heading.current) * 3.4
    );

    state.camera.position.lerp(chasePos, 0.08);
    state.camera.lookAt(group.current.position.x, 0.45, group.current.position.z + 1.1);

    speedRef.current = Math.max(0, velocity.current * 3.6);
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* previous stylized car model style */}
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

export function DriveSimulator() {
  const speedRef = useRef(0);
  const brakeRefValue = useRef(false);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSpeed(speedRef.current), 90);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative h-screen bg-[#020308] text-white">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.8, -3.6], fov: 56 }}>
        <color attach="background" args={["#050910"]} />
        <fog attach="fog" args={["#050910", 14, 65]} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[4, 7, 3]} intensity={2.1} color="#d5ebff" />
        <pointLight position={[0, 2.5, -8]} color="#58beff" intensity={11} distance={20} />

        <DriveCar speedRef={speedRef} brakeRefValue={brakeRefValue} />

        {/* shorter driveway */}
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
          <p className="text-[10px] tracking-[0.2em] text-white/60">SPEED</p>
          <p className="mt-1 text-3xl font-semibold">{Math.round(speed)} <span className="text-sm text-white/60">km/h</span></p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/35 p-4 text-xs text-white/80">
          <p className="mb-2 text-[10px] tracking-[0.2em] text-white/60">CONTROLS</p>
          <p>W = Accelerate</p>
          <p>S = Brake / Reverse</p>
          <p>A / D = Steering</p>
          <p>Space = Handbrake</p>
          <p>Shift = Boost</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-black/35 p-4 text-xs text-white/80">
          <p className="mb-2 text-[10px] tracking-[0.2em] text-white/60">DRIVE NOTES</p>
          <p>Short test driveway setup.</p>
          <p>Brake lights intensify on braking.</p>
          <p>Wheel rotation responds to speed.</p>
        </div>
      </div>
    </section>
  );
}
