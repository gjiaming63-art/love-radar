import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AnalyzeForm } from "@/components/radar/analyze-form";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "AI 聊天记录分析 | 恋爱雷达",
  description: "粘贴聊天记录或上传聊天截图，生成 AI 恋爱关系分析报告，识别敷衍、冷暴力、养鱼和沟通风险信号。",
  path: "/analyze",
  keywords: ["聊天记录分析", "AI 恋爱分析", "恋爱雷达", "恋爱聊天截图分析"],
  languages: {
    "zh-CN": "/analyze",
    "en-US": "/en/analyze",
  },
});

export default function AnalyzePage() {
  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="signal-grid absolute inset-0 opacity-30" />
        <div className="lr-landing-glow absolute inset-0 opacity-70" />
      </div>
      <div className="relative mx-auto w-full max-w-3xl">
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
