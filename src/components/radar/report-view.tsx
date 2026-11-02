"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, Footprints, Loader2, LockKeyhole, MessageSquareQuote, Share2, ShieldCheck, TrendingUp } from "lucide-react";
import { RadarChart } from "@/components/radar/radar-chart";
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
  SignalGrid,
  VerdictHero,
} from "@/components/radar/report-visuals";
import { getChatSpotlights, getRelationshipMeters, getReportInsight } from "@/lib/report-insights";
import type { LockedCounts } from "@/lib/reports";
import type { LoveReport } from "@/types/report";

type ReportWithId = LoveReport & { id: string };

/**
 * 中文报告页（版式对齐英文站）：结论 → 信号 → 证据 → 下一步 → 兑换码解锁 → 完整内容。
 * 付费墙始终开启；免费版的数据已在服务器端裁剪（见 redactReport）。
 */
export function ReportView({ initialReport, lockedCounts }: { initialReport: ReportWithId; lockedCounts?: LockedCounts }) {
  const [report, setReport] = useState<ReportWithId>(initialReport);
  const unlocked = Boolean(report.isPaid);
  const insight = getReportInsight(report);
  const meters = getRelationshipMeters(report);
  const spotlights = getChatSpotlights(report);
  const plan = report.actionPlan;
  const firstReply = plan.nextReplies[0]?.text || report.replyExamples[0];

  useEffect(() => {
    try {
      localStorage.setItem("love-radar-last-report-path", `/report/${initialReport.id}`);
    } catch {
      // storage unavailable
    }
  }, [initialReport.id]);

  return (
    <main className="min-h-svh px-4 pb-10 pt-3">
      <div className="mx-auto w-full max-w-5xl">
        <AnchorNav
          items={[
            { id: "verdict", label: "结论" },
            { id: "signals", label: "信号" },
            { id: "evidence", label: "证据" },
            { id: "next", label: "下一步" },
          ]}
        />
        <div className="mb-4 flex items-center justify-between">
          <Link href="/analyze" prefetch={false} className="inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            重新分析
          </Link>
          <Link href="/me" prefetch={false} className="min-h-9 py-2 text-sm text-primary">
            我的
          </Link>
        </div>

        <div className="space-y-7">
          <VerdictHero
            badges={
              <>
                <Badge className="border-primary/30 bg-primary/10 text-primary">恋爱雷达报告</Badge>
                <Badge>{report.riskLevel}</Badge>
                {unlocked ? (
                  <Badge className="border-accent/30 bg-accent/10 text-accent">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    完整版
                  </Badge>
                ) : null}
              </>
            }
            score={report.overallScore}
            scoreLabel="综合评分"
            facts={[
              { label: "关系阶段", value: report.relationshipStage },
              { label: "关系类型", value: insight.type },
              { label: "当前走势", value: report.relationshipTrend.label },
            ]}
            verdict={insight.verdict}
            keywords={report.riskTags.slice(0, 5)}
            radar={<RadarChart scores={report.scores} className="max-w-64" />}
          />

          <section className="space-y-3">
            <SectionHeading id="signals" eyebrow="Signals" title="关系信号" />
            <SignalGrid meters={meters} />
            <p className="text-xs text-muted-foreground">分数是 AI 基于这段聊天的估计，仅供娱乐和自我参考，不代表对方的真实想法。</p>
          </section>

          <section className="space-y-3">
            <SectionHeading id="evidence" eyebrow="Evidence" title="聊天里的关键瞬间" />
            <div className="grid gap-3 lg:grid-cols-3">
              {spotlights.map((item) => (
                <EvidenceBubble key={`${item.title}-${item.quote}`} tone={item.tone} title={item.title} quote={item.quote} reason={item.note} moreLabel="为什么" />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading id="next" eyebrow="Next" title="下一步怎么做" />
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
                {
                  tone: "neutral",
                  title: "下一句怎么回",
                  icon: <MessageSquareQuote className="h-4 w-4" />,
                  body:
                    unlocked && firstReply ? (
                      <>“{firstReply}”</>
                    ) : (
                      <a href="#unlock" className="flex items-start gap-2 text-muted-foreground">
                        <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        解锁完整报告，查看为这段聊天写好的回复。
                      </a>
                    ),
                },
              ]}
            />
            {unlocked ? null : <RedeemCard reportId={report.id} onUnlocked={setReport} />}
          </section>

          {unlocked ? (
            <FullReport report={report} />
          ) : (
            <section className="space-y-3">
              <SectionHeading id="details" eyebrow="Full report" title="完整报告里有什么" />
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  "完整行为模式分析",
                  lockedCounts?.redFlags ? `全部 ${lockedCounts.redFlags} 条红旗及原因` : "全部红旗及原因",
                  lockedCounts?.greenFlags ? `全部 ${lockedCounts.greenFlags} 条绿旗及原因` : "全部绿旗及原因",
                  lockedCounts?.suggestions ? `${lockedCounts.suggestions} 条建议和应对策略` : "完整建议和应对策略",
                  lockedCounts?.replies ? `${lockedCounts.replies} 条可直接复制的回复` : "可直接复制的回复话术",
                ].map((item) => (
                  <a
                    key={item}
                    href="#unlock"
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground transition hover:border-primary/40"
                  >
                    <LockKeyhole className="h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <SaveReportButton reportId={report.id} />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>AI 生成，仅供娱乐和沟通参考</span>
            <Share2 className="h-4 w-4" />
          </div>
        </div>
      </div>
    </main>
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
      <LockKeyhole className="h-5 w-5 text-primary" />
      <h2 className="mt-3 text-xl font-semibold">看看下一句该怎么回</h2>
      <ul className="mt-3 space-y-1 text-sm leading-6 text-muted-foreground">
        <li>• 为这段聊天写好、可直接复制的回复</li>
        <li>• 「如果 TA 这样，你就这样」的应对方案</li>
        <li>• 全部红旗和绿旗，不只是最明显的那条</li>
        <li>• 最容易把对方推远的几个错误</li>
      </ul>
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

  return (
    <section className="space-y-3">
      <SectionHeading id="details" eyebrow="Full report" title="完整报告" />

      <DetailFold title="行为分析">
        {report.behaviorPattern ? <p className="text-sm leading-7 text-muted-foreground">{report.behaviorPattern}</p> : null}
        {report.summary ? <p className="text-sm leading-7 text-muted-foreground">{report.summary}</p> : null}
      </DetailFold>

      <DetailFold title="全部证据" count={report.redFlags.length + report.greenFlags.length}>
        {report.redFlags.map((item, index) => (
          <EvidenceBubble key={`fr-${index}`} tone="risk" title="红旗" quote={item.quote} reason={item.reason} meta={`证据${item.strength || "中"}`} moreLabel="为什么" />
        ))}
        {report.greenFlags.map((item, index) => (
          <EvidenceBubble key={`fg-${index}`} tone="safe" title="绿旗" quote={item.quote} reason={item.reason} meta={`证据${item.strength || "中"}`} moreLabel="为什么" />
        ))}
      </DetailFold>

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
