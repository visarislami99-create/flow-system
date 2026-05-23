// Scroll → camera motion math. Pure functions, no DOM, no state.
// Coin motion is now handled by Rapier physics (Canvas3D.tsx).

import * as THREE from "three";

// Camera positions — start framing coin spawn, end on landing close-up.
export const CAM_START_POS = new THREE.Vector3(0, 12, 10);
export const CAM_START_LOOK = new THREE.Vector3(0, 14, 0);
export const CAM_END_POS = new THREE.Vector3(0, 4, 3);
export const CAM_END_LOOK = new THREE.Vector3(0, 0.2, 0);

// Scroll milestone at which camera locks onto landing framing.
const FALL_END = 0.85;

// Easing
const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);

export interface CameraState {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

// Camera dolly — lerps from above-coin start to landing close-up over first 85% of scroll.
// Coin position is physics-driven; camera sweeps independently.
export function cameraState(scroll: number, out: CameraState): void {
  const t = Math.min(1, scroll / FALL_END);
  const eased = power3Out(t);
  out.pos.lerpVectors(CAM_START_POS, CAM_END_POS, eased);
  out.look.lerpVectors(CAM_START_LOOK, CAM_END_LOOK, eased);
}
