'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

const BASE_FOV = 52;
const FOV_RANGE = 18;
const SPRING = 0.08;
const TILT_FACTOR = 0.12;
const TILT_DAMP = 0.92;

export type DrivingState = {
  position: THREE.Vector3;
  heading: number;
  velocity: number;
  steer: number;
  speedKmh: number;
};

type CameraControllerProps = {
  carRef: React.RefObject<THREE.Group | null>;
  stateRef: React.MutableRefObject<DrivingState>;
};

export function CameraController({ carRef, stateRef }: CameraControllerProps) {
  const camTarget = useRef(new THREE.Vector3(0, 0.5, 0));
  const camPosition = useRef(new THREE.Vector3(-4, 2.2, -4));
  const tilt = useRef(0);
  const fovRef = useRef(BASE_FOV);

  useFrame((state, delta) => {
    const camera = state.camera;
    const state_ = stateRef.current;
    const speedNorm = Math.min(1, state_.speedKmh / 120);
    const desiredFov = BASE_FOV + speedNorm * FOV_RANGE;
    fovRef.current += (desiredFov - fovRef.current) * 0.08;
    if ('fov' in camera && typeof (camera as THREE.PerspectiveCamera).fov === 'number') {
      (camera as THREE.PerspectiveCamera).fov = fovRef.current;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }

    tilt.current = tilt.current * TILT_DAMP + -state_.steer * TILT_FACTOR * (1 + speedNorm * 0.5);

    const behind = 4.5 + speedNorm * 1.5;
    const height = 2.0 + speedNorm * 0.4;
    const h = state_.heading;
    const desiredPos = new THREE.Vector3(
      Math.sin(h) * behind,
      height,
      Math.cos(h) * behind
    );
    camPosition.current.lerp(desiredPos, SPRING);
    camTarget.current.lerp(new THREE.Vector3(0, 0.35, 0), SPRING);

    camera.position.copy(camPosition.current);
    const lookAtTarget = camTarget.current.clone();
    const tiltAxis = new THREE.Vector3(Math.sin(h), 0, Math.cos(h));
    lookAtTarget.applyAxisAngle(tiltAxis, tilt.current);
    camera.lookAt(lookAtTarget);
  });

  return null;
}
