"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EnglishFunnel } from "@/lib/product-metrics";

const ranges = [1, 7, 30];

export default function AdminFunnelPage() {
  const [password, setPassword] = useState("");
  const [days, setDays] = useState(7);
  const [funnel, setFunnel] = useState<EnglishFunnel | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(nextDays = days) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/funnel?days=${nextDays}`, { headers: { "x-admin-password": password } });
      const payload = (await response.json()) as { funnel?: EnglishFunnel; error?: string };
      if (!response.ok || !payload.funnel) throw new Error(payload.error || "读取失败");
      setFunnel(payload.funnel);
      setDays(nextDays);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }

  const top = funnel?.steps[0]?.count ?? 0;

  return (
    <main className="mx-auto min-h-svh w-full max-w-3xl space-y-6 px-4 py-8 text-white">
      <div>
        <h1 className="text-2xl font-semibold">英文站漏斗</h1>
        <p className="mt-1 text-sm text-muted-foreground">每一步按独立访客计（付款按报告计）。TikTok 链接请带上 ?utm_source=tiktok。</p>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="管理员密码"
          className="min-h-11 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-primary/60"
        />
        <Button type="submit" disabled={loading || !password}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          查看
        </Button>
      </form>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}

      {funnel ? (
        <>
          <div className="flex gap-2">
            {ranges.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => void load(range)}
                className={`rounded-full border px-3 py-1 text-xs ${range === days ? "border-primary/50 bg-primary/15 text-primary" : "border-white/10 text-muted-foreground"}`}
              >
                {range === 1 ? "24 小时" : `${range} 天`}
              </button>
            ))}
          </div>

          <section className="space-y-2">
            {funnel.steps.map((step, index) => {
              const prev = index > 0 ? funnel.steps[index - 1].count : 0;
              const width = top ? Math.max(2, (step.count / top) * 100) : 0;
              return (
                <div key={step.key} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{step.label}</span>
                    <span className="tabular-nums">
                      <span className="font-semibold">{step.count}</span>
                      {index > 0 ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {prev ? `${Math.round((step.count / prev) * 100)}% 来自上一步` : "—"}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/5">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-sm text-muted-foreground">
              估算收入：<span className="font-semibold text-white">${funnel.revenueUsd}</span>（按 $4.99/单，未扣手续费）
            </p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <h2 className="text-sm font-semibold">流量来源</h2>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {funnel.sources.length ? funnel.sources.map((row) => (
                  <li key={row.source} className="flex justify-between gap-3">
                    <span className="truncate">{row.source}</span>
                    <span className="tabular-nums text-white">{row.visitors}</span>
                  </li>
                )) : <li>暂无数据</li>}
              </ul>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <h2 className="text-sm font-semibold">分析失败原因</h2>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {funnel.failures.length ? funnel.failures.map((row) => (
                  <li key={row.source} className="flex justify-between gap-3">
                    <span className="truncate">{row.source}</span>
                    <span className="tabular-nums text-white">{row.count}</span>
                  </li>
                )) : <li>暂无失败</li>}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
