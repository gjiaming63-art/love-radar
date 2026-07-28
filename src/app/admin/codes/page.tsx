"use client";

import { useState } from "react";
import { Download, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CodeStats = {
  total: number;
  unused: number;
  used: number;
  claimed: number;
  claimable: number;
};

type ProductStats = {
  totalVisitors: number;
  reportCount: number;
  premiumClicks: number;
  premiumClickRate: number;
};

type GeneratedCode = {
  code: string;
  type: string;
  expiresAt: string | null;
};

export default function AdminCodesPage() {
  const [password, setPassword] = useState("");
  const [count, setCount] = useState(100);
  const [type, setType] = useState("single_report");
  const [expiresAt, setExpiresAt] = useState("");
  const [stats, setStats] = useState<CodeStats | null>(null);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [codes, setCodes] = useState<GeneratedCode[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStats() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/codes", {
        headers: { "x-admin-password": password },
      });
      const payload = (await response.json()) as { stats?: CodeStats; productStats?: ProductStats; error?: string };
      if (!response.ok || !payload.stats) throw new Error(payload.error || "读取失败");
      setStats(payload.stats);
      if (payload.productStats) setProductStats(payload.productStats);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取失败");
    } finally {
      setLoading(false);
    }
  }

  async function generateCodes() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, count, type, expiresAt: expiresAt || undefined }),
      });
      const payload = (await response.json()) as {
        codes?: GeneratedCode[];
        stats?: CodeStats;
        productStats?: ProductStats;
        error?: string;
      };
      if (!response.ok || !payload.codes || !payload.stats) throw new Error(payload.error || "生成失败");
      setCodes(payload.codes);
      setStats(payload.stats);
      if (payload.productStats) setProductStats(payload.productStats);
      setMessage(`已生成 ${payload.codes.length} 个兑换码。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成失败");
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/codes?format=csv", {
        headers: { "x-admin-password": password },
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "导出失败");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "love-radar-unlock-codes.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导出失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-svh px-4 py-6">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <div>
          <Badge className="border-primary/30 bg-primary/10 text-primary">Admin</Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">兑换码管理</h1>
          <p className="mt-2 text-sm text-muted-foreground">
          临时后台，用于生成面包多发货兑换码、导出未使用 CSV，并观察高级版点击转化。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>管理员验证</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="请输入 ADMIN_PASSWORD"
              className="min-h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <Button type="button" onClick={loadStats} disabled={loading || !password}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              查看统计
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-5">
          <StatCard label="兑换码总数" value={stats?.total ?? 0} />
          <StatCard label="未使用" value={stats?.unused ?? 0} />
          <StatCard label="已使用" value={stats?.used ?? 0} />
          <StatCard label="已发放" value={stats?.claimed ?? 0} />
          <StatCard label="可发放" value={stats?.claimable ?? 0} />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="总访客" value={productStats?.totalVisitors ?? 0} />
          <StatCard label="报告生成数" value={productStats?.reportCount ?? 0} />
          <StatCard label="高级版点击数" value={productStats?.premiumClicks ?? 0} />
          <StatCard label="点击率" value={`${productStats?.premiumClickRate ?? 0}%`} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>批量生成</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                value={count}
                onChange={(event) => setCount(Number(event.target.value))}
                type="number"
                min={1}
                max={1000}
                className="min-h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <input
                value={type}
                onChange={(event) => setType(event.target.value)}
                placeholder="single_report"
                className="min-h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <input
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                type="datetime-local"
                className="min-h-11 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" onClick={generateCodes} disabled={loading || !password}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                生成兑换码
              </Button>
              <Button type="button" variant="secondary" onClick={exportCsv} disabled={loading || !password}>
                <Download className="h-4 w-4" />
                导出可发放 CSV
              </Button>
            </div>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>

        {codes.length ? (
          <Card>
            <CardHeader>
              <CardTitle>本次生成</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background/60 p-3 text-xs leading-6">
                {codes.map((item) => `${item.code},${item.type},${item.expiresAt ?? ""}`).join("\n")}
              </pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-2 font-mono text-3xl font-semibold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}
