'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { fbm } from '@/lib/noise';

const TERRAIN_SIZE = 600;
const TERRAIN_SEGMENTS = 128;
const HEIGHT_SCALE = 12;
const ROAD_WIDTH = 14;

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

export function Terrain({ worldOffset }: TerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const roadRef = useRef<THREE.Mesh>(null);
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

  const roadGeometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(TERRAIN_SIZE + 100, ROAD_WIDTH, 1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

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
          color="#2a3d2e"
          roughness={0.92}
          metalness={0.04}
          envMapIntensity={0.3}
        />
      </mesh>
      <mesh
        ref={roadRef}
        geometry={roadGeometry}
        position={[0, 0.02, 0]}
        rotation={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#1a1d1f"
          roughness={0.85}
          metalness={0.08}
        />
      </mesh>
    </group>
  );
}

/** Low-detail distant terrain for LOD level 1 */
export function TerrainLODFar({ worldOffset }: TerrainProps) {
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
        color="#223328"
        roughness={0.95}
        metalness={0.02}
        fog={true}
      />
    </mesh>
  );
}
