import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnalyzeForm } from "@/components/radar/analyze-form";

export default function AnalyzePage() {
  return (
    <main className="min-h-svh px-4 py-5">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          prefetch={false}
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
        <AnalyzeForm />
      </div>
    </main>
  );
}
