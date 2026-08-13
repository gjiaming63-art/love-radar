import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  LogIn,
  MessageSquareText,
  Orbit,
  Radar,
  ShieldCheck,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

const chips = ["渣感指数", "上头指数", "养鱼概率", "冷暴力信号", "真诚度扫描"];

const featureLinks: Array<{
  href: string;
  title: string;
  desc: string;
  badge: string;
  icon: LucideIcon;
  primary?: boolean;
}> = [
  {
    href: "/analyze",
    title: "聊天记录分析",
    desc: "上传文字或截图，识别敷衍、冷暴力、养鱼和情绪拉扯。",
    badge: "主功能",
    icon: MessageSquareText,
    primary: true,
  },
  {
    href: "/personality",
    title: "恋爱人格测试",
    desc: "10 道题测出你的恋爱类型和代表角色，适合发朋友圈。",
    badge: "趣味测试",
    icon: BrainCircuit,
  },
  {
    href: "/astrology",
    title: "恋爱占星师",
    desc: "输入出生信息，看看你们的关系星图和吸引模式。",
    badge: "新功能",
    icon: Orbit,
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  const accountHref = user ? "/me" : "/login?redirect=/me";
  const accountLabel = user ? "我的" : "登录";
  const AccountIcon = user ? UserRound : LogIn;

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5 sm:px-6">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-primary/10 blur-3xl" />

      <section className="relative mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-3 pr-24 sm:pr-0">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
              <Radar className="h-4 w-4" />
            </span>
            <span className="truncate">Love Radar</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge className="hidden sm:inline-flex">娱乐分析</Badge>
          </div>
        </header>

        <div className="grid flex-1 gap-8 pb-6 pt-10 lg:grid-cols-[0.96fr_1.04fr] lg:items-center lg:pt-14">
          <div className="space-y-8">
            <div className="flex flex-wrap gap-2">
              {chips.slice(0, 3).map((chip) => (
                <Badge key={chip} className="border-primary/25 bg-primary/10 text-primary">
                  {chip}
                </Badge>
              ))}
            </div>

            <div>
              <h1 className="text-balance text-5xl font-semibold leading-[0.96] tracking-normal sm:text-6xl md:text-7xl">
                恋爱雷达
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
                聊天不会骗人。
                <br />
                让 AI 帮你发现那些被忽略的信号。
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/analyze" prefetch={false} className="sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto">
                    开始分析
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={accountHref} prefetch={false} className="sm:w-auto">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="w-full border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 sm:w-auto"
                  >
                    <AccountIcon className="h-4 w-4" />
                    {accountLabel}
                  </Button>
                </Link>
                <div className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  不保存聊天原文，上传前先打码
                </div>
              </div>

              <Link
                href={accountHref}
                prefetch={false}
                className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-left shadow-[0_0_28px_rgb(244_63_94_/_0.1)] transition hover:border-primary/45 hover:bg-primary/15"
              >
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {user ? "新人福利码已在账户里" : "首次登录赠送兑换码"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {user ? "可在“我的”页面领取或查看，用来免费解锁一次深度版。" : "登录后可领取 1 个福利码，免费体验一次深度版功能。"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:hidden">
              {featureLinks.map((item) => (
                <FeatureCard key={item.href} {...item} compact />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="relative mx-auto aspect-square w-full max-w-sm lg:max-w-md">
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

            <div className="hidden grid-cols-3 gap-3 lg:grid">
              {featureLinks.map((item) => (
                <FeatureCard key={item.href} {...item} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  href,
  title,
  desc,
  badge,
  icon: Icon,
  primary,
  compact,
}: {
  href: string;
  title: string;
  desc: string;
  badge: string;
  icon: LucideIcon;
  primary?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={[
        "group block rounded-lg border p-4 transition",
        primary
          ? "border-primary/35 bg-primary/10 hover:border-primary/60 hover:bg-primary/15"
          : "border-border bg-card/75 hover:border-primary/35 hover:bg-card",
        compact ? "min-h-[132px]" : "min-h-[158px]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-background/70 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <Badge className="shrink-0 border-white/10 bg-white/5 text-muted-foreground">
          {badge}
        </Badge>
      </div>
      <h2 className="mt-4 text-base font-semibold leading-6">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p>
      <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
        进入
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
