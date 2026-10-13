"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, LockKeyhole, Radar, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  return (
    <main className="min-h-svh px-4 py-5 text-white"><div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="flex items-center justify-between"><Link href="/en" prefetch={false} className="inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Love Radar AI</Link><Link href="/en/me" prefetch={false} className="text-sm text-primary">My account</Link></div>
      <section className="rounded-[28px] border border-primary/25 bg-primary/10 p-5"><div className="flex items-center gap-2 text-primary"><Radar className="h-5 w-5" /><span className="text-xs uppercase tracking-[0.2em]">Love Radar report</span></div><div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">Overall score</p><p className="mt-1 font-mono text-6xl font-semibold text-white">{report.overallScore}</p></div><div className="text-right"><p className="text-sm text-muted-foreground">{report.riskLevel}</p><p className="mt-1 text-sm text-primary">{report.relationshipStage}</p></div></div><p className="mt-5 text-base leading-7 text-white">{report.summary}</p><div className="mt-4 flex flex-wrap gap-2">{report.riskTags.slice(0, 5).map((tag) => <span key={tag} className="rounded-full border border-primary/30 bg-black/20 px-3 py-1 text-xs text-primary">{tag}</span>)}</div></section>
      <section className="grid gap-3 sm:grid-cols-2">{Object.entries(report.scores).map(([key,value]) => <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs capitalize text-muted-foreground">{key.replace(/([A-Z])/g," $1")}</p><p className="mt-2 text-3xl font-semibold text-white">{value}</p></div>)}</section>
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><h2 className="text-xl font-semibold">Behavior summary</h2><p className="mt-3 leading-7 text-muted-foreground">{report.behaviorPattern}</p><h3 className="mt-6 text-sm font-semibold text-primary">Red flags</h3><div className="mt-3 space-y-3">{report.redFlags.map((item,index)=><div key={`${item.quote}-${index}`} className="rounded-2xl border border-red-300/15 bg-red-400/5 p-4"><p className="text-white">“{item.quote}”</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.reason}</p></div>)}</div><h3 className="mt-6 text-sm font-semibold text-accent">Green flags</h3><div className="mt-3 space-y-3">{report.greenFlags.map((item,index)=><div key={`${item.quote}-${index}`} className="rounded-2xl border border-accent/15 bg-accent/5 p-4"><p className="text-white">“{item.quote}”</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.reason}</p></div>)}</div></section>
      {report.isPaid ? (
        <section className="rounded-[28px] border border-accent/30 bg-accent/5 p-5">
          <div className="flex items-center gap-2 text-accent"><CheckCircle2 className="h-5 w-5" /><span className="text-xs uppercase tracking-[0.2em]">Full report unlocked</span></div>
          <h2 className="mt-3 text-xl font-semibold">Your game plan</h2>
          <p className="mt-2 leading-7 text-muted-foreground">{report.actionPlan.strategy}</p>
          {report.actionPlan.nextReplies.length ? <><h3 className="mt-6 text-sm font-semibold text-primary">What to text next</h3><div className="mt-3 space-y-3">{report.actionPlan.nextReplies.map((item, index) => <div key={`${item.style}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-muted-foreground">{item.style}</p><p className="mt-1 text-white">{item.text}</p></div>)}</div></> : null}
          {report.replyExamples.length ? <><h3 className="mt-6 text-sm font-semibold text-primary">More reply ideas</h3><ul className="mt-3 space-y-2">{report.replyExamples.map((text, index) => <li key={index} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white">{text}</li>)}</ul></> : null}
          {report.actionPlan.ifThen.length ? <><h3 className="mt-6 text-sm font-semibold text-primary">If they… then you…</h3><div className="mt-3 space-y-3">{report.actionPlan.ifThen.map((item, index) => <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-sm text-white">{item.scenario}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.advice}</p></div>)}</div></> : null}
          {report.actionPlan.dontDo.length ? <><h3 className="mt-6 text-sm font-semibold text-red-300">Don&apos;t do this</h3><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{report.actionPlan.dontDo.map((text, index) => <li key={index}>{text}</li>)}</ul></> : null}
          {report.suggestions.length ? <><h3 className="mt-6 text-sm font-semibold text-accent">Advice</h3><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{report.suggestions.map((text, index) => <li key={index}>{text}</li>)}</ul></> : null}
        </section>
      ) : waitingForPayment ? (
        <section className="rounded-[28px] border border-primary/30 bg-primary/10 p-5">
          <h2 className="text-xl font-semibold">Confirming your payment…</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">This usually takes a few seconds. The full report will appear here automatically.</p>
        </section>
      ) : (
        <section className="rounded-[28px] border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/10 p-5">
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
          {checkoutEnabled ? <p className="mt-3 text-xs text-muted-foreground">One-time payment. No subscription. Secure checkout by Lemon Squeezy.</p> : null}
          {returnedFromPayment && !report.isPaid ? <p className="mt-3 text-sm text-accent">Paid but still locked? Refresh in a minute, or contact us with your order email.</p> : null}
          {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
        </section>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>AI-generated for entertainment and communication reference only.</span><Share2 className="h-4 w-4" /></div>
    </div></main>
  );
}
