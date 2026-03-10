"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

const FERRARI_GLB_URL = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb";

type UseFerrariModelOptions = {
  targetLength?: number;
};

export type FerrariRig = {
  object: THREE.Group;
  wheels: THREE.Object3D[];
  frontWheels: THREE.Object3D[];
};

export function useFerrariModel({ targetLength = 2.4 }: UseFerrariModelOptions = {}): FerrariRig {
  const gltf = useGLTF(FERRARI_GLB_URL);

  return useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    cloned.position.sub(center);

    const currentLength = Math.max(0.001, size.x);
    const scale = targetLength / currentLength;
    cloned.scale.setScalar(scale);

    const wheelFL = cloned.getObjectByName("wheel_fl");
    const wheelFR = cloned.getObjectByName("wheel_fr");
    const wheelRL = cloned.getObjectByName("wheel_rl");
    const wheelRR = cloned.getObjectByName("wheel_rr");

    let wheels = [wheelFL, wheelFR, wheelRL, wheelRR].filter((w): w is THREE.Object3D => w != null);
    let frontWheels = [wheelFL, wheelFR].filter((w): w is THREE.Object3D => w != null);

    if (wheels.length !== 4) {
      const found: THREE.Object3D[] = [];
      const front: THREE.Object3D[] = [];

      cloned.traverse((obj) => {
        const name = obj.name?.toLowerCase?.() ?? "";
        if (name.includes("wheel")) {
          found.push(obj);
          if (name.includes("fl") || name.includes("fr") || name.includes("front")) {
            front.push(obj);
          }
        }
      });

      wheels = found;
      frontWheels = front;
    }

    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return { object: cloned, wheels, frontWheels };
  }, [gltf.scene, targetLength]);
}

export function FerrariModel({ targetLength = 2.4 }: UseFerrariModelOptions) {
  const { object } = useFerrariModel({ targetLength });
  return <primitive object={object} />;
}

useGLTF.preload(FERRARI_GLB_URL);
