'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { fbm } from '@/lib/noise';

type ParallaxMountainsProps = {
  worldOffset: React.MutableRefObject<THREE.Vector3>;
};

const LAYERS = 3;
const SEGMENTS = 64;

function createMountainGeometry(
  radius: number,
  segments: number,
  heightScale: number,
) {
  const g = new THREE.CylinderGeometry(
    0,
    radius,
    heightScale,
    segments,
    1,
    true,
  );
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const r = Math.sqrt(x * x + z * z) / Math.max(0.001, radius);
    const variation = 0.7 + 0.3 * fbm(angle * 2 + r * 3, r * 2, 3, 2, 0.5);
    const y = pos.getY(i);
    pos.setY(i, y * variation);
  }
  g.translate(0, -heightScale / 2, 0);
  g.computeVertexNormals();
  return g;
}

export function ParallaxMountains({ worldOffset }: ParallaxMountainsProps) {
  const layers = useMemo(() => {
    return [
      { radius: 220, height: 45, color: '#1a2a1e' },
      { radius: 280, height: 55, color: '#152018' },
      { radius: 350, height: 65, color: '#0f1812' },
    ];
  }, []);

  const meshes = useMemo(() => {
    return layers.map((layer) => {
      const geom = createMountainGeometry(layer.radius, SEGMENTS, layer.height);
      return { geom, color: layer.color };
    });
  }, [layers]);

  return (
    <group position={[0, 0, 0]}>
      {meshes.map(({ geom, color }, i) => (
        <mesh
          key={i}
          geometry={geom}
          position={[0, 0, 0]}
          rotation={[0, (i * Math.PI * 2) / LAYERS, 0]}
          receiveShadow
        >
          <meshStandardMaterial
            color={color}
            roughness={0.95}
            metalness={0.02}
            fog={true}
          />
        </mesh>
      ))}
    </group>
  );
}
