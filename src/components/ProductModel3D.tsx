'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type ProductModel3DProps = {
  category: string;
};

function ProductMesh({ category }: ProductModel3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#dfe8ff',
        roughness: 0.28,
        metalness: 0.35,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
      }),
    [],
  );

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += dt * 0.32;
  });

  const c = category.toLowerCase();

  return (
    <group ref={groupRef}>
      {c.includes('sneaker') && (
        <mesh castShadow receiveShadow material={mat}>
          <capsuleGeometry args={[0.42, 1.2, 8, 16]} />
        </mesh>
      )}

      {c.includes('outerwear') && (
        <mesh castShadow receiveShadow material={mat}>
          <boxGeometry args={[1.35, 1.55, 0.45]} />
        </mesh>
      )}

      {c.includes('audio') && (
        <group>
          <mesh position={[-0.45, 0, 0]} castShadow receiveShadow material={mat}>
            <sphereGeometry args={[0.42, 20, 20]} />
          </mesh>
          <mesh position={[0.45, 0, 0]} castShadow receiveShadow material={mat}>
            <sphereGeometry args={[0.42, 20, 20]} />
          </mesh>
          <mesh position={[0, 0.35, 0]} castShadow receiveShadow material={mat}>
            <torusGeometry args={[0.65, 0.08, 16, 48]} />
          </mesh>
        </group>
      )}

      {c.includes('wearables') && (
        <group>
          <mesh position={[-0.48, 0, 0]} castShadow receiveShadow material={mat}>
            <torusGeometry args={[0.28, 0.05, 16, 48]} />
          </mesh>
          <mesh position={[0.48, 0, 0]} castShadow receiveShadow material={mat}>
            <torusGeometry args={[0.28, 0.05, 16, 48]} />
          </mesh>
          <mesh position={[0, 0, 0]} castShadow receiveShadow material={mat}>
            <boxGeometry args={[0.58, 0.05, 0.05]} />
          </mesh>
        </group>
      )}

      {c.includes('accessories') && (
        <group>
          <mesh castShadow receiveShadow material={mat}>
            <torusGeometry args={[0.6, 0.09, 20, 64]} />
          </mesh>
          <mesh position={[0, 0, 0.02]} castShadow receiveShadow material={mat}>
            <cylinderGeometry args={[0.27, 0.27, 0.04, 36]} />
          </mesh>
        </group>
      )}

      {!['sneaker', 'outerwear', 'audio', 'wearables', 'accessories'].some((k) => c.includes(k)) && (
        <mesh castShadow receiveShadow material={mat}>
          <icosahedronGeometry args={[0.72, 0]} />
        </mesh>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]} receiveShadow>
        <circleGeometry args={[2.3, 64]} />
        <meshStandardMaterial color="#1c2330" roughness={0.9} metalness={0.08} />
      </mesh>
    </group>
  );
}

export function ProductModel3D({ category }: ProductModel3DProps) {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0d1420]">
      <Canvas camera={{ position: [0, 0.8, 3], fov: 38 }} shadows dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2.5, 4, 2]} intensity={2} castShadow />
        <pointLight position={[-1.8, 1.2, -1.5]} intensity={14} color="#6fc9ff" distance={8} />
        <ProductMesh category={category} />
        <OrbitControls enablePan={false} minDistance={2.2} maxDistance={5.5} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
