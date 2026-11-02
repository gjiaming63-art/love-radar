"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Footprints, Loader2, LockKeyhole, ShieldCheck, TrendingUp } from "lucide-react";
import { ReportActions } from "@/components/radar/report-actions";
import { SaveReportButton } from "@/components/radar/save-report-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AnchorNav,
  DetailFold,
  EvidenceBubble,
  NextStepGrid,
  SectionHeading,
  VerdictHero,
} from "@/components/radar/report-visuals";
import { getReportInsight } from "@/lib/report-insights";
import type { LoveReport } from "@/types/report";
import { scoreLabels } from "@/types/report";

type ReportWithId = LoveReport & { id: string };

/**
 * 中文报告页：结论 → 信号 → 证据 → 下一步 → 兑换码解锁 → 完整内容。
 * 付费墙始终开启；免费版的数据已在服务器端裁剪（见 redactReport）。
 */
export function ReportView({ initialReport }: { initialReport: ReportWithId }) {
  const [report, setReport] = useState<ReportWithId>(initialReport);
  const unlocked = Boolean(report.isPaid);
  const insight = getReportInsight(report);
  const plan = report.actionPlan;
  // 关键证据只放第一条红旗 / 绿旗；其余在「完整报告 · 更多证据」里，避免重复。
  const redFlags = report.redFlags.slice(0, 1);
  const greenFlags = report.greenFlags.slice(0, 1);

  useEffect(() => {
    try {
      localStorage.setItem("love-radar-last-report-path", `/report/${initialReport.id}`);
    } catch {
      // storage unavailable
    }
  }, [initialReport.id]);

  return (
    <main className="min-h-svh px-4 pb-10 pt-3">
      <div className="mx-auto w-full max-w-3xl">
        <AnchorNav
          items={[
            { id: "verdict", label: "结论" },
            { id: "signals", label: "信号" },
            { id: "evidence", label: "证据" },
            { id: "next", label: "下一步" },
          ]}
        />
        <Link
          href="/analyze"
          prefetch={false}
          className="mb-4 inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          重新分析
        </Link>

        <div className="space-y-7">
          <VerdictHero
            badges={
              <>
                <Badge className="border-primary/30 bg-primary/10 text-primary">恋爱雷达报告</Badge>
                {unlocked ? <Badge className="border-accent/30 bg-accent/10 text-accent">完整版</Badge> : null}
              </>
            }
            score={report.overallScore}
            scoreLabel="综合评分"
            facts={[
              { label: "关系阶段", value: report.relationshipStage },
              { label: "关系走势", value: report.relationshipTrend.label },
            ]}
            verdict={insight.verdict}
            keywords={report.riskTags.slice(0, 3)}
          />

          <section className="space-y-3">
            <SectionHeading id="signals" eyebrow="Signals" title="关系信号" />
            <ScoreBars report={report} />
          </section>

          <section className="space-y-3">
            <SectionHeading id="evidence" eyebrow="Evidence" title="关键证据" />
            <div className="grid gap-3 sm:grid-cols-2">
              {redFlags.map((item, index) => (
                <EvidenceBubble key={`r-${index}`} tone="risk" title="红旗" quote={item.quote} reason={item.reason} moreLabel="为什么" />
              ))}
              {greenFlags.map((item, index) => (
                <EvidenceBubble key={`g-${index}`} tone="safe" title="绿旗" quote={item.quote} reason={item.reason} moreLabel="为什么" />
              ))}
              {!redFlags.length && !greenFlags.length ? (
                <p className="text-sm text-muted-foreground">这段聊天里暂时没有明显的证据句。</p>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading id="next" eyebrow="Next" title="下一步" />
            <NextStepGrid
              items={[
                {
                  tone: "safe",
                  title: "现在可以做",
                  icon: <Footprints className="h-4 w-4" />,
                  body: plan.strategy || report.suggestions[0] || "先观察对方接下来的实际行动。",
                },
                {
                  tone: "risk",
                  title: "现在不要做",
                  icon: <Ban className="h-4 w-4" />,
                  body: plan.dontDo[0] || "不要连续追问，也不要用试探逼对方表态。",
                },
              ]}
            />
          </section>

          {unlocked ? <FullReport report={report} /> : <RedeemCard reportId={report.id} onUnlocked={setReport} />}

          <div className="grid gap-3 sm:grid-cols-2">
            <SaveReportButton reportId={report.id} />
          </div>

          <p className="text-center text-xs text-muted-foreground">AI 生成，仅供娱乐和沟通参考</p>
        </div>
      </div>
    </main>
  );
}

function ScoreBars({ report }: { report: LoveReport }) {
  return (
    <div className="grid gap-x-6 gap-y-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-2">
      {scoreLabels.map((item) => {
        const value = report.scores[item.key];
        return (
          <div key={item.key}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-semibold tabular-nums text-foreground">{value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10">
              <div
                className={item.highMeansRisk ? "h-1.5 rounded-full bg-primary" : "h-1.5 rounded-full bg-accent"}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RedeemCard({ reportId, onUnlocked }: { reportId: string; onUnlocked: (report: ReportWithId) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function redeem() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), reportId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        report?: ReportWithId;
        error?: string;
      };
      if (!response.ok || !payload.success || !payload.report) throw new Error(payload.error || "兑换失败，请检查兑换码。");
      onUnlocked(payload.report);
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "兑换失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="unlock" className="scroll-mt-16 rounded-[28px] border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/10 p-5">
      <div className="flex items-center gap-2 text-primary">
        <LockKeyhole className="h-5 w-5" />
        <h2 className="text-lg font-semibold text-foreground">解锁完整报告</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        全部证据、完整行为分析、可直接复制的回复话术，以及对方不同反应时怎么办。
      </p>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim() && !loading) void redeem();
        }}
      >
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="输入兑换码"
          autoCapitalize="characters"
          autoComplete="off"
          className="min-h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm tracking-wider text-foreground outline-none transition focus:border-primary/70"
        />
        <Button type="submit" size="lg" className="lr-breathe" disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          兑换
        </Button>
      </form>
      {message ? <p className="mt-2 text-sm text-primary">{message}</p> : null}
      <p className="mt-3 text-xs text-muted-foreground">兑换码可在小红书「恋爱雷达」获取</p>
    </section>
  );
}

function FullReport({ report }: { report: ReportWithId }) {
  const plan = report.actionPlan;
  const confidence = report.confidence;
  const moreEvidence = Math.max(0, report.redFlags.length - 1) + Math.max(0, report.greenFlags.length - 1);

  return (
    <section className="space-y-3">
      <SectionHeading id="details" eyebrow="Full report" title="完整报告" />

      <DetailFold title="行为分析">
        {report.behaviorPattern ? <p className="text-sm leading-7 text-muted-foreground">{report.behaviorPattern}</p> : null}
        {report.summary ? <p className="text-sm leading-7 text-muted-foreground">{report.summary}</p> : null}
      </DetailFold>

      {moreEvidence ? (
      <DetailFold title="更多证据" count={moreEvidence}>
        {report.redFlags.slice(1).map((item, index) => (
          <EvidenceBubble key={`fr-${index}`} tone="risk" title="红旗" quote={item.quote} reason={item.reason} meta={`证据${item.strength || "中"}`} moreLabel="为什么" />
        ))}
        {report.greenFlags.slice(1).map((item, index) => (
          <EvidenceBubble key={`fg-${index}`} tone="safe" title="绿旗" quote={item.quote} reason={item.reason} meta={`证据${item.strength || "中"}`} moreLabel="为什么" />
        ))}
      </DetailFold>
      ) : null}

      <DetailFold title="回复话术" count={plan.nextReplies.length + report.replyExamples.length}>
        {plan.nextReplies.map((reply, index) => (
          <div key={`nr-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-xs font-semibold text-accent">{reply.style}</p>
            <p className="mt-1 text-sm leading-7 text-foreground">“{reply.text}”</p>
          </div>
        ))}
        {report.replyExamples.map((text, index) => (
          <p key={`re-${index}`} className="rounded-2xl border border-accent/25 bg-accent/10 p-3 text-sm leading-7">
            {text}
          </p>
        ))}
      </DetailFold>

      <DetailFold title="应对策略" count={plan.ifThen.length + report.suggestions.length}>
        {plan.ifThen.map((item, index) => (
          <div key={`it-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-sm font-semibold text-foreground">{item.scenario}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.advice}</p>
          </div>
        ))}
        {report.suggestions.map((text, index) => (
          <p key={`sg-${index}`} className="text-sm leading-6 text-muted-foreground">
            · {text}
          </p>
        ))}
        {plan.dontDo.length > 1
          ? plan.dontDo.slice(1).map((text, index) => (
              <p key={`dd-${index}`} className="text-sm leading-6 text-muted-foreground">
                · 不要：{text}
              </p>
            ))
          : null}
      </DetailFold>

      <DetailFold title="可信度">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent">
            <ShieldCheck className="h-3.5 w-3.5" />
            可信度 {confidence.level}
          </span>
          {confidence.messageCount ? (
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-muted-foreground">{confidence.messageCount} 条消息</span>
          ) : null}
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-primary">
            <TrendingUp className="h-3.5 w-3.5" />
            {report.relationshipTrend.label}
          </span>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{confidence.reason}</p>
        {report.relationshipTrend.reason ? (
          <p className="text-sm leading-6 text-muted-foreground">{report.relationshipTrend.reason}</p>
        ) : null}
      </DetailFold>

      <ReportActions report={report} />
    </section>
  );
}
