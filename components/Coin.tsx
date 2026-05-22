"use client";

import { forwardRef, useEffect, useMemo, useState, Suspense } from "react";
import { useGLTF, Text3D, Center } from "@react-three/drei";
import * as THREE from "three";

const COIN_URL = "/coin.glb";
const FONT_URL = "/fonts/helvetiker_bold.typeface.json";

useGLTF.preload(COIN_URL);

interface Props {
  visible: boolean;
}

const ENGRAVE_MAT_PROPS = {
  color: "#4A2E08",
  metalness: 0.3,
  roughness: 0.9,
};

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

  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  // faceHalf: half the coin thickness in world space after normalisation.
  // Always ends up on the Z axis after the re-orientation below.
  const [faceHalf, setFaceHalf] = useState(0.035);
  const [textSize, setTextSize] = useState(0.09);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const targetScale = 1 / maxDim;
    scene.scale.setScalar(targetScale);
    scene.position.sub(center.multiplyScalar(targetScale));

    const nx = size.x * targetScale;
    const ny = size.y * targetScale;
    const nz = size.z * targetScale;

    // The coin face normal is the axis with the smallest normalised extent (= coin thickness).
    // We re-orient the scene so that axis always aligns with world Z, so Text3D
    // positioning is always consistent regardless of how the GLB was authored.
    const xThin = nx <= ny && nx <= nz;
    const yThin = !xThin && ny <= nz;

    if (xThin) {
      // Coin faces along X → rotate so X→Z (rotate -90° around Y)
      scene.rotation.set(0, -Math.PI / 2, 0);
      setFaceHalf(nx / 2);
      setTextSize(Math.max(ny, nz) * 0.14);
    } else if (yThin) {
      // Coin faces along Y (most common: coin lying flat) → rotate so Y→Z (rotate 90° around X)
      scene.rotation.set(Math.PI / 2, 0, 0);
      setFaceHalf(ny / 2);
      setTextSize(Math.max(nx, nz) * 0.14);
    } else {
      // Coin faces already along Z — no rotation needed
      scene.rotation.set(0, 0, 0);
      setFaceHalf(nz / 2);
      setTextSize(Math.max(nx, ny) * 0.14);
    }

    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = material;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
  }, [scene, material]);

  // Engrave depth = 40% of half-thickness, minimum 4mm equivalent
  const engraveDepth = Math.max(0.004, faceHalf * 0.4);
  // Text front face sits flush with (or 1mm proud of) the coin surface
  const frontZ = faceHalf - engraveDepth + 0.001;
  const backZ  = -(faceHalf - engraveDepth + 0.001);

  return (
    <group ref={ref} visible={visible}>
      <primitive object={scene} />
      <Suspense fallback={null}>
        {/* Front face (heads) — text extrudes inward toward coin centre */}
        <Center position={[0, 0, frontZ]}>
          <Text3D
            font={FONT_URL}
            size={textSize}
            height={engraveDepth}
            curveSegments={12}
            bevelEnabled={false}
          >
            AutoFlows
            <meshStandardMaterial {...ENGRAVE_MAT_PROPS} />
          </Text3D>
        </Center>
        {/* Back face (tails) — flipped 180° on Y so lettering reads correctly */}
        <Center position={[0, 0, backZ]} rotation={[0, Math.PI, 0]}>
          <Text3D
            font={FONT_URL}
            size={textSize}
            height={engraveDepth}
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
