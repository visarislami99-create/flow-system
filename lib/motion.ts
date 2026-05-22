// All scroll → motion math. Pure functions, no DOM, no state.

import * as THREE from "three";

// Coin world-space bounds
export const COIN_Y_START = 60;
export const COIN_Y_REST = 0;

// Camera positions
export const CAM_START_POS = new THREE.Vector3(0, 55, 25);
export const CAM_START_LOOK = new THREE.Vector3(0, 60, 0);
export const CAM_END_POS = new THREE.Vector3(0, 1, 6);
export const CAM_END_LOOK = new THREE.Vector3(0, 0.5, 0);

// Scroll milestones
const FALL_END = 0.85;
const BOUNCE_1_UP_END = 0.92;
const BOUNCE_1_DOWN_END = 0.95;
const BOUNCE_2_UP_END = 0.97;
// 0.97 -> 1.0 settle

const TWO_PI = Math.PI * 2;

// Easing helpers
const power2In = (t: number) => t * t;
const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// Returns coin Y given scroll [0,1]
export function coinY(scroll: number): number {
  if (scroll <= FALL_END) {
    // 0 -> 0.85: 60 -> 1, power2.in (accelerating fall)
    const t = clamp01(scroll / FALL_END);
    const eased = power2In(t);
    return 60 - eased * 59; // 60 -> 1
  }
  if (scroll <= 0.88) {
    // 0.85 -> 0.88: 1 -> 0 (contact approach)
    const t = (scroll - FALL_END) / (0.88 - FALL_END);
    return 1 - t;
  }
  if (scroll <= BOUNCE_1_UP_END) {
    // 0.88 -> 0.92: 0 -> 2.5, power3.out (first big bounce)
    const t = (scroll - 0.88) / (BOUNCE_1_UP_END - 0.88);
    return power3Out(t) * 2.5;
  }
  if (scroll <= BOUNCE_1_DOWN_END) {
    // 0.92 -> 0.95: 2.5 -> 0, power2.in
    const t = (scroll - BOUNCE_1_UP_END) / (BOUNCE_1_DOWN_END - BOUNCE_1_UP_END);
    return 2.5 - power2In(t) * 2.5;
  }
  if (scroll <= BOUNCE_2_UP_END) {
    // 0.95 -> 0.97: small arc (second bounce)
    const t = (scroll - BOUNCE_1_DOWN_END) / (BOUNCE_2_UP_END - BOUNCE_1_DOWN_END);
    return Math.sin(t * Math.PI) * 0.6;
  }
  // 0.97 -> 1.0: settled flat
  return 0;
}

// Bloom strength spikes on contact frames
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

export interface CameraState {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

// Camera dolly — tracks the coin during fall, transitions to landing framing.
//
// scroll 0 → 0.7 : Camera rides 5 units below the coin, dollying in from Z=25→7.
//                   At scroll=0: pos=(0,55,25) look=(0,60.5,0) — coin at Y=60 is centred.
// scroll 0.7 → 0.85: Smooth lerp (power3Out) from tracking → landing camera.
// scroll 0.85 → 1.0: Locked at (0,1,6) looking at (0,0.5,0).
const TRACK_END = 0.7;
const tmpTrackPos = new THREE.Vector3();
const tmpTrackLook = new THREE.Vector3();

export function cameraState(scroll: number, out: CameraState): void {
  const cy = coinY(scroll);
  if (scroll < TRACK_END) {
    // Z dollies from 25 → 7 as we approach transition
    const t = scroll / TRACK_END;
    out.pos.set(0, cy - 5, 25 - 18 * t); // 25 → 7
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

// Coin rotation — PURE FUNCTION of scroll only. No elapsed time.
// This means the animation is perfectly reversible: scrolling up rewinds it exactly.
//
// Fall (0 → 0.85):
//   Z — 6 full spins mapped with power2In → coin accelerates as it falls.
//   X — tilt arc: 0 → π/3 at scroll≈0.5 → ~0 at landing (coin tumbles forward then rights itself).
//
// Bounce (0.85 → 0.97):
//   Z — continues from landing value, adds a small scroll-driven increment (alive but settling).
//   X — stays near 0 (coin has mostly flattened out on impact).
//
// Settle (0.97 → 1.0):
//   Z — tiny residual scroll-driven rotation (coin lies flat, slow face-up idle spin).
//   X — 0.
export interface CoinRotation {
  x: number;
  z: number;
}

// Pre-computed constants for continuity across phase boundaries
const Z_AT_LANDING = 6 * TWO_PI;              // z at scroll=0.85
const Z_BOUNCE_RANGE = Math.PI * 0.3;         // extra z during bounce phase
const Z_AT_SETTLE = Z_AT_LANDING + Z_BOUNCE_RANGE; // z at scroll=0.97
const Z_SETTLE_RANGE = Math.PI * 0.15;        // extra z during settle

export function coinRotation(scroll: number, out: CoinRotation): void {
  if (scroll <= FALL_END) {
    const tFall = clamp01(scroll / FALL_END);

    // Z: 6 full rotations, power2In so coin spins faster as it falls
    out.z = power2In(tFall) * Z_AT_LANDING;

    // X: tilt arc — starts slight (0.1 rad), peaks at ~π/3 at mid-fall, returns near 0
    // Formula: sin(t*π)*(π/3) creates the arc; + 0.1*(1-t) adds starting tilt
    out.x = Math.sin(tFall * Math.PI) * (Math.PI / 3) + 0.1 * (1 - tFall);
    return;
  }

  if (scroll <= BOUNCE_2_UP_END) {
    // Bounce phase: z advances slowly, x damps to 0
    const tBounce = clamp01((scroll - FALL_END) / (BOUNCE_2_UP_END - FALL_END));
    out.z = Z_AT_LANDING + tBounce * Z_BOUNCE_RANGE;
    // x is ~0 at landing already; use power3Out to smooth any residual
    out.x = 0.1 * (1 - power3Out(tBounce)); // tiny residual damp
    return;
  }

  // Settled: coin lies flat, minimal scroll-driven idle spin
  const tSettle = clamp01((scroll - BOUNCE_2_UP_END) / (1 - BOUNCE_2_UP_END));
  out.z = Z_AT_SETTLE + tSettle * Z_SETTLE_RANGE;
  out.x = 0;
}
