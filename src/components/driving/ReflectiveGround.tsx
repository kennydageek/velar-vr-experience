'use client';

import { useRef } from 'react';
import * as THREE from 'three';

type ReflectiveGroundProps = {
  worldOffsetRef: React.MutableRefObject<THREE.Vector3>;
};

export function ReflectiveGround({}: ReflectiveGroundProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial
          color="#1a1f22"
          roughness={0.35}
          metalness={0.75}
          envMapIntensity={0.9}
        />
      </mesh>
    </group>
  );
}
