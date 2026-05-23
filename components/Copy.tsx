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

function lineStyle(
  reveal: number,
  out: number,
  reducedMotion: boolean,
): React.CSSProperties {
  const visibility = 1 - out;
  if (reducedMotion) {
    return { opacity: reveal * visibility, transition: "opacity 0.3s ease-out" };
  }
  const insetBottom = (1 - Math.min(1, reveal * 2.2)) * 100;
  return {
    clipPath: `inset(0 0 ${insetBottom}% 0)`,
    WebkitClipPath: `inset(0 0 ${insetBottom}% 0)`,
    opacity: visibility,
    transition: "opacity 0.4s ease-out",
  };
}

export default function Copy({ progress, reducedMotion }: Props) {
  const hero = rangeState(progress, 0.0, 0.05);
  const s2   = rangeState(progress, 0.1,  0.2);
  const s3   = rangeState(progress, 0.25, 0.35);
  const s4   = rangeState(progress, 0.4,  0.55);
  const s5   = rangeState(progress, 0.6,  0.75);
  const s6   = rangeState(progress, 0.78, 0.83);

  return (
    <div className="pointer-events-none fixed inset-0 z-10" aria-hidden={false}>

      {/* HERO */}
      <Block position="hero">
        <h1
          className="font-serif text-balance text-center"
          style={{ ...lineStyle(hero.reveal, hero.out, reducedMotion), paddingBottom: "0.15em" }}
        >
          {HERO}
        </h1>
      </Block>

      {/* SECTION 2 */}
      <Block position="right-mid">
        <p className="text-body" style={lineStyle(s2.reveal, s2.out, reducedMotion)}>
          {SECTION_2}
        </p>
      </Block>

      {/* SECTION 3 */}
      <Block position="left-mid">
        <p className="text-body" style={lineStyle(s3.reveal, s3.out, reducedMotion)}>
          {SECTION_3}
        </p>
      </Block>

      {/* SECTION 4 */}
      <Block position="right-mid">
        <h2
          className="font-serif text-h2 text-balance"
          style={lineStyle(s4.reveal, s4.out, reducedMotion)}
        >
          {SECTION_4}
        </h2>
      </Block>

      {/* SECTION 5 */}
      <Block position="left-mid">
        <p className="text-body" style={lineStyle(s5.reveal, s5.out, reducedMotion)}>
          {SECTION_5}
        </p>
      </Block>

      {/* SECTION 6 */}
      <Block position="center">
        <h2
          className="font-serif text-h2 text-balance text-center"
          style={lineStyle(s6.reveal, s6.out, reducedMotion)}
        >
          {SECTION_6}
        </h2>
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
  const base = "absolute text-ink";
  const map: Record<typeof position, string> = {
    hero: "left-1/2 -translate-x-1/2 top-[10vh] w-[min(88vw,960px)] max-w-none text-center",
    "right-mid":
      "left-1/2 -translate-x-1/2 bottom-[10vh] w-[90vw] max-w-none " +
      "md:bottom-auto md:left-auto md:translate-x-0 md:top-1/2 md:-translate-y-1/2 md:right-[8vw] md:w-[min(38vw,480px)] md:max-w-[460px]",
    "left-mid":
      "left-1/2 -translate-x-1/2 bottom-[10vh] w-[90vw] max-w-none " +
      "md:bottom-auto md:left-[8vw] md:translate-x-0 md:top-1/2 md:-translate-y-1/2 md:w-[min(38vw,480px)] md:max-w-[460px]",
    center:
      "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,720px)] max-w-none text-center",
  };
  return <div className={`${base} ${map[position]}`}>{children}</div>;
}
