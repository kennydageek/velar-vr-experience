'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

const SKY_COLOR = new THREE.Color('#0a1628');
const HORIZON_COLOR = new THREE.Color('#1e3a5f');
const SUN_COLOR = new THREE.Color('#ffdd99');

type SkyProps = {
  directionRef: React.MutableRefObject<THREE.Vector3>;
  speedRef: React.MutableRefObject<number>;
};

export function Sky({ directionRef, speedRef }: SkyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const baseDir = directionRef.current;
    const speed = speedRef.current;
    if (!meshRef.current?.material || !lightRef.current) return;

    const drift = Math.sin(t * 0.05) * 0.08;
    const dir = new THREE.Vector3(
      baseDir.x + drift,
      baseDir.y,
      baseDir.z + Math.cos(t * 0.04) * 0.06
    ).normalize();

    const mat = meshRef.current.material as THREE.ShaderMaterial;
    const sunElevation = Math.max(0.1, 0.3 + dir.y * 0.5);
    mat.uniforms.uSunDirection.value.copy(dir);
    mat.uniforms.uTime.value = t;
    mat.uniforms.uSpeed.value = speed;

    lightRef.current.position.set(dir.x * 80, dir.y * 80 + 20, dir.z * 80);
    lightRef.current.intensity = 1.2 + sunElevation * 0.8;
    lightRef.current.color.lerpColors(
      new THREE.Color('#ffeedd'),
      new THREE.Color('#fff5e6'),
      sunElevation
    );
  });

  const shader = useRef({
    uniforms: {
      uTime: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(0.3, 0.6, 0.5) },
      uSpeed: { value: 0 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vViewDirection;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vViewDirection = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uSunDirection;
      uniform float uSpeed;
      varying vec3 vWorldPosition;
      varying vec3 vViewDirection;
      void main() {
        vec3 dir = normalize(vViewDirection);
        float horizon = 1.0 - abs(dir.y);
        float up = max(0.0, dir.y);
        vec3 skyColor = mix(vec3(0.04, 0.08, 0.18), vec3(0.12, 0.22, 0.38), up);
        skyColor = mix(skyColor, vec3(0.25, 0.35, 0.5), horizon * 0.5);
        float sunDot = max(0.0, dot(dir, normalize(uSunDirection)));
        float sunGlow = pow(sunDot, 8.0);
        skyColor += vec3(1.0, 0.9, 0.7) * sunGlow * 0.6;
        float speedPulse = sin(uTime + uSpeed * 0.1) * 0.02;
        gl_FragColor = vec4(skyColor + speedPulse, 1.0);
      }
    `,
  }).current;

  return (
    <group>
      <directionalLight
        ref={lightRef}
        position={[30, 50, 20]}
        intensity={1.5}
        color="#fff0e0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0002}
      />
      <mesh ref={meshRef} frustumCulled={false}>
        <sphereGeometry args={[400, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <shaderMaterial
          side={THREE.BackSide}
          depthWrite={false}
          uniforms={shader.uniforms}
          vertexShader={shader.vertexShader}
          fragmentShader={shader.fragmentShader}
        />
      </mesh>
    </group>
  );
}
