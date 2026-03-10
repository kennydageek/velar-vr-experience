"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
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
  const gltf = useGLTF("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb");
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

    const maxSpeed = keys.current.shift ? 58 : 42;
    const accel = 28;
    const brake = 44;
    const drag = 10;

    if (keys.current.w) velocity.current += accel * dt;
    if (keys.current.s) velocity.current -= brake * dt;
    if (keys.current.space) velocity.current *= 1 - Math.min(0.8, dt * 8);

    if (!keys.current.w && !keys.current.s) {
      velocity.current -= Math.sign(velocity.current) * Math.min(Math.abs(velocity.current), drag * dt);
    }

    velocity.current = THREE.MathUtils.clamp(velocity.current, -14, maxSpeed);

    const steerTarget = (keys.current.a ? 1 : 0) + (keys.current.d ? -1 : 0);
    steer.current = THREE.MathUtils.lerp(steer.current, steerTarget, 0.12);
    heading.current += steer.current * (velocity.current / 38) * dt;

    group.current.rotation.y = heading.current;
    group.current.position.x += Math.sin(heading.current) * velocity.current * dt;
    group.current.position.z += Math.cos(heading.current) * velocity.current * dt;

    group.current.position.x = THREE.MathUtils.clamp(group.current.position.x, -9.5, 9.5);

    const wheelSpin = (velocity.current / 3.4) * dt;
    wheelRefs.current.forEach((w) => {
      if (w) w.rotation.z -= wheelSpin;
    });

    const braking = keys.current.space || keys.current.s;
    brakeRefValue.current = braking;
    if (brakeLight.current) {
      const m = brakeLight.current.material as THREE.MeshStandardMaterial;
      m.emissiveIntensity = braking ? 2.4 : 0.5;
    }

    const chasePos = new THREE.Vector3(
      group.current.position.x - Math.sin(heading.current) * 4,
      2.1,
      group.current.position.z - Math.cos(heading.current) * 4
    );

    state.camera.position.lerp(chasePos, 0.08);
    state.camera.lookAt(group.current.position.x, 0.6, group.current.position.z + 1.2);

    speedRef.current = Math.max(0, velocity.current * 3.6);
  });

  return (
    <group ref={group} scale={0.0115} position={[0, 0, 0]}>
      <primitive object={gltf.scene} />

      {[
        [35, 12, 18],
        [35, 12, -18],
        [-35, 12, 18],
        [-35, 12, -18],
      ].map((p, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) wheelRefs.current[i] = el;
          }}
          position={[p[0], p[1], p[2]]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[6.5, 6.5, 6, 24]} />
          <meshStandardMaterial color="#080a0f" roughness={0.8} metalness={0.2} />
        </mesh>
      ))}

      <mesh ref={brakeLight} position={[-70, 35, 0]}>
        <boxGeometry args={[6, 4, 45]} />
        <meshStandardMaterial color="#ff7f93" emissive="#ff334e" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export function DriveSimulator() {
  const speedRef = useRef(0);
  const brakeRefValue = useRef(false);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSpeed(speedRef.current), 100);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative h-screen bg-[#020308] text-white">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 2, -5], fov: 55 }}>
        <color attach="background" args={["#050910"]} />
        <fog attach="fog" args={["#050910", 20, 85]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 7, 3]} intensity={2.1} color="#d5ebff" />
        <pointLight position={[0, 3, -12]} color="#58beff" intensity={15} distance={26} />

        <DriveCar speedRef={speedRef} brakeRefValue={brakeRefValue} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
          <planeGeometry args={[30, 500]} />
          <meshStandardMaterial color="#111722" roughness={0.95} />
        </mesh>

        {Array.from({ length: 90 }).map((_, i) => (
          <mesh key={i} position={[0, -0.39, i * 5 - 220]}>
            <boxGeometry args={[0.3, 0.02, 2.2]} />
            <meshStandardMaterial color="#f4f6f9" />
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
          <p>Brake lights intensify on braking.</p>
          <p>Wheel rotation responds to speed.</p>
          <p>Camera follows steering and velocity.</p>
        </div>
      </div>
    </section>
  );
}

useGLTF.preload("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb");
