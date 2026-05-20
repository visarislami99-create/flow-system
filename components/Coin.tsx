"use client";

import { forwardRef, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const COIN_URL = "/coin.glb";

useGLTF.preload(COIN_URL);

interface Props {
  visible: boolean;
}

// The coin group's position/rotation are mutated each frame by Canvas3D.
// This component just provides the geometry + material. ref points to the
// outer group so the parent can transform it.
const Coin = forwardRef<THREE.Group, Props>(function Coin({ visible }, ref) {
  const gltf = useGLTF(COIN_URL);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#D4B57E"),
      metalness: 0.7,
      roughness: 0.28,
      emissive: new THREE.Color("#8A6E3E"),
      emissiveIntensity: 0.22,
    });
    mat.envMapIntensity = 0.6;
    return mat;
  }, []);

  // Clone the scene so multiple consumers don't share mutable state.
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    // Normalise the mesh: centre it on the origin, scale to ~1 unit diameter,
    // then apply the override material.
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetScale = 1 / maxDim;
    scene.scale.setScalar(targetScale);
    scene.position.sub(center.multiplyScalar(targetScale));

    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = material;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
  }, [scene, material]);

  return (
    <group ref={ref} visible={visible}>
      <primitive object={scene} />
    </group>
  );
});

export default Coin;
