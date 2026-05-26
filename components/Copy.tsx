"use client";

import {
  HERO,
  SECTION_2,
  SECTION_3,
  SECTION_4,
  SECTION_5,
  SECTION_6,
} from "@/lib/copy";

interface Props {
  progress: number;
  reducedMotion: boolean;
}

function rangeState(
  progress: number,
  start: number,
  end: number,
  rampIn = 0.05,
  outDuration = 0.04,
) {
  const inStart = Math.max(0, start - rampIn);
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

function cardStyle(
  reveal: number,
  out: number,
  reducedMotion: boolean,
): React.CSSProperties {
  const opacity = (1 - out) * (reducedMotion ? reveal : 1);
  if (reducedMotion) {
    return { opacity, transition: "opacity 0.3s ease-out" };
  }
  const insetBottom = (1 - Math.min(1, reveal * 2.2)) * 100;
  return {
    clipPath: `inset(0 0 ${insetBottom}% 0)`,
    WebkitClipPath: `inset(0 0 ${insetBottom}% 0)`,
    opacity: 1 - out,
    transition: "opacity 0.4s ease-out",
  };
}

export default function Copy({ progress, reducedMotion }: Props) {
  const hero = rangeState(progress, 0.0,  0.05);
  const s2   = rangeState(progress, 0.1,  0.2);
  const s3   = rangeState(progress, 0.25, 0.35);
  const s4   = rangeState(progress, 0.4,  0.55);
  const s5   = rangeState(progress, 0.6,  0.75);
  const s6   = rangeState(progress, 0.78, 0.83);

  return (
    <div className="pointer-events-none fixed inset-0 z-10" aria-hidden={false}>

      {/* HERO — centered above coin */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-[8vh] text-center"
        style={cardStyle(hero.reveal, hero.out, reducedMotion)}
      >
        <h1 className="font-serif text-ink" style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", paddingBottom: "0.1em" }}>
          {HERO}
        </h1>
      </div>

      {/* SECTION 2 — right */}
      <Card position="right" style={cardStyle(s2.reveal, s2.out, reducedMotion)}>
        <p className="text-body text-ink">{SECTION_2}</p>
      </Card>

      {/* SECTION 3 — left */}
      <Card position="left" style={cardStyle(s3.reveal, s3.out, reducedMotion)}>
        <p className="text-body text-ink">{SECTION_3}</p>
      </Card>

      {/* SECTION 4 — right */}
      <Card position="right" style={cardStyle(s4.reveal, s4.out, reducedMotion)}>
        <p className="text-body text-ink">{SECTION_4}</p>
      </Card>

      {/* SECTION 5 — left */}
      <Card position="left" style={cardStyle(s5.reveal, s5.out, reducedMotion)}>
        <p className="text-body text-ink">{SECTION_5}</p>
      </Card>

      {/* SECTION 6 — below coin, no background box */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: "18vh", ...cardStyle(s6.reveal, s6.out, reducedMotion) }}
      >
        <p
          className="font-serif text-ink text-center"
          style={{ fontSize: "clamp(1.1rem, 2.2vw, 1.5rem)", maxWidth: "380px" }}
        >
          {SECTION_6}
        </p>
      </div>

    </div>
  );
}

function Card({
  position,
  style,
  children,
}: {
  position: "left" | "right";
  style: React.CSSProperties;
  children: React.ReactNode;
}) {
  const base: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    maxWidth: "300px",
    width: "min(300px, 38vw)",
    ...style,
  };

  if (position === "left") {
    base.left = "16vw";
  } else {
    base.right = "16vw";
  }

  // Mobile: stack centered at bottom
  return (
    <div
      className="max-md:left-1/2 max-md:-translate-x-1/2 max-md:top-auto max-md:bottom-[10vh] max-md:translate-y-0 max-md:w-[88vw] max-md:max-w-none"
      style={base}
    >
      {children}
    </div>
  );
}
