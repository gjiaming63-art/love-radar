"use client";

import Link from "next/link";
import { ArrowLeft, Ban, CheckCircle2, Footprints, LockKeyhole, MessageSquareQuote, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RadarChart } from "@/components/radar/radar-chart";
import {
  AnchorNav,
  DetailFold,
  EvidenceBubble,
  NextStepGrid,
  SectionHeading,
  SignalGrid,
  VerdictHero,
} from "@/components/radar/report-visuals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getChatSpotlights, getRelationshipMeters, getReportInsight } from "@/lib/report-insights";
import type { LoveReport } from "@/types/report";

export function EnglishReportView({
  report,
  checkoutEnabled = false,
  price = "$4.99",
}: {
  report: LoveReport & { id: string };
  checkoutEnabled?: boolean;
  price?: string;
}) {
  const [message, setMessage] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnedFromPayment = searchParams.get("paid") === "1";
  const [waitingForPayment, setWaitingForPayment] = useState(returnedFromPayment && !report.isPaid);
  const pollCount = useRef(0);

  useEffect(() => {
    if (!returnedFromPayment) return;
    void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventName: "payment_return", reportId: report.id, locale: "en-US" }) }).catch(() => undefined);
    const paymentId = searchParams.get("payment_id");
    if (paymentId && !report.isPaid) {
      void fetch("/api/checkout/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId: report.id, paymentId }) })
        .then((response) => response.json())
        .then((data: { unlocked?: boolean }) => { if (data.unlocked) router.refresh(); })
        .catch(() => undefined);
    }
    // run once per return
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (report.isPaid || !waitingForPayment) return;
    const timer = setInterval(() => {
      pollCount.current += 1;
      if (pollCount.current > 15) { setWaitingForPayment(false); clearInterval(timer); return; }
      router.refresh();
    }, 3000);
    return () => clearInterval(timer);
  }, [report.isPaid, waitingForPayment, router]);

  async function startCheckout() {
    setCheckoutLoading(true);
    setMessage("");
    void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventName: "checkout_click", reportId: report.id, locale: "en-US" }) }).catch(() => undefined);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId: report.id }) });
      const data = (await response.json().catch(() => ({}))) as { url?: string; alreadyPaid?: boolean; error?: string };
      if (data.alreadyPaid) { router.refresh(); return; }
      if (data.url) { window.location.href = data.url; return; }
      setMessage(data.error || "Could not start checkout. Please try again.");
    } catch {
      setMessage("Could not start checkout. Please try again.");
    }
    setCheckoutLoading(false);
  }
  async function interest() {
    const response = await fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventName: "premium_interest", reportId: report.id, locale: "en-US" }) });
    if (response.ok) setMessage("Thanks. We will let you know when premium analysis is available.");
    else setMessage("Sign in first so we can notify you.");
  }
  const insight = getReportInsight(report, "en-US");
  const meters = getRelationshipMeters(report, "en-US");
  const spotlights = getChatSpotlights(report, "en-US");
  const plan = report.actionPlan;
  const firstReply = plan.nextReplies[0]?.text || report.replyExamples[0];
  const lockedNote = (text: string) => (report.isPaid ? null : <p className="text-xs text-muted-foreground">{text}</p>);

  return (
    <main className="min-h-svh px-4 pb-8 pt-3 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <AnchorNav
          items={[
            { id: "verdict", label: "Verdict" },
            { id: "signals", label: "Signals" },
            { id: "evidence", label: "Evidence" },
            { id: "next", label: "Next steps" },
          ]}
        />
        <div className="mb-4 flex items-center justify-between">
          <Link href="/en" prefetch={false} className="inline-flex min-h-9 items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Love Radar AI</Link>
          <Link href="/en/me" prefetch={false} className="min-h-9 py-2 text-sm text-primary">My account</Link>
        </div>

        <div className="space-y-7">
          <VerdictHero
            badges={
              <>
                <Badge className="border-primary/30 bg-primary/10 text-primary">Love Radar report</Badge>
                <Badge>{report.riskLevel}</Badge>
                {report.isPaid ? (
                  <Badge className="border-accent/30 bg-accent/10 text-accent"><CheckCircle2 className="mr-1 h-3 w-3" />Full report</Badge>
                ) : null}
              </>
            }
            score={report.overallScore}
            scoreLabel="Overall score"
            facts={[
              { label: "Stage", value: report.relationshipStage },
              { label: "Type", value: insight.type },
              { label: "Trend", value: report.relationshipTrend.label },
            ]}
            verdict={insight.verdict}
            keywords={report.riskTags.slice(0, 5)}
            radar={
              <RadarChart
                scores={report.scores}
                className="max-w-64"
                labels={{
                  sincerity: "Sincere",
                  avoidance: "Avoidant",
                  coldViolence: "Cold",
                  breadcrumbing: "Breadcrumb",
                  manipulation: "Push-pull",
                  overInvestmentRisk: "Over-invested",
                }}
              />
            }
          />

          <section className="space-y-3">
            <SectionHeading id="signals" eyebrow="Signals" title="Relationship signals" />
            <SignalGrid meters={meters} />
            <p className="text-xs text-muted-foreground">Scores are AI estimates based only on this conversation, for entertainment and self-reflection. They are not facts about the other person.</p>
          </section>

          <section className="space-y-3">
            <SectionHeading id="evidence" eyebrow="Evidence" title="Key moments from the chat" />
            <div className="grid gap-3 lg:grid-cols-3">
              {spotlights.map((item) => (
                <EvidenceBubble key={`${item.title}-${item.quote}`} tone={item.tone} title={item.title} quote={item.quote} reason={item.note} moreLabel="Why" />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionHeading id="next" eyebrow="Next" title="What to do next" />
            <NextStepGrid
              items={[
                {
                  tone: "safe",
                  title: "Do this now",
                  icon: <Footprints className="h-4 w-4" />,
                  body: plan.strategy || report.suggestions[0] || "Watch what they actually do next.",
                },
                {
                  tone: "risk",
                  title: "Don't do this",
                  icon: <Ban className="h-4 w-4" />,
                  body: plan.dontDo[0] || "Don't double-text or push them for an answer right now.",
                },
                {
                  tone: "neutral",
                  title: "What to text back",
                  icon: <MessageSquareQuote className="h-4 w-4" />,
                  body:
                    report.isPaid && firstReply ? (
                      <>&ldquo;{firstReply}&rdquo;</>
                    ) : (
                      <a href="#unlock" className="flex items-start gap-2 text-muted-foreground">
                        <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-primary" />
                        Unlock the full report for word-for-word replies written for this chat.
                      </a>
                    ),
                },
              ]}
            />
            {report.isPaid ? null : waitingForPayment ? (
        <section className="rounded-[28px] border border-primary/30 bg-primary/10 p-5">
          <h2 className="text-xl font-semibold">Confirming your payment…</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">This usually takes a few seconds. The full report will appear here automatically.</p>
        </section>
      ) : (
        <section id="unlock" className="scroll-mt-16 rounded-[28px] border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/10 p-5">
          <LockKeyhole className="h-5 w-5 text-primary" />
          <h2 className="mt-3 text-xl font-semibold">See exactly what to text next</h2>
          <ul className="mt-3 space-y-1 text-sm leading-6 text-muted-foreground">
            <li>• Word-for-word replies written for this conversation</li>
            <li>• &ldquo;If they do X, you do Y&rdquo; game plan</li>
            <li>• Every red flag and green flag, not just the top ones</li>
            <li>• The mistakes that would push them away</li>
          </ul>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {checkoutEnabled ? (
              <Button type="button" onClick={startCheckout} disabled={checkoutLoading}>{checkoutLoading ? "Opening checkout…" : `Unlock full report · ${price}`}</Button>
            ) : (
              <Button type="button" onClick={interest}>Get notified</Button>
            )}
            <Link href={`/en/login?redirect=/en/report/${report.id}`} prefetch={false}><Button type="button" variant="secondary">Sign in to save</Button></Link>
          </div>
          {checkoutEnabled ? <p className="mt-3 text-xs text-muted-foreground">One-time payment. No subscription. Secure checkout.</p> : null}
          {returnedFromPayment && !report.isPaid ? <p className="mt-3 text-sm text-accent">Paid but still locked? Refresh in a minute, or contact us with your order email.</p> : null}
          {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
        </section>
            )}
          </section>

          <section className="space-y-3">
            <SectionHeading id="details" eyebrow="Details" title="Full analysis" />
            <DetailFold title="Full behavior pattern">
              <p className="text-sm leading-7 text-muted-foreground">{report.behaviorPattern}</p>
              <p className="text-sm leading-7 text-muted-foreground">{report.summary}</p>
            </DetailFold>
            <DetailFold title="All red flags" count={report.redFlags.length}>
              {report.redFlags.length ? report.redFlags.map((item, index) => (
                <EvidenceBubble key={`${item.quote}-${index}`} tone="risk" quote={item.quote} reason={item.reason} moreLabel="Why" />
              )) : <p className="text-sm text-muted-foreground">No clear red flags in this chat.</p>}
              {lockedNote("Free report shows the top red flags. Unlock to see all of them.")}
            </DetailFold>
            <DetailFold title="All green flags" count={report.greenFlags.length}>
              {report.greenFlags.length ? report.greenFlags.map((item, index) => (
                <EvidenceBubble key={`${item.quote}-${index}`} tone="safe" quote={item.quote} reason={item.reason} moreLabel="Why" />
              )) : <p className="text-sm text-muted-foreground">No consistent green flags yet.</p>}
              {lockedNote("Free report shows the top green flags. Unlock to see all of them.")}
            </DetailFold>
            <DetailFold title="Full advice" count={report.suggestions.length}>
              {report.suggestions.map((text, index) => <p key={index} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6">{text}</p>)}
              {plan.ifThen.map((item, index) => (
                <div key={index} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-sm text-white">{item.scenario}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.advice}</p>
                </div>
              ))}
              {plan.dontDo.length > 1 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{plan.dontDo.map((text, index) => <li key={index}>{text}</li>)}</ul>
              ) : null}
              {lockedNote("Unlock for the complete if-then game plan.")}
            </DetailFold>
            <DetailFold title="Full reply templates">
              {report.isPaid ? (
                <>
                  {plan.nextReplies.map((item, index) => (
                    <div key={`${item.style}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-xs text-muted-foreground">{item.style}</p>
                      <p className="mt-1 text-sm text-white">{item.text}</p>
                    </div>
                  ))}
                  {report.replyExamples.map((text, index) => <p key={index} className="rounded-xl border border-accent/25 bg-accent/10 p-3 text-sm leading-6">{text}</p>)}
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">Unlock the full report to see reply templates written for this conversation.</p>
              )}
            </DetailFold>
          </section>

          <div className="flex items-center justify-between text-xs text-muted-foreground"><span>AI-generated for entertainment and communication reference only.</span><Share2 className="h-4 w-4" /></div>
        </div>
      </div>
    </main>
  );
}
