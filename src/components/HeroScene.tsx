"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type CarShellProps = { reducedMotion: boolean };

function CarShell({ reducedMotion }: CarShellProps) {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF("https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb");

  const fittedCar = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    cloned.position.sub(center);

    const targetLength = 2.7;
    const currentLength = Math.max(0.001, size.x);
    const s = targetLength / currentLength;
    cloned.scale.setScalar(s);

    cloned.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });

    return cloned;
  }, [gltf.scene]);

  useFrame((state) => {
    if (!group.current || reducedMotion) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.18) * 0.18;
    group.current.position.y = Math.sin(t * 0.8) * 0.04;
  });

  return (
    <group ref={group} rotation-y={Math.PI} position={[0, 0.18, 0]}>
      <primitive object={fittedCar} />

      <mesh position={[1.2, 0.27, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.94]} />
        <meshStandardMaterial color="#8df3ff" emissive="#27d4ff" emissiveIntensity={0.75} />
      </mesh>

      <mesh position={[-1.2, 0.27, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.94]} />
        <meshStandardMaterial color="#ff5f6d" emissive="#ff3550" emissiveIntensity={0.65} />
      </mesh>
    </group>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#04060a" roughness={0.9} metalness={0.15} />
    </mesh>
  );
}

export function HeroScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <Canvas dpr={[1, 1.6]} camera={{ position: [0, 1.15, 4.2], fov: 38 }} shadows>
      <color attach="background" args={["#020308"]} />
      <fog attach="fog" args={["#020308", 7, 17]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[2.5, 4, 2]} intensity={2.2} color="#b5dcff" castShadow />
      <pointLight position={[-2, 1.5, -1]} intensity={20} color="#12a6ff" distance={9} />

      <Float speed={reducedMotion ? 0 : 1.1} rotationIntensity={0.15} floatIntensity={0.12}>
        <CarShell reducedMotion={reducedMotion} />
      </Float>
      <Ground />
      <Environment preset="night" />
    </Canvas>
  );
}
