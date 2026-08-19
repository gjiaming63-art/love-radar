import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EnglishAnalyzeForm } from "@/components/radar/en/analyze-form";
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

export default function EnglishAnalyzePage() { return <main className="min-h-svh px-4 py-5 text-white"><div className="mx-auto w-full max-w-3xl"><Link href="/en" prefetch={false} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back to Love Radar AI</Link><EnglishAnalyzeForm /></div></main>; }
