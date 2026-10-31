import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Check,
  HeartPulse,
  LogIn,
  MessagesSquare,
  Radar,
  ShieldCheck,
  Signpost,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroRadar, type HeroBubble } from "@/components/radar/hero-radar";
import { enUS } from "@/lib/i18n/en-US";
import { getCurrentUser } from "@/lib/auth";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Love Radar AI | AI Relationship Chat Analysis",
  description:
    "Upload a conversation or chat screenshot. Love Radar AI helps you understand relationship signals, communication patterns, red flags, green flags, and suggested replies.",
  path: "/en",
  locale: "en_US",
  keywords: [
    "AI relationship analysis",
    "AI chat analysis",
    "relationship chat analyzer",
    "love compatibility",
    "text message analysis",
    "dating advice",
  ],
  languages: {
    "zh-CN": "/",
    "en-US": "/en",
  },
});

const heroBubbles: HeroBubble[] = [
  { text: "haha maybe 😅", kind: "in", position: "left-[-2%] top-[14%]", delay: 0 },
  { text: "so are we still on for friday?", kind: "out", position: "right-[-4%] top-[30%]", delay: 1200 },
  { text: "Mixed signals detected", kind: "signal", position: "left-[2%] bottom-[22%]", delay: 600 },
  { text: "Interest: rising", kind: "signal", position: "right-[4%] bottom-[8%]", delay: 1800 },
];

const signalCards: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: Activity, title: "Relationship stage", desc: "Talking, situationship, fading or getting serious — see where it really stands." },
  { icon: HeartPulse, title: "Emotional signals", desc: "Interest, effort and mixed signals, scored from how you both actually text." },
  { icon: MessagesSquare, title: "Communication patterns", desc: "Who initiates, who goes quiet, and the dynamics you keep repeating." },
  { icon: Signpost, title: "Next steps", desc: "What to say (or not say) next, based on the conversation itself." },
];

const delay = (ms: number) => ({ "--lr-delay": `${ms}ms` }) as CSSProperties;

export default async function EnglishHome() {
  const user = await getCurrentUser();
  const accountHref = user ? "/en/me" : "/en/login?redirect=/en/me";
  const accountLabel = user ? "My account" : "Sign in";
  const AccountIcon = user ? UserRound : LogIn;

  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-6 text-white">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="lr-landing-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <section className="relative mx-auto flex w-full max-w-5xl flex-col md:min-h-[calc(100svh-3rem)]">
        <header className="flex items-center justify-between gap-3 pr-24 sm:pr-0">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
              <Radar className="h-4 w-4" />
            </span>
            <span className="truncate">{enUS.brand}</span>
          </div>
          <Link
            href={accountHref}
            prefetch={false}
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-white sm:inline-flex"
          >
            <AccountIcon className="h-3.5 w-3.5" />
            {accountLabel}
          </Link>
        </header>

        <div className="grid flex-1 gap-10 pb-10 pt-10 md:grid-cols-[1.05fr_0.95fr] md:items-center md:pt-12">
          <div>
            <div className="lr-reveal inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-rose-200" style={delay(0)}>
              <span className="relative flex h-2 w-2">
                <span className="lr-ping absolute inset-0 rounded-full bg-primary/70" />
                <span className="relative h-2 w-2 rounded-full bg-primary" />
              </span>
              AI chat analysis<span className="hidden sm:inline"> for iMessage, Instagram, WhatsApp &amp; more</span>
            </div>
            <h1 className="lr-reveal mt-5 text-balance text-5xl font-semibold leading-[1.02] sm:text-6xl" style={delay(80)}>
              Read the <span className="lr-text-glow">signals</span> in your chats.
            </h1>
            <p className="lr-reveal mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground" style={delay(160)}>
              Upload a screenshot. Love Radar reads interest, mixed signals and communication patterns — and shows you
              what to do next.
            </p>
            <div className="lr-reveal mt-8 flex flex-col gap-3 sm:flex-row" style={delay(240)}>
              <Link href="/en/analyze" prefetch={false}>
                <Button size="lg" className="lr-breathe w-full sm:w-auto">
                  Analyze my chat
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/en/personality" prefetch={false}>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <BrainCircuit className="h-4 w-4 text-violet-300" />
                  Take the love personality quiz
                </Button>
              </Link>
              <Link href={accountHref} prefetch={false} className="sm:hidden">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                >
                  <AccountIcon className="h-4 w-4" />
                  {accountLabel}
                </Button>
              </Link>
            </div>
            <div className="lr-reveal mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground" style={delay(320)}>
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Chat content is not saved as original text.
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                Free to start
              </span>
            </div>
          </div>

          <div className="lr-reveal relative mx-auto w-full max-w-[19rem] sm:max-w-sm" style={delay(200)}>
            <HeroRadar bubbles={heroBubbles} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pb-10 sm:gap-3 lg:grid-cols-4">
          {signalCards.map((card, index) => (
            <div
              key={card.title}
              className="lr-reveal lr-hover-lift rounded-[20px] border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur sm:p-4"
              style={delay(380 + index * 80)}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
                <card.icon className="h-4 w-4" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-white">{card.title}</h2>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="pricing" className="relative mx-auto w-full max-w-5xl pb-10">
        <h2 className="text-2xl font-semibold">Pricing</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="lr-hover-lift rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-muted-foreground">Free analysis</p>
            <p className="mt-2 text-3xl font-semibold">$0</p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {["Overall score and relationship stage", "Signal scores (sincerity, avoidance, mixed signals…)", "Top red flags and green flags"].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{item}</li>)}
            </ul>
          </div>
          <div className="lr-hover-lift rounded-[28px] border border-primary/30 bg-primary/10 p-5">
            <p className="text-sm text-primary">Full report</p>
            <p className="mt-2 text-3xl font-semibold">$4.99 <span className="text-sm font-normal text-muted-foreground">one-time, per conversation</span></p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {["Word-for-word reply suggestions", "If-they-do-this, you-do-that game plan", "All red and green flags with explanations", "Mistakes to avoid"].map((item) => <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{item}</li>)}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">No subscription. Delivered instantly on your report page. 7-day refund policy.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
