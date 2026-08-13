"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Gauge,
  Loader2,
  LockKeyhole,
  MessageCircleWarning,
  MessageSquareQuote,
  Orbit,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AstrologyRadarChart } from "@/components/radar/astrology-radar-chart";
import { RadarChart } from "@/components/radar/radar-chart";
import { ReportActions } from "@/components/radar/report-actions";
import { SaveReportButton } from "@/components/radar/save-report-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getChatSpotlights, getRelationshipMeters, getReportInsight } from "@/lib/report-insights";
import type { ChatSpotlight, RelationshipMeter } from "@/lib/report-insights";
import type { ChatAstrologyLayer } from "@/types/chat-astrology";
import type { LoveReport } from "@/types/report";
import { scoreLabels } from "@/types/report";

export function ReportView({
  initialReport,
  initialAstrologyLayer = null,
}: {
  initialReport: LoveReport & { id: string };
  initialAstrologyLayer?: ChatAstrologyLayer | null;
}) {
  const paywallEnabled = Boolean(process.env.NEXT_PUBLIC_MBD_BUY_URL);
  const [report, setReport] = useState<LoveReport & { id: string }>(initialReport);
  const [astrologyLayer] = useState<ChatAstrologyLayer | null>(initialAstrologyLayer);
  const unlocked = !paywallEnabled || Boolean(report.isPaid);
  const locked = !unlocked;
  const insight = getReportInsight(report);
  const meters = getRelationshipMeters(report);
  const spotlights = getChatSpotlights(report);
  const visibleTags = unlocked ? report.riskTags : report.riskTags.slice(0, 4);

  useEffect(() => {
    localStorage.setItem("love-radar-last-report-path", `/report/${initialReport.id}`);
  }, [initialReport.id]);

  return (
    <main className="min-h-svh px-4 py-5">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/analyze"
          prefetch={false}
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          重新分析
        </Link>

        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-5">
            <Card className="overflow-hidden">
              <CardContent className="relative p-5">
                <div className="signal-grid pointer-events-none absolute inset-0 opacity-40" />
                <div className="relative">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-primary/30 bg-primary/10 text-primary">恋爱雷达报告</Badge>
                    <Badge>{report.riskLevel}</Badge>
                    <Badge>{report.relationshipStage}</Badge>
                    {locked ? <Badge className="border-accent/25 bg-accent/10 text-accent">免费版</Badge> : null}
                  </div>

                  <div className="mt-5 rounded-lg border border-primary/30 bg-primary/10 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border-primary/35 bg-primary/15 text-primary">{insight.type}</Badge>
                      <span className="text-xs text-muted-foreground">{insight.signal}</span>
                    </div>
                    <h1 className="mt-3 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">
                      {insight.title}
                    </h1>
                    <p className="mt-3 text-pretty text-base leading-7 text-foreground">{insight.verdict}</p>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">综合评分</p>
                      <div className="mt-2 font-mono text-7xl font-semibold leading-none text-primary">
                        {report.overallScore}
                      </div>
                    </div>
                    <RadarChart scores={report.scores} />
                  </div>
                  <p className="mt-5 text-pretty text-base leading-7 text-muted-foreground">{report.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {visibleTags.map((tag) => (
                      <Badge key={tag} className="border-primary/25 bg-primary/10 text-primary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <TrustAndTrend report={report} />
            <RelationshipMeters meters={meters} />
            <ScoreBreakdown report={report} />
            <SaveReportButton reportId={report.id} />
            {unlocked ? <ReportActions report={report} /> : <PremiumUpgradeCard reportId={report.id} onUnlocked={setReport} />}
          </section>

          <section className="space-y-5">
            <ChatAstrologyLayerPanel report={report} layer={astrologyLayer} unlocked={unlocked} />
            {unlocked ? (
              <>
                <ChatSpotlights spotlights={spotlights} />
                <FullReportContent report={report} />
              </>
            ) : (
              <>
                <ChatSpotlights spotlights={spotlights} />
                <FreeReportContent report={report} />
                <AdvancedLockedPreview reportId={report.id} onUnlocked={setReport} />
              </>
            )}

            <div className="flex gap-2 rounded-md border border-border bg-card p-3 text-xs leading-6 text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              本报告由 AI 生成，仅供娱乐和沟通参考，不构成心理、法律或情感决策建议。
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function PremiumUpgradeCard({
  reportId,
  onUnlocked,
}: {
  reportId: string;
  onUnlocked: (report: LoveReport & { id: string }) => void;
}) {
  return (
    <Card className="border-primary/35 bg-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyhole className="h-5 w-5 text-primary" />
          解锁高级版，继续深挖
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-7 text-muted-foreground">
          免费版已经展示核心判断。高级版会补全完整证据链、深度行为画像、关系发展预测和高情商回复模板，适合你准备下一步沟通前再看一遍。
        </p>
        <UnlockControls reportId={reportId} onUnlocked={onUnlocked} />
      </CardContent>
    </Card>
  );
}

function ChatAstrologyLayerPanel({
  report,
  layer,
  unlocked,
}: {
  report: LoveReport & { id: string };
  layer: ChatAstrologyLayer | null;
  unlocked: boolean;
}) {
  if (!layer) {
    return (
      <Card className="border-primary/30 bg-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Orbit className="h-5 w-5 text-primary" />
            加入星盘辅助解读
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-muted-foreground">
            聊天记录是现实证据，星盘只用于辅助解释关系倾向。加入出生信息后，Love Radar 会交叉验证你们真实聊天里出现的互动模式。
          </p>
          <div className="rounded-md border border-border bg-background/45 p-3 text-xs leading-5 text-muted-foreground">
            现实证据优先 → 星盘倾向辅助 → AI 综合解释
          </div>
          <Link href={`/report/${report.id}/astrology`} prefetch={false}>
            <Button type="button" className="w-full">
              <Orbit className="h-4 w-4" />
              加入星盘辅助解读
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const radarItems = layer.dimensions.map((dimension) => ({
    key: dimension.key,
    label: dimensionShortLabel(dimension.key),
    score: astrologyDimensionScore(dimension, layer),
    risk: dimension.key === "Relationship Risk",
  }));
  const astrologyTakeaway = buildAstrologyTakeaway(layer);

  return (
    <Card className="border-primary/30 bg-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Orbit className="h-5 w-5 text-primary" />
          星盘辅助解读
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-primary/30 bg-background/40 p-4">
          <p className="text-xs text-muted-foreground">星盘与现实吻合度</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="font-mono text-5xl font-semibold leading-none text-primary">{layer.alignmentScore}</span>
            <Badge className="border-primary/25 bg-primary/10 text-primary">{expressionLabel(layer.alignmentLevel)}</Badge>
          </div>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{layer.summary}</p>
        </div>

        <div className="rounded-lg border border-accent/25 bg-accent/10 p-4">
          <p className="text-xs font-medium text-accent">星盘给你的提示</p>
          <h3 className="mt-2 text-lg font-semibold leading-7 text-foreground">{astrologyTakeaway.title}</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{astrologyTakeaway.description}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-border bg-background/45 p-3">
              <p className="text-xs text-muted-foreground">最强信号</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{astrologyTakeaway.strongest.label}</p>
            </div>
            <div className="rounded-md border border-border bg-background/45 p-3">
              <p className="text-xs text-muted-foreground">最大卡点</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{astrologyTakeaway.blocker.label}</p>
            </div>
            <div className="rounded-md border border-border bg-background/45 p-3">
              <p className="text-xs text-muted-foreground">下一步提醒</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{astrologyTakeaway.nextStep}</p>
            </div>
          </div>
        </div>

        <AstrologyRadarChart items={radarItems} />

        <div className="space-y-3">
          {(unlocked ? layer.dimensions : layer.dimensions.slice(0, 2)).map((dimension) => (
            <AstrologyDimension key={dimension.key} dimension={dimension} layer={layer} unlocked={unlocked} />
          ))}
        </div>

        {!unlocked ? (
          <div className="rounded-md border border-primary/25 bg-background/45 p-3 text-xs leading-5 text-muted-foreground">
            免费版显示吻合度和部分维度摘要。解锁高级版后，可查看六维完整的“现实聊天证据 / 星盘关系倾向 / AI 综合结论”。
          </div>
        ) : null}
        <p className="text-xs leading-5 text-muted-foreground">{layer.disclaimer}</p>
      </CardContent>
    </Card>
  );
}

function AstrologyDimension({
  dimension,
  layer,
  unlocked,
}: {
  dimension: ChatAstrologyLayer["dimensions"][number];
  layer: ChatAstrologyLayer;
  unlocked: boolean;
}) {
  const score = astrologyDimensionScore(dimension, layer);
  const scoreTone = dimension.key === "Relationship Risk" ? "text-primary" : "text-accent";
  const reading = dimensionReading(dimension.key, score);

  return (
    <div className="rounded-md border border-border bg-background/55 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{dimensionLabel(dimension.key)}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className={`font-mono text-2xl font-semibold leading-none ${scoreTone}`}>{score}</span>
            <span className="text-xs text-muted-foreground">
              {dimension.key === "Relationship Risk" ? "风险分" : "参考分"}
            </span>
          </div>
        </div>
        <Badge className="border-accent/25 bg-accent/10 text-accent">{expressionLabel(dimension.expressionLevel)}</Badge>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted">
        <div
          className={dimension.key === "Relationship Risk" ? "h-2 rounded-full bg-primary" : "h-2 rounded-full bg-accent"}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="mt-3 rounded-md border border-border bg-background/45 p-3">
        <p className="text-xs font-semibold text-accent">这一项怎么看</p>
        <p className="mt-1 text-sm leading-6 text-foreground">{reading}</p>
      </div>
      <p className="mt-3 text-xs font-semibold text-primary">现实聊天证据</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{dimension.realityEvidence}</p>
      {unlocked ? (
        <>
          <p className="mt-3 text-xs font-semibold text-accent">星盘关系倾向</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{dimension.astrologyPattern}</p>
        </>
      ) : null}
    </div>
  );
}

function astrologyDimensionScore(dimension: ChatAstrologyLayer["dimensions"][number], layer: ChatAstrologyLayer) {
  const scores = layer.astrologySnapshot?.scores;
  const mappedScore =
    dimension.key === "Attraction"
      ? scores?.overall
      : dimension.key === "Emotional Bond"
        ? scores?.emotional
        : dimension.key === "Communication"
          ? scores?.communication
          : dimension.key === "Chemistry"
            ? Math.round(((scores?.chemistry ?? 0) + (scores?.intimacy ?? 0)) / 2)
            : dimension.key === "Stability"
              ? scores?.stability
              : scores?.conflictRisk;

  if (typeof mappedScore === "number" && Number.isFinite(mappedScore) && mappedScore > 0) {
    return clampPercent(mappedScore);
  }

  const expressionBase: Record<string, number> = {
    "Strongly Expressed": 82,
    "Partially Expressed": 64,
    "Not Currently Expressed": 42,
  };
  const base = expressionBase[dimension.expressionLevel] ?? 58;
  return clampPercent(Math.round(base * 0.65 + layer.alignmentScore * 0.35));
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildAstrologyTakeaway(layer: ChatAstrologyLayer) {
  const scored = layer.dimensions.map((dimension) => ({
    key: dimension.key,
    label: dimensionLabel(dimension.key),
    score: astrologyDimensionScore(dimension, layer),
  }));
  const positive = scored.filter((item) => item.key !== "Relationship Risk").sort((a, b) => b.score - a.score);
  const risk = scored.find((item) => item.key === "Relationship Risk");
  const stability = scored.find((item) => item.key === "Stability");
  const strongest = positive[0] ?? scored[0];
  const blocker =
    risk && risk.score >= 62
      ? risk
      : stability && stability.score < 58
        ? stability
        : positive.slice().sort((a, b) => a.score - b.score)[0] ?? strongest;

  const title =
    layer.alignmentScore >= 75
      ? "星盘和聊天都在指向同一个关系模式"
      : layer.alignmentScore >= 58
        ? "有吸引，但现实推进还不够稳定"
        : "星盘有倾向，但聊天里还没充分表现出来";

  const description =
    layer.alignmentScore >= 75
      ? `最明显的是「${strongest.label}」，聊天里的互动已经能看到对应信号；但仍要看现实行动是否持续。`
      : layer.alignmentScore >= 58
        ? `最明显的是「${strongest.label}」，卡点在「${blocker.label}」。这说明关系不是没信号，而是还需要现实行动来验证。`
        : `星盘显示有一些潜在关系倾向，但聊天证据还不够强。现在更适合观察对方是否愿意给出明确回应。`;

  const nextStep =
    blocker?.key === "Relationship Risk"
      ? "先降内耗，别用试探换答案"
      : blocker?.key === "Stability"
        ? "看对方有没有稳定行动"
        : "用一次轻沟通确认节奏";

  return { title, description, strongest, blocker, nextStep };
}

function dimensionReading(key: string, score: number) {
  const high = score >= 68;
  const mid = score >= 52;
  const readings: Record<string, [string, string, string]> = {
    Attraction: [
      "好感和吸引比较明显，但仍要看对方是否愿意把感觉变成行动。",
      "有吸引苗头，但不适合仅凭暧昧感判断关系会推进。",
      "吸引信号偏弱，先别把普通友好自动理解成强烈好感。",
    ],
    "Emotional Bond": [
      "情绪上容易互相牵动，也更容易因为一句话想很多。",
      "有一定情绪共振，但安全感还需要稳定互动来建立。",
      "情绪连接暂时不深，不建议过早投入太多期待。",
    ],
    Communication: [
      "你们有机会聊到同频，但关键问题仍需要更直接地说清楚。",
      "聊天能接上，但容易绕开关系定义和具体安排。",
      "沟通频率和理解度偏弱，先别靠猜测补全答案。",
    ],
    Chemistry: [
      "心动和拉扯感都比较强，容易推进，也容易冲动。",
      "有一些化学反应，但热度未必等于稳定投入。",
      "火花感暂时不强，关系更需要现实互动慢慢加温。",
    ],
    Stability: [
      "长期稳定信号不错，可以观察关系是否能落到持续行动上。",
      "稳定性还在中间状态，需要看对方后续是否持续回应。",
      "稳定推进不足，不建议单方面加码投入。",
    ],
    "Relationship Risk": [
      "拉扯和内耗信号偏强，越想确认越容易被情绪带走。",
      "有一些不确定和反复感，适合慢一点验证。",
      "风险感不算高，但仍要以现实沟通和边界为准。",
    ],
  };
  const options = readings[key] ?? readings.Attraction;
  return high ? options[0] : mid ? options[1] : options[2];
}

function dimensionLabel(key: string) {
  const labels: Record<string, string> = {
    Attraction: "金星吸引力",
    "Emotional Bond": "月亮情绪共振",
    Communication: "水星沟通频率",
    Chemistry: "火星化学反应",
    Stability: "土星长期稳定",
    "Relationship Risk": "冥王拉扯指数",
  };
  return labels[key] ?? key;
}

function dimensionShortLabel(key: string) {
  const labels: Record<string, string> = {
    Attraction: "金星吸引",
    "Emotional Bond": "月亮共振",
    Communication: "水星沟通",
    Chemistry: "火星反应",
    Stability: "土星稳定",
    "Relationship Risk": "冥王拉扯",
  };
  return labels[key] ?? key;
}

function expressionLabel(level: string) {
  const labels: Record<string, string> = {
    "Strongly Expressed": "明显表现",
    "Partially Expressed": "部分表现",
    "Not Currently Expressed": "暂未表现",
  };
  return labels[level] ?? level;
}

function AdvancedLockedPreview({
  reportId,
  onUnlocked,
}: {
  reportId: string;
  onUnlocked: (report: LoveReport & { id: string }) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>高级版包含什么</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "完整红旗证据",
            "完整绿旗信号",
            "深度行为画像",
            "情感模式分析",
            "AI 回复模板",
            "关系发展预测",
            "完整行动建议",
            "高级分享卡",
          ].map((item) => (
            <div key={item} className="rounded-md border border-border bg-background/45 p-3">
              <p className="text-sm font-medium">{item}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">解锁后查看更完整的分析与可复制话术。</p>
            </div>
          ))}
        </div>
        <PremiumUpgradeCard reportId={reportId} onUnlocked={onUnlocked} />
      </CardContent>
    </Card>
  );
}

function UnlockControls({
  reportId,
  onUnlocked,
}: {
  reportId: string;
  onUnlocked: (report: LoveReport & { id: string }) => void;
}) {
  const buyUrl = process.env.NEXT_PUBLIC_MBD_BUY_URL || "";
  const [showInput, setShowInput] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function trackPremiumClick() {
    const source = new URLSearchParams(window.location.search).get("utm_source") || document.referrer || "report_page";
    const payload = JSON.stringify({ eventName: "premium_click", reportId, source });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }

  function rememberCurrentReport() {
    localStorage.setItem("love-radar-last-report-path", `/report/${reportId}`);
  }

  async function redeem() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, reportId }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        report?: LoveReport & { id: string };
        error?: string;
      };
      if (!response.ok || !payload.success || !payload.report) throw new Error(payload.error || "兑换失败");
      setMessage("解锁成功：完整报告已开启。");
      onUnlocked(payload.report);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "兑换失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          onClick={() => {
            if (!buyUrl) {
              setMessage("购买链接暂未配置，请稍后再试。");
              return;
            }
            rememberCurrentReport();
            trackPremiumClick();
            window.location.assign(buyUrl);
          }}
        >
          ￥6.9 购买高级体验包
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
            placeholder="请输入兑换码或老用户福利码"
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

function TrustAndTrend({ report }: { report: LoveReport }) {
  const confidence = report.confidence;
  const trend = report.relationshipTrend;
  const confidenceTone =
    confidence.level.includes("高")
      ? "border-accent/35 bg-accent/10 text-accent"
      : confidence.level.includes("低")
        ? "border-primary/35 bg-primary/10 text-primary"
        : "border-border bg-background/45 text-foreground";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            本次分析可信度
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={confidenceTone}>可信度 {confidence.level}</Badge>
            <Badge className="border-border bg-background/60">{confidence.messageCount || "未知"} 条消息</Badge>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">{confidence.reason}</p>
          <div className="rounded-md border border-border bg-background/45 p-3">
            <p className="text-xs font-medium text-foreground">双方发言比例</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{confidence.speakerBalance}</p>
          </div>
          {confidence.limitations.length ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">判断边界</p>
              {confidence.limitations.map((item) => (
                <p key={item} className="text-xs leading-5 text-muted-foreground">
                  · {item}
                </p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/30 bg-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            关系走势
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground">当前趋势</p>
            <p className="mt-2 text-4xl font-semibold tracking-normal text-primary">{trend.label}</p>
          </div>
          <p className="text-sm leading-7 text-muted-foreground">{trend.reason}</p>
          <div className="rounded-md border border-primary/25 bg-background/35 p-3 text-xs leading-5 text-muted-foreground">
            走势不是定论，更像当前聊天里的关系温度计。真正要看的，是后续有没有稳定行动。
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActionPlanCard({ report }: { report: LoveReport }) {
  const plan = report.actionPlan;

  return (
    <Card className="border-accent/30 bg-accent/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareQuote className="h-5 w-5 text-accent" />
          下一句话怎么回
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-accent/25 bg-background/45 p-3">
          <p className="text-xs font-medium text-muted-foreground">建议策略</p>
          <p className="mt-2 text-sm leading-7 text-foreground">{plan.strategy}</p>
        </div>

        <div className="grid gap-3">
          {plan.nextReplies.map((reply) => (
            <div key={`${reply.style}-${reply.text}`} className="rounded-md border border-border bg-background/55 p-3">
              <p className="text-xs font-semibold text-accent">{reply.style}</p>
              <p className="mt-2 text-sm leading-7 text-foreground">“{reply.text}”</p>
            </div>
          ))}
        </div>

        {plan.ifThen.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">对方不同反应时</p>
            {plan.ifThen.map((item) => (
              <div key={`${item.scenario}-${item.advice}`} className="rounded-md border border-border bg-background/45 p-3">
                <p className="text-xs font-semibold text-foreground">{item.scenario}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.advice}</p>
              </div>
            ))}
          </div>
        ) : null}

        {plan.dontDo.length ? (
          <div className="rounded-md border border-primary/25 bg-primary/10 p-3">
            <p className="text-xs font-medium text-primary">不建议这样做</p>
            <div className="mt-2 space-y-1">
              {plan.dontDo.map((item) => (
                <p key={item} className="text-xs leading-5 text-muted-foreground">
                  · {item}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FreeReportContent({ report }: { report: LoveReport }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            行为模式总结
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-7">
          <p className="text-muted-foreground">{report.behaviorPattern}</p>
          <div className="rounded-md border border-primary/25 bg-primary/10 p-3 text-xs leading-5 text-muted-foreground">
            高级版会继续拆解对方的互动惯性、投入方式和关系推进阻力。
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleWarning className="h-5 w-5 text-primary" />
            红旗证据摘录
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.redFlags.length ? (
            report.redFlags.map((item) => (
              <EvidenceBlock
                key={`${item.quote}-${item.reason}`}
                quote={item.quote}
                reason={item.reason}
                strength={item.strength}
              />
            ))
          ) : (
            <p className="rounded-md border border-border bg-background/45 p-3 text-sm leading-6 text-muted-foreground">
              这段记录里暂时没有明显红旗证据，建议结合更多上下文继续观察。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>绿旗信号摘录</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.greenFlags.length ? (
            report.greenFlags.map((item) => (
              <EvidenceBlock
                key={`${item.quote}-${item.reason}`}
                quote={item.quote}
                reason={item.reason}
                strength={item.strength}
              />
            ))
          ) : (
            <p className="rounded-md border border-border bg-background/45 p-3 text-sm leading-6 text-muted-foreground">
              暂时没有稳定的正向信号，高级版会结合完整证据链继续判断。
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 总体结论与部分建议</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-accent/25 bg-accent/10 p-3">
            <p className="text-xs font-medium text-muted-foreground">当前策略</p>
            <p className="mt-2 text-sm leading-7 text-foreground">{report.actionPlan.strategy}</p>
          </div>
          <div className="space-y-2">
            {report.suggestions.map((suggestion) => (
              <p key={suggestion} className="rounded-md border border-border bg-background/50 p-3 text-sm leading-6">
                {suggestion}
              </p>
            ))}
          </div>
          <div className="rounded-md border border-primary/25 bg-primary/10 p-3 text-xs leading-5 text-muted-foreground">
            高级版会补全可直接复制的回复模板、不同回应下的应对方案，以及更完整的行动边界。
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function FullReportContent({ report }: { report: LoveReport }) {
  return (
    <>
      <ActionPlanCard report={report} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            行为模式
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-7">
          <p className="text-muted-foreground">{report.behaviorPattern}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircleWarning className="h-5 w-5 text-primary" />
            红旗证据
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.redFlags.map((item) => (
            <EvidenceBlock
              key={`${item.quote}-${item.reason}`}
              quote={item.quote}
              reason={item.reason}
              strength={item.strength}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>绿旗信号</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.greenFlags.map((item) => (
            <EvidenceBlock
              key={`${item.quote}-${item.reason}`}
              quote={item.quote}
              reason={item.reason}
              strength={item.strength}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>行动建议</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {report.suggestions.map((suggestion) => (
              <p key={suggestion} className="rounded-md border border-border bg-background/50 p-3 text-sm leading-6">
                {suggestion}
              </p>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">可参考回复</p>
            {report.replyExamples.map((script) => (
              <p key={script} className="rounded-md border border-accent/25 bg-accent/10 p-3 text-sm leading-6">
                {script}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function ScoreBreakdown({ report }: { report: LoveReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>指数拆解</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {scoreLabels.map((item) => (
          <div key={item.key}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono">{report.scores[item.key]}</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={item.highMeansRisk ? "h-2 rounded-full bg-primary" : "h-2 rounded-full bg-accent"}
                style={{ width: `${report.scores[item.key]}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RelationshipMeters({ meters }: { meters: RelationshipMeter[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          关系进度条
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {meters.map((meter) => (
          <div key={meter.label} className="rounded-md border border-border bg-background/45 p-3">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{meter.label}</span>
              <span className="font-mono text-primary">{meter.value}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted">
              <div
                className={
                  meter.tone === "safe"
                    ? "h-2.5 rounded-full bg-accent"
                    : meter.tone === "risk"
                      ? "h-2.5 rounded-full bg-primary"
                      : "h-2.5 rounded-full bg-muted-foreground"
                }
                style={{ width: `${meter.value}%` }}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{meter.caption}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChatSpotlights({ spotlights }: { spotlights: ChatSpotlight[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareQuote className="h-5 w-5 text-primary" />
          聊天名场面
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {spotlights.map((item) => (
          <div
            key={`${item.title}-${item.quote}`}
            className={
              item.tone === "risk"
                ? "rounded-md border border-primary/30 bg-primary/10 p-3"
                : item.tone === "safe"
                  ? "rounded-md border border-accent/30 bg-accent/10 p-3"
                  : "rounded-md border border-border bg-background/45 p-3"
            }
          >
            <p className="text-xs font-medium text-muted-foreground">{item.title}</p>
            <p className="mt-2 text-base font-semibold leading-7 text-foreground">“{item.quote}”</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EvidenceBlock({ quote, reason, strength }: { quote: string; reason: string; strength?: string }) {
  const label = strength || "中";
  const tone =
    label.includes("强")
      ? "border-primary/35 bg-primary/10 text-primary"
      : label.includes("弱")
        ? "border-border bg-background/60 text-muted-foreground"
        : "border-accent/30 bg-accent/10 text-accent";

  return (
    <div className="rounded-md border border-border bg-background/45 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">“{quote}”</p>
        <Badge className={tone}>证据{label}</Badge>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{reason}</p>
    </div>
  );
}
