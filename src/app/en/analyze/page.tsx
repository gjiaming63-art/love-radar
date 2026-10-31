import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EnglishAnalyzeForm } from "@/components/radar/en/analyze-form";
import { HeroRadar } from "@/components/radar/hero-radar";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "AI Relationship Chat Analyzer",
  description:
    "Analyze text messages or chat screenshots with AI to understand emotional investment, interest level, communication patterns, red flags, and suggested replies.",
  path: "/en/analyze",
  locale: "en_US",
  keywords: ["AI relationship analysis", "relationship chat analyzer", "text message analysis", "dating advice"],
  languages: {
    "zh-CN": "/analyze",
    "en-US": "/en/analyze",
  },
});

export default function EnglishAnalyzePage() {
  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="signal-grid absolute inset-0 opacity-35" />
        <div className="lr-landing-glow absolute inset-0 opacity-80" />
        <HeroRadar className="absolute -right-24 -top-20 w-72 opacity-40 sm:-right-16 sm:w-96 sm:opacity-50" />
      </div>
      <div className="relative mx-auto w-full max-w-3xl">
        <Link href="/en" prefetch={false} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Back to Love Radar AI
        </Link>
        <EnglishAnalyzeForm />
      </div>
    </main>
  );
}
