import type { CSSProperties } from "react";
import Link from "next/link";
import { Activity, ArrowRight, HeartPulse, LogIn, MessagesSquare, Radar, ShieldCheck, Signpost, UserRound, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroRadar, type HeroBubble } from "@/components/radar/hero-radar";
import { getCurrentUser } from "@/lib/auth";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "恋爱雷达 Love Radar | AI 恋爱聊天记录分析",
  description:
    "上传或粘贴聊天记录，让 Love Radar AI 分析关系状态、敷衍信号、冷暴力风险、暧昧模式和下一步沟通建议。",
  path: "/",
  keywords: [
    "AI relationship analysis",
    "AI chat analysis",
    "relationship chat analyzer",
    "love compatibility",
    "text message analysis",
    "dating advice",
    "恋爱聊天记录分析",
    "AI 恋爱分析",
    "聊天记录分析",
    "恋爱雷达",
  ],
  languages: {
    "zh-CN": "/",
    "en-US": "/en",
  },
});

const heroBubbles: HeroBubble[] = [
  { text: "哈哈再说吧", kind: "in", position: "left-[-2%] top-[14%]", delay: 0 },
  { text: "那周六见？", kind: "out", position: "right-[0%] top-[30%]", delay: 1200 },
  { text: "检测到拉扯信号", kind: "signal", position: "left-[2%] bottom-[22%]", delay: 600 },
  { text: "投入度：偏低", kind: "signal", position: "right-[4%] bottom-[8%]", delay: 1800 },
];

const signalCards: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  { icon: Activity, title: "关系状态", desc: "暧昧、热恋，还是在降温" },
  { icon: HeartPulse, title: "情绪信号", desc: "投入度、敷衍和忽冷忽热" },
  { icon: MessagesSquare, title: "沟通模式", desc: "谁主动、谁回避、谁在拉扯" },
  { icon: Signpost, title: "下一步建议", desc: "该怎么回，要不要继续" },
];

const delay = (ms: number) => ({ "--lr-delay": `${ms}ms` }) as CSSProperties;

export default async function Home() {
  const user = await getCurrentUser();
  const accountHref = user ? "/me" : "/login?redirect=/me";
  const accountLabel = user ? "我的" : "登录";
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
            <span className="truncate">恋爱雷达</span>
          </div>
          <Link
            href={accountHref}
            prefetch={false}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-white"
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
              AI 聊天记录分析
            </div>
            <h1 className="lr-reveal mt-5" style={delay(80)}>
              <span className="block text-6xl font-semibold leading-[0.96] tracking-normal sm:text-7xl md:text-8xl">
                恋爱<span className="lr-text-glow">雷达</span>
              </span>
              <span className="mt-2 block text-sm font-medium uppercase tracking-[0.32em] text-white/45">Love Radar</span>
              <span className="mt-4 block text-balance text-2xl font-semibold leading-tight text-white/90 sm:text-3xl">
                看懂聊天里的关系信号
              </span>
            </h1>
            <p className="lr-reveal mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8" style={delay(160)}>
              粘贴聊天记录或上传截图，AI 帮你看清对方的投入度、暧昧信号和沟通模式。
            </p>
            <div className="lr-reveal mt-8" style={delay(240)}>
              <Link href="/analyze" prefetch={false}>
                <Button size="lg" className="lr-breathe w-full sm:w-auto">
                  开始分析我的聊天记录
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="lr-reveal mt-5 flex items-center gap-2 text-xs text-muted-foreground" style={delay(320)}>
              <ShieldCheck className="h-4 w-4 text-accent" />
              不保存聊天原文
            </p>
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
    </main>
  );
}
