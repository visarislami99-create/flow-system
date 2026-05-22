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

  // faceZ: the Z coordinate of the coin's front face after normalisation.
  // Computed from the bounding box so text always sits flush regardless of source mesh.
  const [faceZ, setFaceZ] = useState(0.035);
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

    // Coin face Z in outer-group space = half the normalised thickness
    const normZ = (size.z * targetScale) / 2;
    // Coin diameter in outer-group space (largest of X/Y after normalisation)
    const normDiam = Math.max(size.x, size.y) * targetScale;

    setFaceZ(normZ);
    // Text fills ~55% of the coin diameter
    setTextSize(normDiam * 0.14);

    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = material;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
  }, [scene, material]);

  // Engrave depth = 40% of coin thickness so text is clearly visible but stays inside
  const engraveDepth = Math.max(0.004, faceZ * 0.4);
  // Text sits with its front face AT the coin surface (flush or 1mm proud)
  const frontZ = faceZ - engraveDepth + 0.001;
  const backZ  = -(faceZ - engraveDepth + 0.001);

  return (
    <group ref={ref} visible={visible}>
      <primitive object={scene} />
      <Suspense fallback={null}>
        {/* Front face — text extrudes inward (toward coin centre) */}
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
        {/* Back face — flipped 180° on Y so lettering reads correctly */}
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
