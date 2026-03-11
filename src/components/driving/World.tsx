'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { Terrain } from './Terrain';
import { EnvironmentEffects } from './EnvironmentEffects';
import { ParallaxMountains } from './ParallaxMountains';


type WorldProps = {
  worldOffsetRef: React.MutableRefObject<THREE.Vector3>;
};

export function World({ worldOffsetRef }: WorldProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.x = -worldOffsetRef.current.x;
    groupRef.current.position.z = -worldOffsetRef.current.z;
  });

  return (
    <group ref={groupRef}>
      <Terrain worldOffset={worldOffsetRef} />
      <ParallaxMountains worldOffset={worldOffsetRef} />
      <EnvironmentEffects worldOffset={worldOffsetRef} />
    </group>
  );
}
