"use client";

import { useState } from "react";
import { ArrowLeft, Check, Copy, Loader2, ReceiptText, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ClaimResponse = {
  success: boolean;
  code?: string;
  alreadyClaimed?: boolean;
  error?: string;
};

export function CodeClaimForm() {
  const [orderNo, setOrderNo] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastReportPath] = useState(() => {
    if (typeof window === "undefined") return "";
    const savedPath = localStorage.getItem("love-radar-last-report-path") || "";
    return savedPath.startsWith("/report/") ? savedPath : "";
  });

  async function claimCode() {
    setLoading(true);
    setMessage("");
    setCopied(false);
    try {
      const response = await fetch("/api/claim-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo, source: "mianbaoduo" }),
      });
      const payload = (await response.json()) as ClaimResponse;
      if (!response.ok || !payload.success || !payload.code) {
        throw new Error(payload.error || "领取失败，请稍后重试。");
      }
      setCode(payload.code);
      setMessage(payload.alreadyClaimed ? "这个订单号已经领取过，下面是原兑换码。" : "领取成功，复制兑换码回报告页解锁。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "领取失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    await navigator.clipboard.writeText(code).catch(() => undefined);
    setCopied(true);
  }

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center gap-2">
        <Badge className="border-primary/30 bg-primary/10 text-primary">面包多购买用户</Badge>
      </div>

      <div className="mt-5 space-y-3">
        <label className="text-sm font-medium text-white" htmlFor="order-no">
          面包多订单号
        </label>
        <div className="flex gap-2">
          <input
            id="order-no"
            value={orderNo}
            onChange={(event) => setOrderNo(event.target.value)}
            placeholder="请输入订单号"
            className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 text-base text-white outline-none transition focus:border-primary/70"
          />
        </div>
        <Button
          type="button"
          onClick={claimCode}
          disabled={loading || orderNo.trim().length < 6}
          className="min-h-12 w-full rounded-2xl text-base"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptText className="h-4 w-4" />}
          领取兑换码
        </Button>
      </div>

      {message ? (
        <p className={`mt-4 text-sm ${code ? "text-emerald-200" : "text-rose-200"}`}>{message}</p>
      ) : null}

      {code ? (
        <div className="mt-5 rounded-3xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-xs text-primary/80">你的兑换码</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="font-mono text-2xl font-semibold tracking-wider text-white">{code}</p>
            <Button type="button" variant="secondary" onClick={copyCode} className="rounded-xl">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
          {lastReportPath ? (
            <Button
              type="button"
              onClick={() => window.location.assign(lastReportPath)}
              className="mt-4 min-h-11 w-full rounded-2xl"
            >
              <ArrowLeft className="h-4 w-4" />
              返回刚才的报告
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.location.assign("/analyze")}
              className="mt-4 min-h-11 w-full rounded-2xl"
            >
              返回恋爱雷达
            </Button>
          )}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
        <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>同一个订单号只能领取一次。订单号仅用于防止重复领取，不保存聊天内容。</p>
        </div>
        <ol className="list-decimal space-y-1 pl-5">
          <li>在面包多完成付款，复制订单号。</li>
          <li>回到这里填写订单号，领取兑换码。</li>
          <li>回到报告页，点击“我已有兑换码”，输入兑换码解锁高级版。</li>
        </ol>
      </div>
    </section>
  );
}
