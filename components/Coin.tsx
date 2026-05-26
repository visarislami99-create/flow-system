"use client";

import { forwardRef, useEffect, useMemo, useState, Suspense } from "react";
import { useGLTF, Text3D, Center } from "@react-three/drei";
import * as THREE from "three";

const COIN_URL = "/coin.glb";
const FONT_URL = "/fonts/helvetiker_bold.typeface.json";

useGLTF.preload(COIN_URL);

// How many world-space units wide the coin should be.
// Larger = coin appears bigger at the same camera distance.
const WORLD_SCALE = 1.2;

interface Props {
  visible: boolean;
}

const ENGRAVE_MAT_PROPS = {
  color: "#000000",   // pure black for maximum contrast against gold
  metalness: 0.0,
  roughness: 1.0,    // fully matte so no reflection competes with the text
};

type FaceAxis = "x" | "y" | "z";

const Coin = forwardRef<THREE.Group, Props>(function Coin({ visible }, ref) {
  const gltf = useGLTF(COIN_URL);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#C9A55A"),
      metalness: 0.55,
      roughness: 0.38,
      // No emissive — it was washing out the engraved text
    });
    mat.envMapIntensity = 0.35; // reduce reflection so engraving stays readable
    return mat;
  }, []);

  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const [faceAxis, setFaceAxis] = useState<FaceAxis>("y");
  const [faceHalf, setFaceHalf] = useState(0.04);
  const [textSize, setTextSize] = useState(0.18);

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    // Scale so the coin's largest dimension = WORLD_SCALE units.
    const targetScale = WORLD_SCALE / maxDim;
    scene.scale.setScalar(targetScale);
    scene.position.sub(center.multiplyScalar(targetScale));
    // ⚠️  Do NOT set scene.rotation here — the outer group's rotation is
    //      driven every frame by Canvas3D. Rotating the inner scene would
    //      change which axis the tumble happens around.

    const nx = size.x * targetScale;
    const ny = size.y * targetScale;
    const nz = size.z * targetScale;

    // Coin thickness axis = the smallest normalised dimension.
    // Face normal = that axis. Text must be placed along it.
    const xThin = nx <= ny && nx <= nz;
    const yThin = !xThin && ny <= nz;

    if (xThin) {
      setFaceAxis("x");
      setFaceHalf(nx / 2);
      setTextSize(Math.max(ny, nz) * 0.09);
    } else if (yThin) {
      setFaceAxis("y");
      setFaceHalf(ny / 2);
      setTextSize(Math.max(nx, nz) * 0.09);
    } else {
      setFaceAxis("z");
      setFaceHalf(nz / 2);
      setTextSize(Math.max(nx, ny) * 0.09);
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

  // Engrave depth: 70% of half-thickness so text visibly recesses into the face.
  const engraveDepth = Math.max(0.008, faceHalf * 0.7);
  // Text front face sits flush with the coin surface.
  const offset = faceHalf - engraveDepth + 0.001;

  // Per-axis text position + rotation.
  //
  // Face along Y (coin lying flat — most common for coin GLBs):
  //   front (top):   [-π/2, 0,  0] makes Text3D face +Y (readable from above)
  //   back (bottom): [ π/2, π,  0] makes Text3D face -Y and reads correctly from below
  //
  // Face along Z (coin standing, face toward viewer):
  //   front:  no rotation needed
  //   back:   [0, π, 0] mirrors so tails reads correctly
  //
  // Face along X (coin standing sideways — rare):
  //   front:  [0,  π/2, 0]
  //   back:   [0, -π/2, 0]

  const frontPos: [number, number, number] =
    faceAxis === "x" ? [offset, 0, 0] :
    faceAxis === "y" ? [0, offset, 0] :
    [0, 0, offset];

  const frontRot: [number, number, number] =
    faceAxis === "x" ? [0, Math.PI / 2, 0] :
    faceAxis === "y" ? [-Math.PI / 2, 0, 0] :
    [0, 0, 0];

  const backPos: [number, number, number] =
    faceAxis === "x" ? [-offset, 0, 0] :
    faceAxis === "y" ? [0, -offset, 0] :
    [0, 0, -offset];

  const backRot: [number, number, number] =
    faceAxis === "x" ? [0, -Math.PI / 2, 0] :
    faceAxis === "y" ? [Math.PI / 2, Math.PI, 0] :
    [0, Math.PI, 0];

  return (
    <group ref={ref} visible={visible}>
      <primitive object={scene} />
      <Suspense fallback={null}>
        {/* Heads — text extrudes inward */}
        <Center position={frontPos} rotation={frontRot}>
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
        {/* Tails — flipped so lettering reads correctly from the back */}
        <Center position={backPos} rotation={backRot}>
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
