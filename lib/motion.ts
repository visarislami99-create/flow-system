// All scroll → motion math. Pure functions, no DOM, no state.
// Scroll drives everything — coin position, rotation, camera, bloom.
// Scrubbing up reverses the animation exactly.
//
// Behaviour (new):
//   0 → 0.85  Coin floats at COIN_FLOAT_Y, spinning on Z only.
//             Camera is fixed at CAM_END_POS the entire time.
//   0.85 → 1  Landing tween (driven by Site.tsx GSAP, not raw scroll):
//             coin drops from COIN_FLOAT_Y → 0.1, bounces, settles.

import * as THREE from "three";

// Coin world-space Y bounds
export const COIN_Y_START  = 60;   // kept for reference
export const COIN_Y_REST   = 0.1;
// COIN_FLOAT_Y must equal CAM_END_LOOK.y so the coin projects to screen-center
// while hovering. Camera is further back (Z=5) for field-of-view that covers
// the full bounce arc without clipping.
export const COIN_FLOAT_Y  = 1.0;

// Camera — fixed, level shot throughout (no tracking, no tilt).
// Camera Y == Look-at Y == COIN_FLOAT_Y  →  coin always projects to exact
// screen centre, perfectly aligned with the side copy cards (top: 50%).
export const CAM_START_POS  = new THREE.Vector3(0, COIN_FLOAT_Y, 5);
export const CAM_START_LOOK = new THREE.Vector3(0, COIN_FLOAT_Y, 0);
export const CAM_END_POS    = new THREE.Vector3(0, COIN_FLOAT_Y, 5);
export const CAM_END_LOOK   = new THREE.Vector3(0, COIN_FLOAT_Y, 0);

// Scroll milestones (landing phase: 0.85 → 1.0)
export const FALL_END          = 0.85;
const BOUNCE_1_UP_END   = 0.92;
const BOUNCE_1_DOWN_END = 0.95;
const BOUNCE_2_UP_END   = 0.97;

const TWO_PI = Math.PI * 2;

// Easing
const power2In  = (t: number) => t * t;
const power3Out = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01   = (v: number) => Math.min(1, Math.max(0, v));

// --- Coin Y position ---
// 0 → 0.85 : coin locked at COIN_FLOAT_Y
// 0.85 → 1  : drop → bounce → settle (driven by landing tween)
export function coinY(scroll: number): number {
  if (scroll < FALL_END) {
    return COIN_FLOAT_Y;
  }
  // Drop: COIN_FLOAT_Y → COIN_Y_REST with power2In acceleration
  if (scroll <= 0.88) {
    const t = (scroll - FALL_END) / (0.88 - FALL_END);
    return COIN_FLOAT_Y - power2In(t) * (COIN_FLOAT_Y - COIN_Y_REST);
  }
  if (scroll <= BOUNCE_1_UP_END) {
    const t = (scroll - 0.88) / (BOUNCE_1_UP_END - 0.88);
    return COIN_Y_REST + power3Out(t) * 1.5; // first bounce up  (peaks at Y=1.6, above float)
  }
  if (scroll <= BOUNCE_1_DOWN_END) {
    const t = (scroll - BOUNCE_1_UP_END) / (BOUNCE_1_DOWN_END - BOUNCE_1_UP_END);
    return COIN_Y_REST + 1.5 - power2In(t) * 1.5; // bounce down
  }
  if (scroll <= BOUNCE_2_UP_END) {
    const t = (scroll - BOUNCE_1_DOWN_END) / (BOUNCE_2_UP_END - BOUNCE_1_DOWN_END);
    return COIN_Y_REST + Math.sin(t * Math.PI) * 0.4; // small second bounce
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
// Fixed at CAM_END_POS throughout — no tracking movement.
export interface CameraState {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function cameraState(_scroll: number, out: CameraState): void {
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

export interface CoinRotation { x: number; y: number; z: number; }

const Z_AT_LANDING   = 6 * TWO_PI;
const Z_BOUNCE_RANGE = Math.PI * 0.3;
const Z_AT_SETTLE    = Z_AT_LANDING + Z_BOUNCE_RANGE;
const Z_SETTLE_TARGET = 12 * Math.PI;

export function coinRotation(scroll: number, out: CoinRotation): void {
  if (scroll < FALL_END) {
    // Float phase:
    //   Z — 6 spins, power2In acceleration (same as before)
    //   X — bounded ±36° oscillation (7 half-cycles → 0 at tFall=1, never goes edge-on)
    //   Y — gentle ±22° wobble for variety (11 half-cycles → 0 at tFall=1)
    // Both X and Y return to 0 at tFall=1 (odd multiplier × π) so the
    // coin enters the landing phase face-up with no discontinuity.
    const tFall = clamp01(scroll / FALL_END);
    out.z = power2In(tFall) * Z_AT_LANDING;
    out.x = Math.sin(tFall * 7 * Math.PI) * (Math.PI / 5);  // ±36°
    out.y = Math.sin(tFall * 11 * Math.PI) * (Math.PI / 8); // ±22.5°
    return;
  }

  // Z continues slowly throughout bounce and settle
  const tBounceTotal = clamp01((scroll - FALL_END) / (BOUNCE_2_UP_END - FALL_END));

  if (scroll <= BOUNCE_1_UP_END) {
    const t = (scroll - FALL_END) / (BOUNCE_1_UP_END - FALL_END);
    out.z = Z_AT_LANDING + tBounceTotal * Z_BOUNCE_RANGE;
    out.x = power3Out(t) * (Math.PI / 3);
    out.y = 0;
    return;
  }

  if (scroll <= BOUNCE_1_DOWN_END) {
    const t = (scroll - BOUNCE_1_UP_END) / (BOUNCE_1_DOWN_END - BOUNCE_1_UP_END);
    out.z = Z_AT_LANDING + tBounceTotal * Z_BOUNCE_RANGE;
    out.x = (1 - power3Out(t)) * (Math.PI / 3);
    out.y = 0;
    return;
  }

  if (scroll <= BOUNCE_2_UP_END) {
    const t = (scroll - BOUNCE_1_DOWN_END) / (BOUNCE_2_UP_END - BOUNCE_1_DOWN_END);
    out.z = Z_AT_LANDING + tBounceTotal * Z_BOUNCE_RANGE;
    out.x = Math.sin(t * Math.PI) * 0.06;
    out.y = 0;
    return;
  }

  // Settle: eases to final rest orientation, face-up
  const tSettle = clamp01((scroll - BOUNCE_2_UP_END) / (1 - BOUNCE_2_UP_END));
  out.z = Z_AT_SETTLE + power3Out(tSettle) * (Z_SETTLE_TARGET - Z_AT_SETTLE);
  out.x = 0;
  out.y = 0;
}
