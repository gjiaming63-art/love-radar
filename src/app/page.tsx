import Link from "next/link";
import { ArrowRight, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const chips = ["渣感指数", "上头指数", "养鱼概率", "冷暴力信号", "真诚度扫描"];

export default function Home() {
  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-6">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-primary/10 blur-3xl" />
      <section className="relative mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-5xl flex-col justify-between">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
              <Radar className="h-4 w-4" />
            </span>
            Love Radar
          </div>
          <div className="flex items-center gap-2">
            <Link href="/me" className="text-sm text-muted-foreground transition hover:text-foreground">
              我的
            </Link>
            <Badge>娱乐分析</Badge>
          </div>
        </header>

        <div className="grid gap-10 pb-8 pt-12 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              {chips.slice(0, 3).map((chip) => (
                <Badge key={chip} className="border-primary/25 bg-primary/10 text-primary">
                  {chip}
                </Badge>
              ))}
            </div>
            <h1 className="text-balance text-6xl font-semibold leading-[0.92] tracking-normal sm:text-7xl md:text-8xl">
              恋爱雷达
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
              聊天不会骗人。
              <br />
              让AI帮你发现那些被忽略的信号。
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/analyze">
                <Button size="lg" className="w-full sm:w-auto">
                  开始分析
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" />
                不保存聊天原文，上传前先打码
              </div>
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-sm">
            <div className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5" />
            <div className="absolute inset-8 rounded-full border border-accent/20" />
            <div className="absolute inset-16 rounded-full border border-white/10" />
            <div className="scan-line absolute left-0 right-0 top-0 h-28 bg-gradient-to-b from-transparent via-primary/25 to-transparent" />
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_32px_rgb(244_63_94)]" />
            {chips.map((chip, index) => (
              <span
                key={chip}
                className="absolute rounded-full border border-white/10 bg-card/85 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
                style={{
                  left: `${18 + ((index * 23) % 58)}%`,
                  top: `${14 + ((index * 17) % 66)}%`,
                }}
              >
                {chip}
              </span>
            ))}
            <div className="absolute bottom-8 left-6 right-6 rounded-lg border border-border bg-card/90 p-4 backdrop-blur">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" />
                今日信号
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                识别敷衍、冷暴力、养鱼、情绪拉扯，并生成适合分享的风险报告。
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
