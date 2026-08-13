"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, LockKeyhole, Orbit, ShieldAlert, Sparkles, Stars } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AstrologyReport } from "@/types/astrology";
import { astrologyScoreLabels } from "@/types/astrology";

export function AstrologyReportView({ initialReport }: { initialReport: AstrologyReport & { id: string } }) {
  const [report, setReport] = useState(initialReport);
  const paywallEnabled = Boolean(process.env.NEXT_PUBLIC_MBD_BUY_URL);
  const unlocked = !paywallEnabled || Boolean(report.isPaid);
  const hero = buildAstrologyHero(report);

  useEffect(() => {
    localStorage.setItem("love-radar-last-report-path", `/astrology/report/${initialReport.id}`);
  }, [initialReport.id]);

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-primary/10 blur-3xl" />
      <div className="relative mx-auto w-full max-w-5xl">
        <Link href="/astrology" prefetch={false} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          重新测一次
        </Link>

        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-5">
            <Card className="overflow-hidden border-primary/30 bg-primary/10">
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-primary/30 bg-primary/10 text-primary">恋爱占星师</Badge>
                  <Badge>{report.profileAName} × {report.profileBName}</Badge>
                  {!unlocked ? <Badge className="border-accent/25 bg-accent/10 text-accent">免费版</Badge> : <Badge>高级版</Badge>}
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-normal sm:text-4xl">{hero.title}</h1>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{hero.summary}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <HeroSignal label="最强信号" value={`${hero.strongest.label} ${hero.strongest.score}`} />
                  <HeroSignal label="主要卡点" value={`${hero.blocker.label} ${hero.blocker.score}`} />
                  <HeroSignal label="建议节奏" value={hero.nextStep} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {report.coreTags.map((tag) => (
                    <Badge key={tag} className="border-primary/25 bg-primary/10 text-primary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {report.dataQualityNotice ? (
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm leading-6 text-muted-foreground">
                {report.dataQualityNotice}
              </div>
            ) : null}

            <ScorePanel report={report} />
            <PlanetPanel report={report} />
            {unlocked ? <ShareCard report={report} /> : <AstrologyPaywall report={report} onUnlocked={setReport} />}
          </section>

          <section className="space-y-5">
            <AspectPanel report={report} unlocked={unlocked} />
            <FreeInsight report={report} />
            {unlocked ? <PremiumInsight report={report} /> : <LockedPreview report={report} onUnlocked={setReport} />}
            <div className="flex gap-2 rounded-md border border-border bg-card p-3 text-xs leading-6 text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              西方占星是一种象征性反思工具，并非经过科学验证的预测方法。本报告仅供娱乐、自我观察和关系探索参考。
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function buildAstrologyHero(report: AstrologyReport) {
  const strengths = [
    { label: "综合吸引", score: report.scores.overall },
    { label: "化学反应", score: report.scores.chemistry },
    { label: "情绪连接", score: report.scores.emotional },
    { label: "沟通匹配", score: report.scores.communication },
    { label: "亲密火花", score: report.scores.intimacy },
    { label: "稳定潜力", score: report.scores.stability },
  ].sort((a, b) => b.score - a.score);
  const weakest = strengths.filter((item) => item.label !== "综合吸引").sort((a, b) => a.score - b.score)[0] ?? strengths[0];
  const conflict = { label: "冲突张力", score: report.scores.conflictRisk };
  const blocker = conflict.score >= 55 ? conflict : weakest;
  const strongest = strengths[0];

  const title =
    report.scores.conflictRisk >= 65 && strongest.score >= 60
      ? "有吸引，也有拉扯"
      : report.scores.overall >= 72
        ? "有发展空间，但别急着推进"
        : report.scores.overall >= 58
          ? "有信号，需要慢慢验证"
          : "先观察，不急着下结论";

  const nextStep =
    blocker.label === "冲突张力"
      ? "先稳情绪"
      : blocker.label === "稳定潜力"
        ? "看行动"
        : blocker.label === "沟通匹配"
          ? "先聊清楚"
          : "慢慢确认";

  return {
    title,
    strongest,
    blocker,
    nextStep,
    summary: `最明显的是「${strongest.label}」，卡点在「${blocker.label}」。这份合盘更适合用来判断相处节奏和关系压力，不建议只凭心动直接推进。`,
  };
}

function HeroSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/45 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5">{value}</p>
    </div>
  );
}

function ScorePanel({ report }: { report: AstrologyReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Orbit className="h-5 w-5 text-primary" />
          关系能量分数
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {astrologyScoreLabels.map((item) => (
          <div key={item.key}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono">{report.scores[item.key]}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted">
              <div
                className={item.highMeansRisk ? "h-2.5 rounded-full bg-primary" : "h-2.5 rounded-full bg-accent"}
                style={{ width: `${report.scores[item.key]}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PlanetPanel({ report }: { report: AstrologyReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>核心星体位置</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {[report.chartA, report.chartB].map((chart) => (
          <div key={chart.name} className="rounded-md border border-border bg-background/45 p-3">
            <p className="font-medium">{chart.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{chart.calculationNote}</p>
            <div className="mt-3 grid gap-2">
              {chart.positions.map((position) => (
                <div key={position.planet} className="flex justify-between rounded-md bg-black/20 px-3 py-2 text-sm">
                  <span>{position.label}</span>
                  <span className="text-muted-foreground">
                    {position.sign} {position.degree.toFixed(1)}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AspectPanel({ report, unlocked }: { report: AstrologyReport; unlocked: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stars className="h-5 w-5 text-primary" />
          关键合盘相位
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {report.aspects.length ? (
          report.aspects.map((aspect) => (
            <div key={aspect.id} className="rounded-md border border-border bg-background/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {aspect.personAPlanetLabel} × {aspect.personBPlanetLabel} · {aspect.typeLabel}
                </p>
                <Badge className="border-primary/25 bg-primary/10 text-primary">强度 {aspect.strength}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{aspect.title}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{aspect.interpretation}</p>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-border bg-background/45 p-3 text-sm leading-6 text-muted-foreground">
            核心星体之间没有落入首版容许度的强相位，建议把现实互动作为主要判断依据。
          </p>
        )}
        {!unlocked ? (
          <p className="text-xs leading-5 text-muted-foreground">免费版显示最关键的 3 条相位，高级版会展开完整相位证据链。</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FreeInsight({ report }: { report: AstrologyReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI 总体结论</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-7 text-muted-foreground">{report.ai.overallConnection || report.oneLineSummary}</p>
        <div className="rounded-lg border border-accent/35 bg-[linear-gradient(135deg,rgba(33,215,202,0.18),rgba(255,72,112,0.08))] p-4 shadow-[0_0_28px_rgba(33,215,202,0.08)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <p className="text-xs font-semibold text-accent">下一步建议</p>
          </div>
          <p className="mt-3 text-base font-semibold leading-8">{report.basicAdvice}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PremiumInsight({ report }: { report: AstrologyReport }) {
  const sections = [
    ["为什么互相吸引", report.ai.attractionReason],
    ["情绪连接", report.ai.emotionalBond],
    ["沟通模式", report.ai.communicationPattern],
    ["亲密与化学反应", report.ai.chemistryAndIntimacy],
    ["长期潜力", report.ai.longTermPotential],
    ["最大优势", report.ai.biggestStrength],
    ["最大挑战", report.ai.biggestChallenge],
    ["未来关系趋势", report.ai.futureTrend],
    ["关系建议", report.ai.relationshipAdvice],
  ];
  return (
    <div className="space-y-5">
      <Card className="border-accent/30 bg-accent/10">
        <CardHeader>
          <CardTitle>高级深度分析</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sections.map(([title, content]) => (
            content ? (
              <div key={title} className="rounded-md border border-border bg-background/55 p-3">
                <p className="text-xs font-semibold text-accent">{title}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{content}</p>
              </div>
            ) : null
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>可复制沟通话术</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.ai.smartReplies.map((reply) => (
            <p key={reply} className="rounded-md border border-accent/25 bg-accent/10 p-3 text-sm leading-6">
              {reply}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function LockedPreview({
  report,
  onUnlocked,
}: {
  report: AstrologyReport & { id?: string };
  onUnlocked: (report: AstrologyReport & { id: string }) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyhole className="h-5 w-5 text-primary" />
          解锁高级占星深读
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {["完整相位证据链", "深度行为画像", "情感模式分析", "未来关系趋势", "高情商回复模板", "高级分享卡"].map((item) => (
            <div key={item} className="rounded-md border border-border bg-background/45 p-3">
              <p className="text-sm font-medium">{item}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">解锁后查看更完整的关系星图解释。</p>
            </div>
          ))}
        </div>
        {report.id ? <AstrologyPaywall report={report as AstrologyReport & { id: string }} onUnlocked={onUnlocked} /> : null}
      </CardContent>
    </Card>
  );
}

function AstrologyPaywall({
  report,
  onUnlocked,
}: {
  report: AstrologyReport & { id: string };
  onUnlocked: (report: AstrologyReport & { id: string }) => void;
}) {
  const buyUrl = process.env.NEXT_PUBLIC_MBD_BUY_URL || "";
  const [showInput, setShowInput] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function redeem() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/astrology/reports/${report.id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json()) as { success?: boolean; report?: AstrologyReport & { id: string }; error?: string };
      if (!response.ok || !payload.success || !payload.report) throw new Error(payload.error || "兑换失败");
      setMessage("解锁成功：高级占星报告已开启。");
      onUnlocked(payload.report);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "兑换失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/35 bg-primary/10 p-4">
      <p className="text-sm leading-7 text-muted-foreground">
        免费版已经展示核心合盘结果。高级版会补全深度画像、未来趋势、完整相位证据链和可复制沟通话术。
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          onClick={() => {
            if (!buyUrl) {
              setMessage("购买链接暂未配置，请稍后再试。");
              return;
            }
            localStorage.setItem("love-radar-last-report-path", `/astrology/report/${report.id}`);
            window.location.assign(buyUrl);
          }}
        >
          ￥6.9 解锁高级版
        </Button>
        <Button type="button" variant="secondary" onClick={() => setShowInput((value) => !value)}>
          我有兑换码 / 福利码
        </Button>
      </div>
      {showInput ? (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="请输入兑换码"
            className="min-h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <Button type="button" onClick={redeem} disabled={loading || !code.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            兑换并解锁
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-xs leading-5 text-muted-foreground">{message}</p> : null}
    </div>
  );
}

function ShareCard({ report }: { report: AstrologyReport }) {
  return (
    <Card className="overflow-hidden border-primary/30 bg-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          分享卡文案
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-[radial-gradient(circle_at_top_left,rgba(255,72,112,0.22),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full border border-primary/25" />
          <div className="pointer-events-none absolute right-8 top-9 h-2 w-2 rounded-full bg-accent shadow-[0_0_24px_rgba(33,215,202,0.8)]" />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>恋爱占星师</span>
            <span>{report.profileAName} × {report.profileBName}</span>
          </div>
          <p className="mt-5 text-4xl font-serif leading-none text-primary/80">“</p>
          <p className="mt-1 text-xl font-semibold leading-9 tracking-normal text-foreground sm:text-2xl sm:leading-10">
            {report.ai.shareCardText}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {report.coreTags.slice(0, 3).map((tag) => (
              <Badge key={tag} className="border-primary/25 bg-primary/15 text-primary">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-primary/20 pt-3 text-xs text-muted-foreground">
            <span>Love Radar</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
