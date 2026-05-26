"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { initLenis, destroyLenis } from "@/lib/scroll";
import Canvas3D from "./Canvas3D";
import Copy from "./Copy";
import SignupForm from "./SignupForm";

// ─── Constants ────────────────────────────────────────────────────────────────

const SCROLL_HEIGHT_VH  = 800;   // total scroll length in vh
const LANDING_TRIGGER   = 0.85;  // progress value that fires the coin drop
const LANDING_DURATION  = 1.5;   // seconds for full 0.85 → 1.0 arc

type LandingState = "idle" | "playing" | "reversing" | "done";

// ─── Component ────────────────────────────────────────────────────────────────

export default function Site() {
  const progressRef     = useRef(0);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [downgradeFps,  setDowngradeFps]  = useState(false);

  // Landing machine — all mutable state lives in refs so closures stay fresh
  const reducedMotionRef = useRef(false);
  const landingState     = useRef<LandingState>("idle");
  const lenisRunning     = useRef(true);
  const scrollLimitRef   = useRef(0);
  const activeTween      = useRef<gsap.core.Tween | null>(null);

  // Honour prefers-reduced-motion
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setReducedMotion(mql.matches);
      reducedMotionRef.current = mql.matches;
    };
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  // Performance cap: 30fps on machines with <8 hardware threads
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency < 8
    ) {
      setDowngradeFps(true);
    }
  }, []);

  // ── Main scroll + landing effect ─────────────────────────────────────────
  useEffect(() => {
    const lenis = initLenis();

    // Animate progressRef from LANDING_TRIGGER → 1.0 automatically
    const fireLanding = () => {
      if (landingState.current !== "idle") return;
      landingState.current  = "playing";
      lenisRunning.current  = false;
      progressRef.current   = LANDING_TRIGGER;

      activeTween.current = gsap.to(progressRef, {
        current:  1.0,
        duration: LANDING_DURATION,
        ease:     "none", // motion.ts supplies its own easing per segment
        onComplete() {
          // Snap physical scroll to the end so Lenis resumes cleanly
          if (scrollLimitRef.current > 0) {
            window.scrollTo(0, scrollLimitRef.current);
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (lenis as any).scrollTo(scrollLimitRef.current, { immediate: true });
            } catch { /* Lenis v1 may not expose scrollTo */ }
          }
          lenisRunning.current = true;
          landingState.current = "done";
        },
      });
    };

    // Reverse the landing tween back to LANDING_TRIGGER, then resume scroll
    const reverseToIdle = () => {
      if (landingState.current !== "playing") return;
      landingState.current = "reversing";
      activeTween.current?.kill();

      // Reverse at the same rate (proportional to how far the tween got)
      const elapsed = progressRef.current - LANDING_TRIGGER;
      const dur     = Math.max(0.05, elapsed * (LANDING_DURATION / (1.0 - LANDING_TRIGGER)));

      activeTween.current = gsap.to(progressRef, {
        current:  LANDING_TRIGGER,
        duration: dur,
        ease:     "none",
        onComplete() {
          progressRef.current = LANDING_TRIGGER;
          // Sync Lenis — physical scroll never moved from LANDING_TRIGGER * limit
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (lenis as any).scrollTo(LANDING_TRIGGER * scrollLimitRef.current, { immediate: true });
          } catch {}
          lenisRunning.current = true;
          landingState.current = "idle";
        },
      });
    };

    // ── RAF loop: only drive Lenis when allowed ───────────────────────────
    let rafId = 0;
    const raf = (time: number) => {
      if (lenisRunning.current) lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // ── Scroll listener ───────────────────────────────────────────────────
    const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => {
      if (limit > 0) scrollLimitRef.current = limit;
      const p = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0;

      // Only let Lenis drive progressRef in free-scroll states
      if (landingState.current === "idle" || landingState.current === "done") {
        progressRef.current = p;
      }

      // Fire landing when user reaches trigger (and motion is enabled)
      if (landingState.current === "idle" && p >= LANDING_TRIGGER && !reducedMotionRef.current) {
        fireLanding();
      }

      // Allow re-trigger if user scrolls back above the trigger after "done"
      if (landingState.current === "done" && p < LANDING_TRIGGER) {
        landingState.current = "idle";
      }
    };
    lenis.on("scroll", onScroll);

    // ── Wheel handler: block scroll + catch upward swipe for reversal ─────
    const onWheel = (e: WheelEvent) => {
      const state = landingState.current;
      if (state === "playing" || state === "reversing") {
        e.preventDefault();
        if (state === "playing" && e.deltaY < 0) reverseToIdle();
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });

    // ── Touch handler for mobile ──────────────────────────────────────────
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove  = (e: TouchEvent) => {
      const state = landingState.current;
      if (state === "playing" || state === "reversing") {
        e.preventDefault();
        if (state === "playing" && e.touches[0].clientY - touchStartY > 10) reverseToIdle();
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: false });

    // ── React state throttled to ~30fps for copy reveals ──────────────────
    let lastUpdate = 0;
    let stateRaf   = 0;
    const tickState = (time: number) => {
      if (time - lastUpdate > 33) {
        setProgress(progressRef.current);
        lastUpdate = time;
      }
      stateRaf = requestAnimationFrame(tickState);
    };
    stateRaf = requestAnimationFrame(tickState);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(stateRaf);
      lenis.off("scroll", onScroll);
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove",  onTouchMove);
      activeTween.current?.kill();
      destroyLenis();
    };
  }, []);

  // Form appears once the coin has fully settled (progress >= 0.97)
  const showForm = progress >= 0.97;

  return (
    <>
      <Canvas3D progressRef={progressRef} reducedMotion={reducedMotion} />
      <Copy progress={progress} reducedMotion={reducedMotion} />
      <SignupForm visible={showForm} reducedMotion={reducedMotion} />

      {/* Scroll length spacer */}
      <div style={{ height: `${SCROLL_HEIGHT_VH}vh` }} aria-hidden />
    </>
  );
}
