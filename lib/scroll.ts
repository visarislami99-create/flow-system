"use client";

import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";

let lenisInstance: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function initLenis(): Lenis {
  if (lenisInstance) return lenisInstance;
  lenisInstance = new Lenis({
    lerp: 0.08,
    duration: 1.2,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  });
  return lenisInstance;
}

export function destroyLenis() {
  lenisInstance?.destroy();
  lenisInstance = null;
}

// Returns scroll progress 0..1 across the page.
// Updates every Lenis tick. Avoid React state for canvas-tied consumers;
// they should read via a ref/getter for 60fps. Components that need
// React re-renders (copy reveals) can use this hook with a throttle.
export function useScrollProgress(throttleMs = 0): number {
  const [progress, setProgress] = useState(0);
  const lastRef = useRef(0);

  useEffect(() => {
    const lenis = initLenis();
    const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => {
      const p = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0;
      const now = performance.now();
      if (throttleMs > 0 && now - lastRef.current < throttleMs) return;
      lastRef.current = now;
      setProgress(p);
    };
    lenis.on("scroll", onScroll);

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.off("scroll", onScroll);
    };
  }, [throttleMs]);

  return progress;
}

// Ref-based progress for 60fps consumers (canvas). No React re-renders.
export function createProgressRef(): { current: number } {
  const ref = { current: 0 };
  if (typeof window === "undefined") return ref;
  const lenis = initLenis();
  lenis.on("scroll", ({ scroll, limit }: { scroll: number; limit: number }) => {
    ref.current = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0;
  });
  return ref;
}
