"use client";

import { useEffect, useRef, useState } from "react";
import {
  initLenis,
  destroyLenis,
} from "@/lib/scroll";
import Canvas3D from "./Canvas3D";
import Copy from "./Copy";
import SignupForm from "./SignupForm";


const SCROLL_HEIGHT_VH = 800; // total scroll length in vh

export default function Site() {
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [downgradeFps, setDowngradeFps] = useState(false);

  // Honour prefers-reduced-motion
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const handler = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
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

  // Throttle React re-renders for copy reveals; 3D scene reads from ref at 60fps
  useEffect(() => {
    const lenis = initLenis();

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    const onScroll = ({
      scroll,
      limit,
    }: {
      scroll: number;
      limit: number;
    }) => {
      const p = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0;
      progressRef.current = p;
    };
    lenis.on("scroll", onScroll);

    // React state, throttled to ~30fps for copy reveals
    let lastUpdate = 0;
    let stateRaf = 0;
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
      destroyLenis();
    };
  }, []);

  const showForm = progress >= 0.85;

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
