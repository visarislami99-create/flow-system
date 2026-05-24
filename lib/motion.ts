// All scroll → motion math. Pure functions, no DOM, no state.
// Scroll drives everything — coin position, rotation, camera, bloom.
// Scrubbing up reverses the animation exactly.

import * as THREE from "three";

// Coin world-space Y bounds
export const COIN_Y_START = 60;
export const COIN_Y_REST  = 0.1;

// Camera positions
export const CAM_START_POS  = new THREE.Vector3(0, 55, 8);
export const CAM_START_LOOK = new THREE.Vector3(0, 60, 0);
export const CAM_END_POS    = new THREE.Vector3(0, 4, 3);
export const CAM_END_LOOK   = new THREE.Vector3(0, 0.2, 0);

// Scroll milestones
const FALL_END         = 0.85;
const BOUNCE_1_UP_END  = 0.92;
const BOUNCE_1_DOWN_END = 0.95;
const BOUNCE_2_UP_END  = 0.97;

const TWO_PI = Math.PI * 2;

// Easing
const power2In  = (t: number) => t * t;
const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01   = (v: number) => Math.min(1, Math.max(0, v));

// --- Coin Y position ---
export function coinY(scroll: number): number {
  if (scroll <= FALL_END) {
    const t = clamp01(scroll / FALL_END);
    return 60 - power2In(t) * 59; // 60 → 1, accelerating
  }
  if (scroll <= 0.88) {
    const t = (scroll - FALL_END) / (0.88 - FALL_END);
    return 1 - t * (1 - COIN_Y_REST); // 1 → REST
  }
  if (scroll <= BOUNCE_1_UP_END) {
    const t = (scroll - 0.88) / (BOUNCE_1_UP_END - 0.88);
    return COIN_Y_REST + power3Out(t) * 2.5; // first bounce up
  }
  if (scroll <= BOUNCE_1_DOWN_END) {
    const t = (scroll - BOUNCE_1_UP_END) / (BOUNCE_1_DOWN_END - BOUNCE_1_UP_END);
    return COIN_Y_REST + 2.5 - power2In(t) * 2.5; // bounce down
  }
  if (scroll <= BOUNCE_2_UP_END) {
    const t = (scroll - BOUNCE_1_DOWN_END) / (BOUNCE_2_UP_END - BOUNCE_1_DOWN_END);
    return COIN_Y_REST + Math.sin(t * Math.PI) * 0.6; // small second bounce
  }
  return COIN_Y_REST;
}

// --- Bloom strength — spikes on coin contact frames ---
export function bloomStrength(scroll: number): number {
  const base = 0.5;
  const spike = 0.8;
  if (scroll >= 0.85 && scroll <= 0.875) {
    const t = (scroll - 0.85) / 0.025;
    const env = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    return base + (spike - base) * env;
  }
  if (scroll >= 0.95 && scroll <= 0.97) {
    const t = (scroll - 0.95) / 0.02;
    const env = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    return base + (spike - base) * env;
  }
  return base;
}

// --- Camera state ---
export interface CameraState {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

const TRACK_END = 0.7;
const tmpTrackPos  = new THREE.Vector3();
const tmpTrackLook = new THREE.Vector3();

export function cameraState(scroll: number, out: CameraState): void {
  const cy = coinY(scroll);
  if (scroll < TRACK_END) {
    out.pos.set(0, cy - 5, 8);
    out.look.set(0, cy + 0.5, 0);
    return;
  }
  if (scroll < FALL_END) {
    const t     = (scroll - TRACK_END) / (FALL_END - TRACK_END);
    const eased = power3Out(t);
    tmpTrackPos.set(0, cy - 5, 8);
    tmpTrackLook.set(0, cy + 0.5, 0);
    out.pos.lerpVectors(tmpTrackPos, CAM_END_POS, eased);
    out.look.lerpVectors(tmpTrackLook, CAM_END_LOOK, eased);
    return;
  }
  out.pos.copy(CAM_END_POS);
  out.look.copy(CAM_END_LOOK);
}

// --- Coin rotation ---
// Pure function of scroll — perfectly reversible.
//
// Fall (0 → 0.85):
//   Z: 6 full spins, power2In → accelerates as coin falls
//   X: 2 full forward flips (4π) at constant rate → 4π mod 2π = 0, coin lands face-up
//
// Bounce (0.85 → 0.97):
//   Z: slow settling spin
//   X: decaying wobble simulating impact oscillation
//
// Settle (0.97 → 1.0):
//   Both ease to rest orientation

export interface CoinRotation { x: number; z: number; }

const Z_AT_LANDING   = 6 * TWO_PI;
const Z_BOUNCE_RANGE = Math.PI * 0.3;
const Z_AT_SETTLE    = Z_AT_LANDING + Z_BOUNCE_RANGE;
const Z_SETTLE_TARGET = 12 * Math.PI;

export function coinRotation(scroll: number, out: CoinRotation): void {
  if (scroll <= FALL_END) {
    const tFall = clamp01(scroll / FALL_END);
    out.z = power2In(tFall) * Z_AT_LANDING;
    // 2 full forward flips (4π) at constant rate → lands face-up (4π mod 2π = 0)
    out.x = tFall * 4 * Math.PI;
    return;
  }

  // Z continues slowly throughout bounce and settle
  const tBounceTotal = clamp01((scroll - FALL_END) / (BOUNCE_2_UP_END - FALL_END));

  if (scroll <= BOUNCE_1_UP_END) {
    // First bounce rising: coin tilts visibly (up to ~60°) — shows the back face
    const t = (scroll - FALL_END) / (BOUNCE_1_UP_END - FALL_END);
    out.z = Z_AT_LANDING + tBounceTotal * Z_BOUNCE_RANGE;
    out.x = power3Out(t) * (Math.PI / 3);
    return;
  }

  if (scroll <= BOUNCE_1_DOWN_END) {
    // First bounce falling: coin rights itself cleanly to face-up before second contact
    const t = (scroll - BOUNCE_1_UP_END) / (BOUNCE_1_DOWN_END - BOUNCE_1_UP_END);
    out.z = Z_AT_LANDING + tBounceTotal * Z_BOUNCE_RANGE;
    out.x = (1 - power3Out(t)) * (Math.PI / 3); // eases from ~60° back to 0
    return;
  }

  if (scroll <= BOUNCE_2_UP_END) {
    // Small second bounce: coin is face-up, tiny residual wobble
    const t = (scroll - BOUNCE_1_DOWN_END) / (BOUNCE_2_UP_END - BOUNCE_1_DOWN_END);
    out.z = Z_AT_LANDING + tBounceTotal * Z_BOUNCE_RANGE;
    out.x = Math.sin(t * Math.PI) * 0.06;
    return;
  }

  // Settle: coin eases to final rest orientation, face-up
  const tSettle = clamp01((scroll - BOUNCE_2_UP_END) / (1 - BOUNCE_2_UP_END));
  out.z = Z_AT_SETTLE + power3Out(tSettle) * (Z_SETTLE_TARGET - Z_AT_SETTLE);
  out.x = 0;
}
