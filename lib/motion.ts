// All scroll → motion math. Pure functions, no DOM, no state.

import * as THREE from "three";

// Coin world-space bounds
export const COIN_Y_START = 60;
export const COIN_Y_REST = 0;

// Camera positions
export const CAM_START_POS = new THREE.Vector3(0, 4, 12);
export const CAM_START_LOOK = new THREE.Vector3(0, 8, 0);
export const CAM_END_POS = new THREE.Vector3(0, 1, 6);
export const CAM_END_LOOK = new THREE.Vector3(0, 0.5, 0);

// Scroll milestones
const FALL_END = 0.85;
const BOUNCE_1_UP_END = 0.92;
const BOUNCE_1_DOWN_END = 0.95;
const BOUNCE_2_UP_END = 0.97;
// 0.97 -> 1.0 settle

// power2.in
const power2In = (t: number) => t * t;
// power3.out
const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Returns coin Y given scroll [0,1]
export function coinY(scroll: number): number {
  if (scroll <= FALL_END) {
    // 0 -> 0.85: 60 -> 1, power2.in
    const t = clamp01(scroll / FALL_END);
    const eased = power2In(t);
    return 60 - eased * 59; // 60 -> 1
  }
  if (scroll <= 0.88) {
    // 0.85 -> 0.88: 1 -> 0 (contact)
    const t = (scroll - FALL_END) / (0.88 - FALL_END);
    return 1 - t;
  }
  if (scroll <= BOUNCE_1_UP_END) {
    // 0.88 -> 0.92: 0 -> 2.5, power3.out
    const t = (scroll - 0.88) / (BOUNCE_1_UP_END - 0.88);
    return power3Out(t) * 2.5;
  }
  if (scroll <= BOUNCE_1_DOWN_END) {
    // 0.92 -> 0.95: 2.5 -> 0, power2.in
    const t = (scroll - BOUNCE_1_UP_END) / (BOUNCE_1_DOWN_END - BOUNCE_1_UP_END);
    return 2.5 - power2In(t) * 2.5;
  }
  if (scroll <= BOUNCE_2_UP_END) {
    // 0.95 -> 0.97: 0 -> 0.6, then down. Single arc.
    const t = (scroll - BOUNCE_1_DOWN_END) / (BOUNCE_2_UP_END - BOUNCE_1_DOWN_END);
    // peak at t=0.5
    const arc = Math.sin(t * Math.PI) * 0.6;
    return arc;
  }
  // 0.97 -> 1.0: settled
  return 0;
}

// Bloom strength spikes on contact frames
export function bloomStrength(scroll: number): number {
  const base = 0.5;
  const spike = 0.8;
  // Spike #1 at 0.85 (first contact)
  if (scroll >= 0.85 && scroll <= 0.875) {
    const t = (scroll - 0.85) / 0.025;
    // fast in, slow out triangular
    const env = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    return base + (spike - base) * env;
  }
  // Spike #2 at 0.95 (second contact)
  if (scroll >= 0.95 && scroll <= 0.97) {
    const t = (scroll - 0.95) / 0.02;
    const env = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    return base + (spike - base) * env;
  }
  return base;
}

// Form-submit bloom flash. Hooked into the canvas via a ref. Returns 0..1
// where caller multiplies into bloom strength for 200ms.

export interface CameraState {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

// Camera dolly. The spec's literal start position (0,4,12) looking at (0,8,0)
// can never see a coin starting at Y=60 (would need ~150° FOV). So during the
// fall we TRACK the coin: camera Y rides 5 units below the coin, look Y just
// above, Z dollies in. From scroll 0.7 we smoothly interpolate to the fixed
// landing camera at (0,1,6) looking at (0,0.5,0), arriving by 0.85.
const TRACK_END = 0.7;
const tmpTrackPos = new THREE.Vector3();
const tmpTrackLook = new THREE.Vector3();

export function cameraState(scroll: number, out: CameraState): void {
  const cy = coinY(scroll);
  if (scroll < TRACK_END) {
    const t = scroll / TRACK_END;
    out.pos.set(0, cy - 5, 11 - 4 * t);
    out.look.set(0, cy + 0.5, 0);
    return;
  }
  if (scroll < FALL_END) {
    const t = (scroll - TRACK_END) / (FALL_END - TRACK_END);
    const eased = power3Out(t);
    tmpTrackPos.set(0, cy - 5, 7);
    tmpTrackLook.set(0, cy + 0.5, 0);
    out.pos.lerpVectors(tmpTrackPos, CAM_END_POS, eased);
    out.look.lerpVectors(tmpTrackLook, CAM_END_LOOK, eased);
    return;
  }
  out.pos.copy(CAM_END_POS);
  out.look.copy(CAM_END_LOOK);
}

// Coin rotation. Time-driven during fall (so it tumbles even when scroll is paused),
// time-driven settle wobble at rest. The face passes the camera ~3 times during the fall.
export interface CoinRotation {
  x: number;
  z: number;
}

export function coinRotation(
  scroll: number,
  elapsed: number,
  out: CoinRotation,
): void {
  if (scroll < FALL_END) {
    // Steady tumble, rates from brief
    out.z = elapsed * 0.6;
    out.x = elapsed * 0.2;
    return;
  }
  if (scroll < BOUNCE_2_UP_END) {
    // Smoothly damp x toward 0 (face up), let z keep its momentum but slow it
    const t = clamp01((scroll - FALL_END) / (BOUNCE_2_UP_END - FALL_END));
    const damp = 1 - power3Out(t);
    out.z = elapsed * 0.6 * damp + (elapsed * 0.05) * power3Out(t);
    out.x = (elapsed * 0.2) * damp;
    return;
  }
  // 0.97 -> 1.0: settled. Slow rotation, alive but at rest.
  out.z = elapsed * 0.05;
  out.x = 0;
}
