"use client";

import { forwardRef, useEffect, useMemo, Suspense } from "react";
import { useGLTF, Text3D, Center } from "@react-three/drei";
import * as THREE from "three";

const COIN_URL = "/coin.glb";
const FONT_URL = "/fonts/helvetiker_bold.typeface.json";

useGLTF.preload(COIN_URL);

interface Props {
  visible: boolean;
}

// Dark gold engraved material — darker than the coin face so it reads as a recess
const ENGRAVE_MAT_PROPS = {
  color: "#5C3D11",
  metalness: 0.4,
  roughness: 0.8,
};

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
      <Suspense fallback={null}>
        {/* Front face engraving — z=0.46 sits just inside the coin surface */}
        <Center position={[0, 0, 0.46]}>
          <Text3D
            font={FONT_URL}
            size={0.13}
            height={0.015}
            curveSegments={12}
            bevelEnabled={false}
          >
            AutoFlows
            <meshStandardMaterial {...ENGRAVE_MAT_PROPS} />
          </Text3D>
        </Center>
        {/* Back face engraving — mirrored 180° so it reads correctly from behind */}
        <Center position={[0, 0, -0.46]} rotation={[0, Math.PI, 0]}>
          <Text3D
            font={FONT_URL}
            size={0.13}
            height={0.015}
            curveSegments={12}
            bevelEnabled={false}
          >
            AutoFlows
            <meshStandardMaterial {...ENGRAVE_MAT_PROPS} />
          </Text3D>
        </Center>
      </Suspense>
    </group>
  );
});

export default Coin;
