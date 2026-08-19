import Link from "next/link";
import { ArrowLeft, Orbit, Sparkles } from "lucide-react";
import { EnglishAstrologyForm } from "@/components/radar/en/astrology-form";
import { Badge } from "@/components/ui/badge";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Love Astrology | Relationship Chemistry by Birth Charts",
  description:
    "See your relationship chemistry through birth charts. Explore emotional rhythm, romantic chemistry, communication style, and long-term potential.",
  path: "/en/astrology",
  locale: "en_US",
  keywords: ["love astrology", "relationship astrology", "birth chart compatibility", "relationship chemistry"],
  languages: {
    "zh-CN": "/astrology",
    "en-US": "/en/astrology",
  },
});

export default function EnglishAstrologyPage() {
  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5 text-white">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-primary/10 blur-3xl" />
      <section className="relative mx-auto w-full max-w-5xl">
        <Link href="/en" prefetch={false} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <div className="mt-7 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="space-y-5">
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-primary/35 bg-primary/15 text-primary">
                  <Orbit className="h-5 w-5" />
                </span>
                <Badge className="border-primary/25 bg-primary/10 text-primary">Love Astrology</Badge>
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-5xl">See your relationship chemistry</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Enter two birth profiles. Love Radar reads the core planet patterns and turns them into a modern
                relationship chemistry report.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-accent" />
                Not a prediction
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Astrology is a symbolic reflection tool, not a scientific prediction. Use this as entertainment and
                self-reflection, not as a final relationship decision.
              </p>
            </div>
            <MiniAstrologyVisual />
          </div>
          <EnglishAstrologyForm />
        </div>
      </section>
    </main>
  );
}

function MiniAstrologyVisual() {
  const planets = [
    { x: 80, y: 16, label: "♀" },
    { x: 128, y: 38, label: "☽" },
    { x: 142, y: 84, label: "♂" },
    { x: 105, y: 132, label: "♄" },
    { x: 48, y: 126, label: "☿" },
    { x: 18, y: 78, label: "♇" },
  ];

  return (
    <div className="relative overflow-hidden rounded-lg border border-accent/20 bg-card/70 p-5">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(33,215,202,0.16),rgba(255,72,112,0.08)_45%,transparent_70%)] blur-sm" />
      <div className="relative mx-auto h-48 w-48">
        <div className="absolute inset-2 animate-spin rounded-full border border-primary/30 [animation-duration:22s]" />
        <div className="absolute inset-10 animate-spin rounded-full border border-accent/30 [animation-direction:reverse] [animation-duration:16s]" />
        <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full overflow-visible">
          <line x1="80" y1="10" x2="80" y2="150" stroke="rgb(255 255 255 / 0.12)" />
          <line x1="10" y1="80" x2="150" y2="80" stroke="rgb(255 255 255 / 0.12)" />
          <line x1="30" y1="30" x2="130" y2="130" stroke="rgb(255 255 255 / 0.1)" />
          <line x1="130" y1="30" x2="30" y2="130" stroke="rgb(255 255 255 / 0.1)" />
          <path d="M80 80 L128 38 L105 132 L48 126 Z" fill="rgb(20 184 166 / 0.14)" stroke="rgb(45 212 191 / 0.62)" />
          <path d="M80 80 L142 84 L18 78 Z" fill="rgb(244 63 94 / 0.14)" stroke="rgb(251 113 133 / 0.6)" />
          {planets.map((planet) => (
            <g key={planet.label}>
              <circle cx={planet.x} cy={planet.y} r="11" fill="rgb(8 13 28 / 0.95)" stroke="rgb(255 255 255 / 0.18)" />
              <text x={planet.x} y={planet.y + 5} textAnchor="middle" className="fill-primary text-[15px] font-semibold">
                {planet.label}
              </text>
            </g>
          ))}
          <circle cx="128" cy="38" r="4" className="animate-pulse fill-accent" />
          <circle cx="48" cy="126" r="3.5" className="animate-pulse fill-primary" />
          <circle cx="80" cy="80" r="5" fill="rgb(255 255 255 / 0.75)" />
        </svg>
      </div>
      <div className="relative mt-2 text-center">
        <p className="text-sm font-semibold">Your chart is a relationship mirror</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">A symbolic look at chemistry, timing, and emotional rhythm.</p>
      </div>
    </div>
  );
}
