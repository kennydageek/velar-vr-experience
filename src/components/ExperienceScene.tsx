"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type FocusKey = "power" | "battery" | "aero";

const CAMERA_POINTS = [
  { p: new THREE.Vector3(0, 1.15, 4.2), l: new THREE.Vector3(0, 0.35, 0) },
  { p: new THREE.Vector3(-2.2, 1.2, 2.7), l: new THREE.Vector3(0, 0.45, 0) },
  { p: new THREE.Vector3(2.4, 1.4, 2.2), l: new THREE.Vector3(0, 0.4, 0) },
  { p: new THREE.Vector3(0, 2.4, 3.2), l: new THREE.Vector3(0, 0.5, 0) },
];

function CarModel({ progress, focus, reducedMotion }: { progress: number; focus: FocusKey; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);

  const body = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0c1118",
        metalness: 0.88,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
    []
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    const drift = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.03;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, -0.5 + progress * 1.1, 0.06);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, drift, 0.1);
  });

  const glowColor = focus === "power" ? "#39d3ff" : focus === "battery" ? "#97ffbf" : "#c4a1ff";

  return (
    <group ref={group}>
      <mesh material={body} position={[0, 0.2, 0]} scale={[2.75, 0.56, 1.12]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh material={body} position={[0, 0.64, 0]} scale={[1.5, 0.38, 0.94]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
      <mesh position={[0, 0.68, 0]} scale={[1.2, 0.22, 0.8]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial color="#89d6ff" transmission={0.9} roughness={0.02} thickness={0.2} opacity={0.82} transparent />
      </mesh>

      {[-1.02, 1.02].map((x) =>
        [-0.56, 0.56].map((z) => (
          <group key={`${x}-${z}`} position={[x, -0.03, z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.23, 0.23, 0.15, 28]} />
              <meshStandardMaterial color="#06090f" metalness={0.95} roughness={0.27} />
            </mesh>
            <mesh>
              <torusGeometry args={[0.24, 0.05, 10, 28]} />
              <meshStandardMaterial color="#12151a" roughness={0.86} />
            </mesh>
          </group>
        ))
      )}

      <mesh position={[0, 0.24, 0.58]}>
        <boxGeometry args={[1.8, 0.03, 0.08]} />
        <meshStandardMaterial emissive={glowColor} color="#9ae9ff" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function CameraRig({ progress }: { progress: number }) {
  useFrame((state) => {
    const cam = state.camera;
    const scaled = progress * (CAMERA_POINTS.length - 1);
    const a = Math.floor(scaled);
    const b = Math.min(CAMERA_POINTS.length - 1, a + 1);
    const t = scaled - a;

    const nextPos = CAMERA_POINTS[a].p.clone().lerp(CAMERA_POINTS[b].p, t);
    const nextLook = CAMERA_POINTS[a].l.clone().lerp(CAMERA_POINTS[b].l, t);

    cam.position.lerp(nextPos, 0.08);
    cam.lookAt(nextLook);
  });

  return null;
}

export function ExperienceScene({ progress, focus, reducedMotion }: { progress: number; focus: FocusKey; reducedMotion: boolean }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 1.15, 4.2], fov: 38 }}>
      <color attach="background" args={["#020308"]} />
      <fog attach="fog" args={["#020308", 7, 18]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[2.5, 4, 2]} intensity={2.3} color="#badcff" />
      <pointLight position={[-2.2, 1.8, -1]} intensity={16} color="#2ab7ff" distance={10} />
      <pointLight position={[2.2, 1.2, 1.6]} intensity={focus === "battery" ? 20 : 10} color="#98ffc2" distance={8} />

      <CameraRig progress={progress} />

      <Float speed={reducedMotion ? 0 : 1} rotationIntensity={0.1} floatIntensity={0.12}>
        <CarModel progress={progress} focus={focus} reducedMotion={reducedMotion} />
      </Float>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#060910" roughness={0.9} metalness={0.1} />
      </mesh>

      <Environment preset="city" />
    </Canvas>
  );
}
