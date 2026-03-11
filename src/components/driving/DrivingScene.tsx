'use client';

import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';
import { Car } from './Car';
import { CameraController } from './CameraController';
import type { DrivingTelemetry } from './types';
import { Sky } from './Sky';
import { World } from './World';
import { ReflectiveGround } from './ReflectiveGround';
import type { Gear } from './types';

export type DrivingSceneProps = {
  gear: Gear;
  telemetryRef: React.MutableRefObject<DrivingTelemetry>;
  children?: React.ReactNode;
};

export function DrivingScene({
  gear,
  telemetryRef,
  children,
}: DrivingSceneProps) {
  const worldPositionRef = useRef(new THREE.Vector3(0, 0, 0));
  const drivingStateRef = useRef({
    position: new THREE.Vector3(0, 0, 0),
    heading: 0,
    velocity: 0,
    steer: 0,
    speedKmh: 0,
  });
  const directionRef = useRef(new THREE.Vector3(0.25, 0.65, 0.4).normalize());
  const speedRef = useRef(0);
  const carRef = useRef<THREE.Group | null>(null);

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [-4, 2.2, -4], fov: 52 }}
      shadows
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#0a1628']} />
      <fog attach="fog" args={['#0e1c2e', 40, 180]} />
      <ambientLight intensity={0.4} />
      <Sky directionRef={directionRef} speedRef={speedRef} />

      <Car
        gear={gear}
        telemetryRef={telemetryRef}
        worldPositionRef={worldPositionRef}
        drivingStateRef={drivingStateRef}
        speedRef={speedRef}
      />
      <CameraController carRef={carRef} stateRef={drivingStateRef} />

      <World worldOffsetRef={worldPositionRef} />
      <ReflectiveGround worldOffsetRef={worldPositionRef} />

      <Environment preset="night" />
      {children}
    </Canvas>
  );
}
