"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, RigidBody, CylinderCollider, CuboidCollider } from "@react-three/rapier";
import { EffectComposer, Bloom, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import Coin from "./Coin";
import { cameraState, type CameraState } from "@/lib/motion";

interface Props {
  progressRef: { current: number };
  reducedMotion: boolean;
}

const scratchCam: CameraState = {
  pos: new THREE.Vector3(),
  look: new THREE.Vector3(),
};

function SceneContents({ progressRef, reducedMotion }: Props) {
  const { camera, scene, gl } = useThree();

  // Procedural environment map — gives the gold coin something to reflect.
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envScene = new RoomEnvironment();
    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    scene.environment = envMap;
    return () => {
      envMap.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const smoothedCamPos = useRef(new THREE.Vector3());
  const smoothedCamLook = useRef(new THREE.Vector3());

  // Initialise camera at scroll=0 position so first frame has no jump.
  useEffect(() => {
    cameraState(0, scratchCam);
    smoothedCamPos.current.copy(scratchCam.pos);
    smoothedCamLook.current.copy(scratchCam.look);
    camera.position.copy(scratchCam.pos);
    camera.lookAt(scratchCam.look);
    (camera as THREE.PerspectiveCamera).fov = 35;
    (camera as THREE.PerspectiveCamera).near = 0.1;
    (camera as THREE.PerspectiveCamera).far = 200;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera]);

  // Camera dolly — scroll-driven, independent of coin physics.
  useFrame((_, delta) => {
    if (reducedMotion) return;
    const dt = Math.min(delta, 0.1);
    const progress = progressRef.current;
    cameraState(progress, scratchCam);
    const camAlpha = 1 - Math.exp(-dt / 0.25);
    smoothedCamPos.current.lerp(scratchCam.pos, camAlpha);
    smoothedCamLook.current.lerp(scratchCam.look, camAlpha);
    camera.position.copy(smoothedCamPos.current);
    camera.lookAt(smoothedCamLook.current);
  });

  const floorTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, "#FFFFFF");
    grad.addColorStop(0.55, "#FAF8F2");
    grad.addColorStop(1, "#F5F3EE");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <>
      {/* Lighting */}
      <directionalLight position={[5, 10, 5]} color={"#FFE6BD"} intensity={3.2} />
      <directionalLight position={[-3, 4, 3]} color={"#FFFFFF"} intensity={1.0} />
      <directionalLight position={[0, 2, -5]} color={"#FFFFFF"} intensity={1.6} />
      <ambientLight intensity={0.55} color={"#FFFFFF"} />
      <hemisphereLight color={"#FFFFFF"} groundColor={"#F5F3EE"} intensity={0.5} />

      {/* Visual floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow={false}>
        <circleGeometry args={[20, 64]} />
        <meshBasicMaterial map={floorTexture} toneMapped={false} />
      </mesh>

      {reducedMotion ? (
        // Reduced motion: coin sits at rest, no physics.
        <group position={[0, 0.09, 0]}>
          <Suspense fallback={null}>
            <Coin visible={true} />
          </Suspense>
        </group>
      ) : (
        // Full physics: coin spawns at Y=15, Rapier handles gravity + tumble + bounce.
        <Physics gravity={[0, -9.81, 0]}>
          {/* Static floor — coin collides here */}
          <RigidBody type="fixed" restitution={0.25} friction={0.8}>
            <CuboidCollider args={[20, 0.05, 20]} position={[0, -0.05, 0]} />
          </RigidBody>

          {/* Coin — real physics from spawn */}
          <RigidBody
            position={[0, 15, 0]}
            angularVelocity={[4, 0.3, 10]}
            restitution={0.25}
            friction={0.7}
            linearDamping={0.05}
            angularDamping={0.5}
            colliders={false}
          >
            {/*
              CylinderCollider args: [halfHeight, radius]
              Coin WORLD_SCALE=1.2 → radius≈0.6, thickness≈0.18 → halfHeight≈0.09
            */}
            <CylinderCollider args={[0.09, 0.6]} />
            <Suspense fallback={null}>
              <Coin visible={true} />
            </Suspense>
          </RigidBody>
        </Physics>
      )}
    </>
  );
}

function PostFX({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) return null;
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
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
      camera={{ position: [0, 12, 10], fov: 35, near: 0.1, far: 200 }}
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
      <PostFX reducedMotion={reducedMotion} />
    </Canvas>
  );
}
