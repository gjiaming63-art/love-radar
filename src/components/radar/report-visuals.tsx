import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { RelationshipMeter } from "@/lib/report-insights";
import { cn } from "@/lib/utils";

/**
 * Presentational building blocks for the chat-analysis report page.
 * All copy is passed in by the caller, so the same blocks serve the Chinese and English sites.
 */

export type VisualTone = "risk" | "safe" | "neutral";

const toneStyles: Record<VisualTone, { border: string; bg: string; text: string; dot: string; stroke: string }> = {
  risk: { border: "border-primary/35", bg: "bg-primary/10", text: "text-primary", dot: "bg-primary", stroke: "stroke-primary" },
  safe: { border: "border-accent/35", bg: "bg-accent/10", text: "text-accent", dot: "bg-accent", stroke: "stroke-accent" },
  neutral: {
    border: "border-violet-400/30",
    bg: "bg-violet-500/10",
    text: "text-violet-300",
    dot: "bg-violet-400",
    stroke: "stroke-violet-400",
  },
};

/** Split a reason into its first sentence and the remainder (for "show more"). */
export function splitFirstSentence(text: string): [string, string] {
  const trimmed = text.trim();
  const match = trimmed.match(/^([\s\S]+?[。！？!?]|[\s\S]+?\.(?=\s|$))\s*([\s\S]*)$/);
  if (!match) return [trimmed, ""];
  return [match[1].trim(), match[2].trim()];
}

export function AnchorNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav className="sticky top-0 z-20 -mx-4 mb-4 border-b border-white/5 bg-background/80 px-4 py-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="min-h-9 shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function SectionHeading({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-16">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary/80">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">{title}</h2>
    </div>
  );
}

export function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, score));

  return (
    <div className="relative mx-auto h-40 w-40 shrink-0">
      <div className="radar-orbit absolute inset-0 rounded-full" aria-hidden />
      <div className="radar-sweep absolute inset-2 rounded-full opacity-70" aria-hidden />
      <svg viewBox="0 0 120 120" className="relative h-full w-full -rotate-90">
        <defs>
          <linearGradient id="love-radar-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(251 113 133)" />
            <stop offset="100%" stopColor="rgb(167 139 250)" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#love-radar-ring)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-5xl font-semibold leading-none text-foreground">{value}</span>
        <span className="mt-1 text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function VerdictHero({
  badges,
  score,
  scoreLabel,
  facts,
  verdict,
  keywords,
  radar,
}: {
  badges: ReactNode;
  score: number;
  scoreLabel: string;
  facts: { label: string; value: string }[];
  verdict: string;
  keywords: string[];
  radar?: ReactNode;
}) {
  return (
    <Card id="verdict" className="relative scroll-mt-16 overflow-hidden border-primary/25">
      <div className="report-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative grid gap-5 p-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:p-7">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">{badges}</div>
          <div className="flex items-center gap-4">
            <ScoreRing score={score} label={scoreLabel} />
            <dl className="min-w-0 space-y-2">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-[11px] text-muted-foreground">{fact.label}</dt>
                  <dd className="truncate text-sm font-semibold text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="text-pretty text-lg font-semibold leading-7 text-foreground">{verdict}</p>
          {keywords.length ? (
            <div className="flex flex-wrap gap-2">
              {keywords.map((tag) => (
                <Badge key={tag} className="border-primary/25 bg-primary/10 text-primary">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
        {radar ? <div className="hidden lg:block">{radar}</div> : null}
      </div>
    </Card>
  );
}

function MiniGauge({ value, tone }: { value: number; tone: VisualTone }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 44 44" className="h-12 w-12 shrink-0 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={radius} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="5" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        className={toneStyles[tone].stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value / 100)}
      />
    </svg>
  );
}

export function SignalGrid({ meters }: { meters: RelationshipMeter[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {meters.map((meter) => (
        <div key={meter.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <MiniGauge value={meter.value} tone={meter.tone} />
              <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-foreground">
                {meter.value}
              </span>
            </div>
            <p className="text-sm font-medium leading-5 text-foreground">{meter.label}</p>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{meter.caption}</p>
        </div>
      ))}
    </div>
  );
}

export function EvidenceBubble({
  tone,
  title,
  quote,
  reason,
  moreLabel,
  meta,
}: {
  tone: VisualTone;
  title?: string;
  quote: string;
  reason: string;
  moreLabel: string;
  meta?: string;
}) {
  const styles = toneStyles[tone];
  const [lead, rest] = splitFirstSentence(reason);

  return (
    <div className={cn("rounded-2xl border p-3", styles.border, "bg-white/[0.02]")}>
      {title || meta ? (
        <div className="mb-2 flex items-center justify-between gap-2">
          {title ? (
            <span className={cn("flex items-center gap-2 text-xs font-medium", styles.text)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
              {title}
            </span>
          ) : (
            <span />
          )}
          {meta ? <span className="text-[11px] text-muted-foreground">{meta}</span> : null}
        </div>
      ) : null}
      <p className={cn("inline-block max-w-full rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-6 text-foreground", styles.bg)}>
        “{quote}”
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{lead}</p>
      {rest ? (
        <details className="group mt-1">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground/80 hover:text-foreground">
            {moreLabel}
            <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
          </summary>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{rest}</p>
        </details>
      ) : null}
    </div>
  );
}

export function NextStepGrid({
  items,
}: {
  items: { tone: VisualTone; title: string; icon: ReactNode; body: ReactNode }[];
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {items.map((item) => {
        const styles = toneStyles[item.tone];
        return (
          <div key={item.title} className={cn("rounded-2xl border p-4", styles.border, styles.bg)}>
            <p className={cn("flex items-center gap-2 text-xs font-semibold", styles.text)}>
              {item.icon}
              {item.title}
            </p>
            <div className="mt-2 text-sm leading-6 text-foreground">{item.body}</div>
          </div>
        );
      })}
    </div>
  );
}

export function DetailFold({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.03]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground">
        <span>
          {title}
          {typeof count === "number" ? <span className="ml-2 text-xs text-muted-foreground">{count}</span> : null}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-white/5 px-4 py-4">{children}</div>
    </details>
  );
}
