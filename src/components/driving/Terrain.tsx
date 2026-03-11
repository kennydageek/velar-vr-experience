'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { fbm } from '@/lib/noise';

const TERRAIN_SIZE = 600;
const TERRAIN_SEGMENTS = 128;
const HEIGHT_SCALE = 12;


type TerrainProps = {
  worldOffset: React.MutableRefObject<THREE.Vector3>;
};

function createTerrainGeometry(
  width: number,
  depth: number,
  segsW: number,
  segsD: number,
  heightScale: number
) {
  const g = new THREE.PlaneGeometry(width, depth, segsW, segsD);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const scaleX = 0.012;
  const scaleZ = 0.012;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getY(i);
    const h =
      fbm(x * scaleX, z * scaleZ, 5, 2, 0.55) * heightScale +
      fbm(x * 0.003, z * 0.003, 3, 2, 0.5) * heightScale * 0.6;
    pos.setZ(i, h);
  }

  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

export function Terrain({}: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(
    () =>
      createTerrainGeometry(
        TERRAIN_SIZE,
        TERRAIN_SIZE,
        TERRAIN_SEGMENTS,
        TERRAIN_SEGMENTS,
        HEIGHT_SCALE
      ),
    []
  );


  return (
    <group>
      <mesh
        ref={meshRef}
        geometry={geometry}
        position={[0, 0, 0]}
        receiveShadow
        frustumCulled
      >
        <meshStandardMaterial
          color="#191d23"
          roughness={0.86}
          metalness={0.12}
          envMapIntensity={0.45}
        />
      </mesh>
    </group>
  );
}

/** Low-detail distant terrain for LOD level 1 */
export function TerrainLODFar({}: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(
    () =>
      createTerrainGeometry(
        TERRAIN_SIZE * 1.2,
        TERRAIN_SIZE * 1.2,
        32,
        32,
        HEIGHT_SCALE * 0.9
      ),
    []
  );

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, 0, 0]} frustumCulled>
      <meshStandardMaterial
        color="#171b21"
        roughness={0.92}
        metalness={0.06}
        fog={true}
      />
    </mesh>
  );
}
