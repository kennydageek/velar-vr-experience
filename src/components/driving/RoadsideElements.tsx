'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const TREE_COUNT = 120;

export function RoadsideElements() {
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const initialized = useRef(false);

  const [positions, scales] = useMemo(() => {
    const pos: [number, number, number][] = [];
    const scl: number[] = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const lane = 12 + Math.random() * 25;
      const z = (Math.random() - 0.5) * 500;
      pos.push([side * lane, 0, z]);
      scl.push(2.5 + Math.random() * 4);
    }
    return [pos, scl];
  }, []);

  useFrame(() => {
    if (initialized.current || !instancedRef.current) return;
    initialized.current = true;
    positions.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.scale.setScalar(scales[i]);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });
    instancedRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, TREE_COUNT]}>
      <coneGeometry args={[0.8, 4, 6]} />
      <meshStandardMaterial color="#1a2e1a" roughness={0.9} metalness={0.05} />
    </instancedMesh>
  );
}
