import type { CSSProperties } from "react";

export type HeroBubble = {
  text: string;
  /** "in" = their message, "out" = yours, "signal" = a detected-signal tag */
  kind: "in" | "out" | "signal";
  /** Tailwind position classes, e.g. "left-[2%] top-[18%]" */
  position: string;
  delay?: number;
};

const orbits: Array<{ inset: string; duration: string; reverse?: boolean; dot: string }> = [
  { inset: "inset-[6%]", duration: "26s", dot: "bg-primary shadow-[0_0_14px_rgb(244_63_94/0.9)]" },
  { inset: "inset-[22%]", duration: "18s", reverse: true, dot: "bg-violet-400 shadow-[0_0_12px_rgb(167_139_250/0.9)]" },
  { inset: "inset-[36%]", duration: "12s", dot: "bg-rose-300 shadow-[0_0_10px_rgb(253_164_175/0.9)]" },
];

const blips = [
  { position: "left-[28%] top-[30%]", delay: 0 },
  { position: "left-[66%] top-[38%]", delay: 900 },
  { position: "left-[40%] top-[70%]", delay: 1700 },
];

const bubbleStyles: Record<HeroBubble["kind"], string> = {
  in: "rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] text-white/85",
  out: "rounded-2xl rounded-br-md border border-primary/30 bg-primary/20 text-rose-100",
  signal: "rounded-full border border-violet-400/30 bg-violet-500/15 text-violet-200",
};

/** Decorative radar: sweep, orbiting signal dots and floating chat bubbles. Purely visual. */
export function HeroRadar({ bubbles = [], className = "" }: { bubbles?: HeroBubble[]; className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none relative aspect-square select-none ${className}`}>
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(244_63_94/0.14),rgb(91_33_182/0.12)_45%,transparent_70%)]" />
      <div className="radar-orbit absolute inset-0 rounded-full" />
      <div className="absolute inset-0 rounded-full border border-primary/20" />
      <div className="absolute inset-[22%] rounded-full border border-violet-400/15" />
      <div className="absolute inset-[36%] rounded-full border border-white/10" />
      <div className="absolute left-1/2 top-[4%] h-[92%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      <div className="absolute left-[4%] top-1/2 h-px w-[92%] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <div className="radar-sweep absolute inset-0 rounded-full" />
      </div>

      {orbits.map((orbit) => (
        <div
          key={orbit.inset}
          className={`lr-orbit absolute ${orbit.inset} ${orbit.reverse ? "lr-orbit-reverse" : ""}`}
          style={{ "--lr-duration": orbit.duration } as CSSProperties}
        >
          <span className={`absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${orbit.dot}`} />
        </div>
      ))}

      {blips.map((blip) => (
        <span key={blip.position} className={`absolute ${blip.position} h-2 w-2`}>
          <span
            className="lr-ping absolute inset-0 rounded-full bg-primary/60"
            style={{ "--lr-delay": `${blip.delay}ms` } as CSSProperties}
          />
          <span className="absolute inset-0 rounded-full bg-primary/90" />
        </span>
      ))}

      <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_28px_rgb(244_63_94)]" />

      {bubbles.map((bubble) => (
        <span
          key={bubble.text}
          className={`lr-float absolute ${bubble.position} max-w-[11rem] whitespace-nowrap px-3 py-1.5 text-xs shadow-lg shadow-black/30 backdrop-blur ${bubbleStyles[bubble.kind]}`}
          style={{ "--lr-delay": `${bubble.delay ?? 0}ms` } as CSSProperties}
        >
          {bubble.text}
        </span>
      ))}
    </div>
  );
}
