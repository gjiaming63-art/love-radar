"use client";

import Link from "next/link";
import { ArrowLeft, LockKeyhole, Radar, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LoveReport } from "@/types/report";

export function EnglishReportView({ report }: { report: LoveReport & { id: string } }) {
  const [message, setMessage] = useState("");
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
      <section className="rounded-[28px] border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/10 p-5"><LockKeyhole className="h-5 w-5 text-primary" /><h2 className="mt-3 text-xl font-semibold">Premium analysis coming soon</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Unlock hidden signals, deeper behavior patterns, relationship outlook, and smart reply suggestions when premium becomes available.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><Button type="button" onClick={interest}>Get notified</Button><Link href={`/en/login?redirect=/en/report/${report.id}`} prefetch={false}><Button type="button" variant="secondary">Sign in to save</Button></Link></div>{message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}</section>
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>AI-generated for entertainment and communication reference only.</span><Share2 className="h-4 w-4" /></div>
    </div></main>
  );
}
