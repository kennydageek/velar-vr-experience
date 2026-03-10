'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { FerrariModel } from './FerrariModel';

type FocusKey = 'power' | 'battery' | 'aero';

const CAMERA_POINTS = [
  { p: new THREE.Vector3(0, 1.1, 4.6), l: new THREE.Vector3(0, 0.35, 0) },
  { p: new THREE.Vector3(-2.1, 1.15, 3.8), l: new THREE.Vector3(0, 0.42, 0) },
  { p: new THREE.Vector3(2.1, 1.2, 3.6), l: new THREE.Vector3(0, 0.4, 0) },
  { p: new THREE.Vector3(0, 1.95, 4.0), l: new THREE.Vector3(0, 0.48, 0) },
];

function GltfCar({
  progress,
  reducedMotion,
}: {
  progress: number;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const drift = reducedMotion
      ? 0
      : Math.sin(state.clock.getElapsedTime() * 0.6) * 0.02;
    group.current.rotation.y = THREE.MathUtils.lerp(
      group.current.rotation.y,
      -0.3 + progress * 0.8,
      0.06,
    );
    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      drift,
      0.1,
    );
  });

  return (
    <group ref={group} rotation-y={Math.PI} position={[0, 0.2, 0]}>
      <FerrariModel targetLength={3.8} />
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

export function ExperienceScene({
  progress,
  focus,
  reducedMotion,
}: {
  progress: number;
  focus: FocusKey;
  reducedMotion: boolean;
}) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 1.1, 4.6], fov: 36 }}>
      <color attach="background" args={['#020308']} />
      <fog attach="fog" args={['#020308', 7, 18]} />
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[2.5, 4, 2]}
        intensity={2.3}
        color="#badcff"
      />
      <pointLight
        position={[-2.2, 1.8, -1]}
        intensity={16}
        color="#2ab7ff"
        distance={10}
      />
      <pointLight
        position={[2.2, 1.2, 1.6]}
        intensity={focus === 'battery' ? 20 : 10}
        color="#98ffc2"
        distance={8}
      />

      <CameraRig progress={progress} />

      <Suspense fallback={null}>
        <Float
          speed={reducedMotion ? 0 : 1}
          rotationIntensity={0.06}
          floatIntensity={0.1}
        >
          <GltfCar progress={progress} reducedMotion={reducedMotion} />
        </Float>
      </Suspense>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#060910" roughness={0.9} metalness={0.1} />
      </mesh>

      <Environment preset="city" />
    </Canvas>
  );
}
