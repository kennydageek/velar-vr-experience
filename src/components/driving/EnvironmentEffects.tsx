'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const CLOUD_COUNT = 12;
const PARTICLE_COUNT = 80;
const CITY_LIGHT_COUNT = 60;

type EnvironmentEffectsProps = {
  worldOffset: React.MutableRefObject<THREE.Vector3>;
};

export function EnvironmentEffects({ worldOffset }: EnvironmentEffectsProps) {
  const cloudsRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const cityLightsRef = useRef<THREE.Points>(null);

  const cloudPositions = useMemo(() => {
    const pos: [number, number, number][] = [];
    for (let i = 0; i < CLOUD_COUNT; i++) {
      pos.push([
        (Math.random() - 0.5) * 400,
        25 + Math.random() * 35,
        (Math.random() - 0.5) * 400,
      ]);
    }
    return pos;
  }, []);

  const particlePositions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 200;
      arr[i * 3 + 1] = Math.random() * 15 + 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return arr;
  }, []);

  const cityLightPositions = useMemo(() => {
    const arr = new Float32Array(CITY_LIGHT_COUNT * 3);
    for (let i = 0; i < CITY_LIGHT_COUNT; i++) {
      const angle = (i / CITY_LIGHT_COUNT) * Math.PI * 2 + Math.random();
      const r = 180 + Math.random() * 120;
      arr[i * 3] = Math.cos(angle) * r;
      arr[i * 3 + 1] = 0.5 + Math.random() * 4;
      arr[i * 3 + 2] = Math.sin(angle) * r;
    }
    return arr;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (cloudsRef.current) {
      cloudPositions.forEach((pos, i) => {
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.scale.setScalar(18 + Math.sin(t * 0.2 + i) * 4);
        dummy.rotation.y = t * 0.02 + i * 0.5;
        dummy.updateMatrix();
        cloudsRef.current!.setMatrixAt(i, dummy.matrix);
      });
      cloudsRef.current.instanceMatrix.needsUpdate = true;
    }

    if (particlesRef.current) {
      const posAttr = particlesRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        posAttr.array[ix] = posAttr.array[ix] + Math.sin(t + i * 0.5) * 0.02;
        posAttr.array[ix + 2] =
          posAttr.array[ix + 2] + Math.cos(t * 0.7 + i * 0.3) * 0.02;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh
        ref={cloudsRef}
        args={[undefined, undefined, CLOUD_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial
          color="#f0f4f8"
          roughness={0.98}
          metalness={0}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </instancedMesh>

      <points ref={particlesRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.25}
          color="#aaccff"
          transparent
          opacity={0.4}
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <points ref={cityLightsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(cityLightPositions), 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={2.5}
          color="#ffdd88"
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}
