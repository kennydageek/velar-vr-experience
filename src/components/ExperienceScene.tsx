"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type FocusKey = "power" | "battery" | "aero";

const CAMERA_POINTS = [
  { p: new THREE.Vector3(0, 1.15, 4.2), l: new THREE.Vector3(0, 0.35, 0) },
  { p: new THREE.Vector3(-2.2, 1.2, 2.7), l: new THREE.Vector3(0, 0.45, 0) },
  { p: new THREE.Vector3(2.4, 1.4, 2.2), l: new THREE.Vector3(0, 0.4, 0) },
  { p: new THREE.Vector3(0, 2.4, 3.2), l: new THREE.Vector3(0, 0.5, 0) },
];

function GltfCar({ progress, focus, reducedMotion }: { progress: number; focus: FocusKey; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb");
  const brakeRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    const drift = reducedMotion ? 0 : Math.sin(t * 0.6) * 0.02;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, -0.3 + progress * 0.8, 0.06);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, drift, 0.1);

    if (brakeRef.current) {
      const mat = brakeRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = focus === "battery" ? 0.5 : 1;
    }
  });

  const glowColor = focus === "power" ? "#39d3ff" : focus === "battery" ? "#97ffbf" : "#c4a1ff";

  return (
    <group ref={group} scale={0.0115} position={[0, -0.02, 0]}>
      <primitive object={gltf.scene} />
      <mesh ref={brakeRef} position={[-70, 35, 0]}>
        <boxGeometry args={[6, 4, 45]} />
        <meshStandardMaterial emissive="#ff334e" color="#ff7891" emissiveIntensity={1} />
      </mesh>
      <mesh position={[75, 35, 0]}>
        <boxGeometry args={[4, 3, 42]} />
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

      <Float speed={reducedMotion ? 0 : 1} rotationIntensity={0.06} floatIntensity={0.1}>
        <GltfCar progress={progress} focus={focus} reducedMotion={reducedMotion} />
      </Float>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#060910" roughness={0.9} metalness={0.1} />
      </mesh>

      <Environment preset="city" />
    </Canvas>
  );
}

useGLTF.preload("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb");
