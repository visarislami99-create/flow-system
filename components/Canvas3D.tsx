"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
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

// Coin physics state — all in world units, integrated per frame.
interface CoinPhysics {
  posY: number;
  velY: number;
  rotX: number;  // radians, integrated from angVelX
  rotZ: number;  // radians, integrated from angVelZ
  angVelX: number; // rad/s — forward tumble
  angVelZ: number; // rad/s — face spin
  bounces: number;
  settled: boolean;
}

const FLOOR_Y = 0.09;      // world-space floor contact Y for coin center
const GRAVITY = 22;        // world units/s² — tuned for cinematic fall speed
const RESTITUTION = 0.38;  // energy kept per bounce (0–1)

function SceneContents({ progressRef, reducedMotion }: Props) {
  const coinRef = useRef<THREE.Group>(null);
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

  // Coin physics — initialised once, mutated every frame.
  const physics = useRef<CoinPhysics>({
    posY: 15,
    velY: 0,
    rotX: 0,
    rotZ: 0,
    angVelX: 3.5,   // forward tumble: ~0.56 rev/s
    angVelZ: 8.0,   // face spin: ~1.27 rev/s (fast but not chaotic)
    bounces: 0,
    settled: false,
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // hard clamp — prevents jumps after tab switch
    const p = physics.current;

    // --- Coin physics ---
    if (!reducedMotion && !p.settled) {
      // Gravity
      p.velY -= GRAVITY * dt;
      p.posY += p.velY * dt;

      // Floor contact
      if (p.posY <= FLOOR_Y) {
        p.posY = FLOOR_Y;
        const speed = Math.abs(p.velY);

        if (speed < 0.4) {
          // Velocity too low to produce a visible bounce — settle.
          p.velY = 0;
          p.settled = true;
        } else {
          // Bounce: reverse and attenuate velocity.
          p.velY = speed * RESTITUTION;
          p.bounces += 1;

          // Angular damping on each impact — coin gradually flattens its spin.
          const impactDamp = Math.max(0.25, 1 - p.bounces * 0.22);
          p.angVelX *= impactDamp * 0.35;
          p.angVelZ *= impactDamp * 0.65;
        }
      }

      // Integrate rotations
      p.rotX += p.angVelX * dt;
      p.rotZ += p.angVelZ * dt;

      // Soft air damping — coin slowly stops spinning between bounces
      const airDamp = Math.pow(0.995, dt * 60);
      p.angVelX *= airDamp;
      p.angVelZ *= airDamp;
    }

    // Apply to coin mesh
    if (coinRef.current) {
      if (reducedMotion) {
        coinRef.current.position.y = FLOOR_Y;
        coinRef.current.rotation.x = 0;
        coinRef.current.rotation.z = 0;
      } else {
        coinRef.current.position.x = 0;
        coinRef.current.position.y = p.posY;
        coinRef.current.rotation.x = p.rotX;
        coinRef.current.rotation.z = p.rotZ;
      }
    }

    // --- Camera dolly (scroll-driven, independent of coin) ---
    if (!reducedMotion) {
      const progress = progressRef.current;
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
      <directionalLight position={[5, 10, 5]} color={"#FFE6BD"} intensity={3.2} />
      <directionalLight position={[-3, 4, 3]} color={"#FFFFFF"} intensity={1.0} />
      <directionalLight position={[0, 2, -5]} color={"#FFFFFF"} intensity={1.6} />
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
