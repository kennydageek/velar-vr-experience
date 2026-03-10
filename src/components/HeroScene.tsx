"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type CarShellProps = { reducedMotion: boolean };

function CarShell({ reducedMotion }: CarShellProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.18) * 0.18;
    group.current.position.y = Math.sin(t * 0.8) * 0.04;
  });

  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0d1117",
        metalness: 0.85,
        roughness: 0.24,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      }),
    []
  );

  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#6ec8ff",
        transmission: 0.9,
        roughness: 0.02,
        thickness: 0.2,
        metalness: 0.05,
        transparent: true,
        opacity: 0.8,
      }),
    []
  );

  const rimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#05070b",
        metalness: 0.95,
        roughness: 0.28,
      }),
    []
  );

  return (
    <group ref={group}>
      <mesh material={bodyMat} position={[0, 0.2, 0]} scale={[2.7, 0.55, 1.1]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>

      <mesh material={bodyMat} position={[0, 0.62, 0]} scale={[1.45, 0.4, 0.95]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>

      <mesh material={glassMat} position={[0, 0.68, 0]} scale={[1.16, 0.24, 0.82]}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>

      {[-1.02, 1.02].map((x) =>
        [-0.55, 0.55].map((z) => (
          <group key={`${x}-${z}`} position={[x, -0.02, z]}>
            <mesh material={rimMat} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.23, 0.23, 0.15, 28]} />
            </mesh>
            <mesh>
              <torusGeometry args={[0.24, 0.05, 10, 28]} />
              <meshStandardMaterial color="#111418" roughness={0.86} />
            </mesh>
          </group>
        ))
      )}

      <mesh position={[1.2, 0.27, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.94]} />
        <meshStandardMaterial color="#8df3ff" emissive="#27d4ff" emissiveIntensity={0.75} />
      </mesh>

      <mesh position={[-1.2, 0.27, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.94]} />
        <meshStandardMaterial color="#ff5f6d" emissive="#ff3550" emissiveIntensity={0.65} />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#04060a" roughness={0.9} metalness={0.15} />
    </mesh>
  );
}

export function HeroScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 1.15, 4.2], fov: 38 }}>
      <color attach="background" args={["#020308"]} />
      <fog attach="fog" args={["#020308", 7, 17]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[2.5, 4, 2]} intensity={2.2} color="#b5dcff" />
      <pointLight position={[-2, 1.5, -1]} intensity={20} color="#12a6ff" distance={9} />

      <Float speed={reducedMotion ? 0 : 1.1} rotationIntensity={0.15} floatIntensity={0.12}>
        <CarShell reducedMotion={reducedMotion} />
      </Float>
      <Ground />
      <Environment preset="night" />
    </Canvas>
  );
}
