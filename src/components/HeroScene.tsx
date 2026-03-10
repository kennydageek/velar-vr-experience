"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";
import { FerrariModel } from "./FerrariModel";

type CarShellProps = { reducedMotion: boolean };

function CarShell({ reducedMotion }: CarShellProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.18) * 0.18;
    group.current.position.y = Math.sin(t * 0.8) * 0.04;
  });

  return (
    <group ref={group} rotation-y={Math.PI} position={[0, 0.2, 0]}>
      <FerrariModel targetLength={3.4} />
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
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 1.15, 4.2], fov: 38 }} shadows>
      <color attach="background" args={["#020308"]} />
      <fog attach="fog" args={["#020308", 7, 17]} />

      <ambientLight intensity={0.85} />
      <directionalLight position={[2.5, 4, 2]} intensity={2.6} color="#b5dcff" castShadow />
      <pointLight position={[-2, 1.5, -1]} intensity={22} color="#12a6ff" distance={10} />
      <pointLight position={[2.2, 1.4, 1.8]} intensity={14} color="#ffffff" distance={9} />

      <Float speed={reducedMotion ? 0 : 1.1} rotationIntensity={0.15} floatIntensity={0.12}>
        <CarShell reducedMotion={reducedMotion} />
      </Float>
      <Ground />
      <Environment preset="night" />
    </Canvas>
  );
}
