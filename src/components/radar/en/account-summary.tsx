"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReportItem = { id: string; summary: string; overallScore: number; riskLevel: string; createdAt: string; isPaid: boolean; locale?: string };

export function EnglishAccountSummary({ email, displayName, reports }: { email: string | null; displayName: string | null; reports: ReportItem[] }) {
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined); window.location.assign("/en"); }
  const englishReports = reports.filter((report) => report.locale === "en-US");
  return <div className="space-y-5">
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">My account</p><h1 className="mt-2 text-xl font-semibold">{displayName || "Love Radar user"}</h1><p className="mt-1 break-all text-xs text-muted-foreground">{email}</p></div><Button variant="secondary" onClick={logout}><LogOut className="h-4 w-4" />Sign out</Button></div></section>
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><h2 className="text-lg font-semibold">My English reports</h2><div className="mt-4 space-y-3">{englishReports.length ? englishReports.map((report) => <Link key={report.id} href={`/en/report/${report.id}`} className="block rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex items-center justify-between"><span className="font-mono text-3xl text-primary">{report.overallScore}</span><span className="text-xs text-muted-foreground">{report.isPaid ? "Premium" : "Free"}</span></div><p className="mt-2 text-sm">{report.riskLevel}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{report.summary}</p><p className="mt-2 text-[11px] text-muted-foreground">{new Date(report.createdAt).toLocaleDateString("en-US")}</p></Link>) : <p className="text-sm leading-6 text-muted-foreground">No saved English reports yet.</p>}</div></section>
  </div>;
}
