"use client";

import { useEffect, useRef } from "react";
import {
  HERO,
  SECTION_2_LINES,
  SECTION_3,
  SECTION_4,
  SECTION_5,
  SECTION_6,
} from "@/lib/copy";

interface Props {
  progress: number;
  reducedMotion: boolean;
}

// Returns reveal state for a block given its scroll range.
// Reveal ramps in BEFORE `start` so the block is fully visible by `start`,
// holds through `end`, then fades out over `outDuration`.
//   reveal: 0 -> 1 during ramp-in
//   out:    0 -> 1 during ramp-out (after end)
function rangeState(
  progress: number,
  start: number,
  end: number,
  rampIn = 0.05,
  outDuration = 0.04,
) {
  const inStart = Math.max(0, start - rampIn);
  // Special-case ranges that begin at scroll 0 — show immediately.
  if (start <= 0) {
    if (progress < end) return { reveal: 1, out: 0 };
    if (progress < end + outDuration) {
      return { reveal: 1, out: (progress - end) / outDuration };
    }
    return { reveal: 1, out: 1 };
  }
  if (progress < inStart) return { reveal: 0, out: 0 };
  if (progress < start) {
    return { reveal: (progress - inStart) / (start - inStart), out: 0 };
  }
  if (progress < end) return { reveal: 1, out: 0 };
  if (progress < end + outDuration) {
    return { reveal: 1, out: (progress - end) / outDuration };
  }
  return { reveal: 1, out: 1 };
}

function lineStyle(
  reveal: number,
  out: number,
  staggerIndex: number,
  reducedMotion: boolean,
): React.CSSProperties {
  // Stagger 80ms per line — approximate with reveal lag of 0.04 progress units
  const r = Math.max(0, reveal - staggerIndex * 0.06);
  const rClamped = Math.min(1, r * 2.2); // ramp faster once started
  const visibility = 1 - out;
  if (reducedMotion) {
    return {
      opacity: reveal * visibility,
      transition: "opacity 0.3s ease-out",
    };
  }
  const insetBottom = (1 - rClamped) * 100;
  return {
    clipPath: `inset(0 0 ${insetBottom}% 0)`,
    WebkitClipPath: `inset(0 0 ${insetBottom}% 0)`,
    opacity: visibility,
    transition: "opacity 0.4s ease-out",
  };
}

export default function Copy({ progress, reducedMotion }: Props) {
  const hero = rangeState(progress, 0.0, 0.05);
  const s2 = rangeState(progress, 0.1, 0.2);
  const s3 = rangeState(progress, 0.25, 0.35);
  const s4 = rangeState(progress, 0.4, 0.55);
  const s5 = rangeState(progress, 0.6, 0.75);
  const s6 = rangeState(progress, 0.78, 0.83);
  const note = rangeState(progress, 0.88, 1.0);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      aria-hidden={false}
    >
      {/* HERO 0.00 - 0.05 (centered, near top) */}
      <Block position="hero">
        <h1
          className="font-serif text-balance text-center"
          style={{
            ...lineStyle(hero.reveal, hero.out, 0, reducedMotion),
            paddingBottom: "0.15em",
          }}
        >
          {HERO}
        </h1>
      </Block>

      {/* SECTION 2 0.10 - 0.20 (right of falling coin) */}
      <Block position="right-mid">
        {SECTION_2_LINES.map((line, i) => (
          <p
            key={i}
            className="text-body mb-6 last:mb-0"
            style={lineStyle(s2.reveal, s2.out, i, reducedMotion)}
          >
            {line}
          </p>
        ))}
      </Block>

      {/* SECTION 3 0.25 - 0.35 (left of falling coin) */}
      <Block position="left-mid">
        <h2
          className="font-serif text-h2 mb-10 text-balance"
          style={lineStyle(s3.reveal, s3.out, 0, reducedMotion)}
        >
          {SECTION_3.heading}
        </h2>
        {SECTION_3.lines.map((line, i) => (
          <p
            key={i}
            className="text-body mb-6 last:mb-0"
            style={lineStyle(s3.reveal, s3.out, i + 1, reducedMotion)}
          >
            {line}
          </p>
        ))}
      </Block>

      {/* SECTION 4 0.40 - 0.55 (right of falling coin) */}
      <Block position="right-mid">
        <h2
          className="font-serif text-h2 mb-12 text-balance"
          style={lineStyle(s4.reveal, s4.out, 0, reducedMotion)}
        >
          {SECTION_4.heading}
        </h2>
        <div className="space-y-9">
          {SECTION_4.steps.map((step, i) => (
            <div
              key={i}
              style={lineStyle(s4.reveal, s4.out, i + 1, reducedMotion)}
            >
              <p className="font-serif italic text-body mb-1.5">{step.label}</p>
              <p className="text-body opacity-80">{step.body}</p>
            </div>
          ))}
        </div>
      </Block>

      {/* SECTION 5 0.60 - 0.75 (left of falling coin) */}
      <Block position="left-mid">
        <h2
          className="font-serif text-h2 mb-10 text-balance"
          style={lineStyle(s5.reveal, s5.out, 0, reducedMotion)}
        >
          {SECTION_5.heading}
        </h2>
        {SECTION_5.lead.map((line, i) => (
          <p
            key={i}
            className="text-body mb-5 last:mb-0"
            style={lineStyle(s5.reveal, s5.out, i + 1, reducedMotion)}
          >
            {line}
          </p>
        ))}
        <div
          className="mt-12 h-px w-8 bg-ink/20"
          style={lineStyle(s5.reveal, s5.out, 3, reducedMotion)}
        />
        <div className="mt-8 space-y-5">
          {SECTION_5.cases.map((c, i) => (
            <p
              key={i}
              className="text-body-sm opacity-75"
              style={lineStyle(s5.reveal, s5.out, i + 4, reducedMotion)}
            >
              {c}
            </p>
          ))}
        </div>
      </Block>

      {/* SECTION 6 0.78 - 0.83 (centered) */}
      <Block position="center">
        <h2
          className="font-serif text-h2 text-balance text-center"
          style={lineStyle(s6.reveal, s6.out, 0, reducedMotion)}
        >
          {SECTION_6.heading}
        </h2>
        <p
          className="text-body text-center mt-8 opacity-70"
          style={lineStyle(s6.reveal, s6.out, 1, reducedMotion)}
        >
          {SECTION_6.body}
        </p>
      </Block>
    </div>
  );
}

function Block({
  position,
  children,
}: {
  position: "hero" | "right-mid" | "left-mid" | "center";
  children: React.ReactNode;
}) {
  // Each block is fixed-positioned on screen. The Canvas underneath fills the
  // viewport; copy is in negative space around the falling coin.
  const base =
    "absolute max-w-[460px] text-ink";
  const map: Record<typeof position, string> = {
    hero: "left-1/2 top-[10vh] -translate-x-1/2 w-[min(88vw,960px)] max-w-none text-center",
    "right-mid":
      "right-[8vw] top-1/2 -translate-y-1/2 w-[min(38vw,480px)]",
    "left-mid":
      "left-[8vw] top-1/2 -translate-y-1/2 w-[min(38vw,480px)]",
    center:
      "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(78vw,720px)] text-center",
  };
  return <div className={`${base} ${map[position]}`}>{children}</div>;
}
