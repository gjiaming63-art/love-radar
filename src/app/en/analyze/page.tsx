import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EnglishAnalyzeForm } from "@/components/radar/en/analyze-form";

export default function EnglishAnalyzePage() { return <main className="min-h-svh px-4 py-5 text-white"><div className="mx-auto w-full max-w-3xl"><Link href="/en" prefetch={false} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back to Love Radar AI</Link><EnglishAnalyzeForm /></div></main>; }
