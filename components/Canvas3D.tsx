"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import Coin from "./Coin";
import {
  cameraState,
  coinY,
  coinRotation,
  bloomStrength,
  COIN_FLOAT_Y,
  type CameraState,
  type CoinRotation,
} from "@/lib/motion";

interface Props {
  progressRef: { current: number };
  reducedMotion: boolean;
}

// Reusable scratch objects — avoids per-frame allocations.
const scratchCam: CameraState  = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
const scratchRot: CoinRotation = { x: 0, z: 0 };

function SceneContents({ progressRef, reducedMotion }: Props) {
  const coinRef = useRef<THREE.Group>(null);
  const { camera, scene, gl } = useThree();

  // Procedural environment map — gives the gold coin something to reflect.
  useEffect(() => {
    const pmrem   = new THREE.PMREMGenerator(gl);
    const envScene = new RoomEnvironment();
    const envMap  = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envMap;
    return () => { envMap.dispose(); pmrem.dispose(); };
  }, [gl, scene]);

  const smoothedY       = useRef(COIN_FLOAT_Y);
  const smoothedCamPos  = useRef(new THREE.Vector3());
  const smoothedCamLook = useRef(new THREE.Vector3());

  // Seed camera at scroll=0 so the first frame has no jump.
  useEffect(() => {
    cameraState(0, scratchCam);
    smoothedCamPos.current.copy(scratchCam.pos);
    smoothedCamLook.current.copy(scratchCam.look);
    camera.position.copy(scratchCam.pos);
    camera.lookAt(scratchCam.look);
    (camera as THREE.PerspectiveCamera).fov  = 35;
    (camera as THREE.PerspectiveCamera).near = 0.1;
    (camera as THREE.PerspectiveCamera).far  = 200;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera]);

  useFrame((_, delta) => {
    if (!coinRef.current) return;
    const dt       = Math.min(delta, 0.1);
    const progress = progressRef.current;

    // Position — exponential smoothing so fast scroll doesn't teleport the coin.
    const targetY = coinY(progress);
    if (reducedMotion) {
      smoothedY.current = progress < 0.33 ? 40 : progress < 0.66 ? 20 : 0;
    } else {
      const alpha = 1 - Math.exp(-dt / 0.05);
      smoothedY.current += (targetY - smoothedY.current) * alpha;
    }
    coinRef.current.position.x = 0;
    coinRef.current.position.y = smoothedY.current;

    // Rotation — pure function of scroll, fully reversible.
    if (reducedMotion) {
      coinRef.current.rotation.x = 0;
      coinRef.current.rotation.z = 0;
    } else {
      coinRotation(progress, scratchRot);
      coinRef.current.rotation.x = scratchRot.x;
      coinRef.current.rotation.z = scratchRot.z;
    }

    // Camera dolly — tracks coin during fall, locks at landing.
    if (!reducedMotion) {
      cameraState(progress, scratchCam);
      const camAlpha = 1 - Math.exp(-dt / 0.25);
      smoothedCamPos.current.lerp(scratchCam.pos, camAlpha);
      smoothedCamLook.current.lerp(scratchCam.look, camAlpha);
      camera.position.copy(smoothedCamPos.current);
      camera.lookAt(smoothedCamLook.current);
    }
  });

  const floorTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    const ctx  = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0,    "#FFFFFF");
    grad.addColorStop(0.55, "#FAF8F2");
    grad.addColorStop(1,    "#F5F3EE");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <>
      <directionalLight position={[5, 10, 5]}  color={"#FFE6BD"} intensity={3.2} />
      <directionalLight position={[-3, 4, 3]}  color={"#FFFFFF"} intensity={1.0} />
      <directionalLight position={[0, 2, -5]}  color={"#FFFFFF"} intensity={1.6} />
      <ambientLight intensity={0.55} color={"#FFFFFF"} />
      <hemisphereLight color={"#FFFFFF"} groundColor={"#F5F3EE"} intensity={0.5} />

      {/* Floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.05, 0]} receiveShadow={false}>
        <circleGeometry args={[20, 64]} />
        <meshBasicMaterial map={floorTexture} toneMapped={false} />
      </mesh>

      {/* Coin */}
      <Suspense fallback={null}>
        <Coin ref={coinRef} visible={true} />
      </Suspense>
    </>
  );
}

// Bloom ref type — @react-three/postprocessing's generics are broken at runtime.
type BloomLike = { intensity: number } | null;

function PostFX({
  progressRef,
  reducedMotion,
}: {
  progressRef: { current: number };
  reducedMotion: boolean;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bloomRef = useRef<any>(null);

  useFrame(() => {
    const b = bloomRef.current as BloomLike;
    if (!b) return;
    b.intensity = reducedMotion ? 0 : bloomStrength(progressRef.current);
  });

  if (reducedMotion) return null;

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        ref={bloomRef}
        intensity={0.5}
        luminanceThreshold={0.85}
        luminanceSmoothing={0.05}
        radius={0.7}
        mipmapBlur
      />
      <Noise opacity={0.04} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  );
}

export default function Canvas3D({ progressRef, reducedMotion }: Props) {
  return (
    <Canvas
      dpr={[1, Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1)]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        alpha: false,
      }}
      camera={{ position: [0, 4, 3], fov: 35, near: 0.1, far: 200 }}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "#FFFFFF",
      }}
      frameloop="always"
    >
      <color attach="background" args={["#FFFFFF"]} />
      <SceneContents progressRef={progressRef} reducedMotion={reducedMotion} />
      <PostFX progressRef={progressRef} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
