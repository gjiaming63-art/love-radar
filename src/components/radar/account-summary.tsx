"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type AccountReport = {
  id: string;
  summary: string;
  riskLevel: string;
  overallScore: number;
  isPaid: boolean;
  createdAt: string;
};

export function AccountSummary({
  email,
  screenshotRemaining,
  redeemedCodes,
  reports,
}: {
  email: string | null;
  screenshotRemaining: number;
  redeemedCodes: number;
  reports: AccountReport[];
}) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">当前账号</p>
            <h1 className="mt-2 break-all text-xl font-semibold text-white">{email || "已登录账号"}</h1>
          </div>
          <Button type="button" variant="secondary" onClick={logout} disabled={loggingOut}>
            <LogOut className="h-4 w-4" />
            退出
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="高级截图次数" value={String(screenshotRemaining)} />
          <Metric label="已兑换权益" value={String(redeemedCodes)} />
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">我的报告</h2>
        </div>
        <div className="mt-4 space-y-3">
          {reports.length ? (
            reports.map((report) => (
              <Link
                key={report.id}
                href={`/report/${report.id}`}
                className="block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-primary/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-2xl font-semibold text-primary">{report.overallScore}</p>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">
                    {report.isPaid ? "高级版" : "免费版"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white">{report.riskLevel}</p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{report.summary}</p>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-muted-foreground">
              还没有保存报告。生成报告后，可以在报告页绑定到当前账号。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
