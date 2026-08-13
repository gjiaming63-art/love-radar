"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Gift, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type AccountReport = {
  id: string;
  summary: string;
  riskLevel: string;
  overallScore: number;
  isPaid: boolean;
  createdAt: string;
  kind?: "chat" | "astrology";
};

export function AccountSummary({
  email,
  displayName,
  screenshotRemaining,
  redeemedCodes,
  reportCount,
  paidReportCount,
  newUserGiftCode,
  newUserGiftClaimed,
  reports,
}: {
  email: string | null;
  displayName: string | null;
  screenshotRemaining: number;
  redeemedCodes: number;
  reportCount: number;
  paidReportCount: number;
  newUserGiftCode: string | null;
  newUserGiftClaimed: boolean;
  reports: AccountReport[];
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [name, setName] = useState(displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [message, setMessage] = useState("");
  const [giftCode, setGiftCode] = useState(newUserGiftCode);
  const [giftClaimed, setGiftClaimed] = useState(newUserGiftClaimed);
  const [claimingGift, setClaimingGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [copiedGift, setCopiedGift] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/");
  }

  async function saveProfile() {
    setSavingName(true);
    setMessage("");
    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || "保存失败");
      setMessage("资料已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后再试。");
    } finally {
      setSavingName(false);
    }
  }

  async function claimGiftCode() {
    setClaimingGift(true);
    setGiftMessage("");
    try {
      const response = await fetch("/api/me/new-user-code", { method: "POST" });
      const payload = (await response.json()) as {
        success?: boolean;
        code?: string;
        alreadyClaimed?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.success || !payload.code) {
        throw new Error(payload.error || "领取失败，请稍后再试。");
      }
      setGiftCode(payload.code);
      setGiftClaimed(true);
      setGiftMessage(payload.alreadyClaimed ? "你已经领取过新人福利码。" : "领取成功，复制后可在高级内容处兑换。");
    } catch (error) {
      setGiftMessage(error instanceof Error ? error.message : "领取失败，请稍后再试。");
    } finally {
      setClaimingGift(false);
    }
  }

  async function copyGiftCode() {
    if (!giftCode) return;
    try {
      await navigator.clipboard.writeText(giftCode);
      setCopiedGift(true);
      setGiftMessage("已复制兑换码。");
      window.setTimeout(() => setCopiedGift(false), 1600);
    } catch {
      setGiftMessage("复制失败，可以手动长按兑换码复制。");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">我的账户</p>
            <h1 className="mt-2 text-xl font-semibold text-white">{name || "Love Radar 用户"}</h1>
            <p className="mt-1 break-all text-xs text-muted-foreground">{email || "邮箱已隐藏"}</p>
          </div>
          <Button type="button" variant="secondary" onClick={logout} disabled={loggingOut}>
            <LogOut className="h-4 w-4" />
            退出
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="报告总数" value={String(reportCount)} />
          <Metric label="高级报告" value={String(paidReportCount)} />
          <Metric label="高级截图次数" value={String(screenshotRemaining)} />
          <Metric label="已兑换权益" value={String(redeemedCodes)} />
        </div>

        <div className="mt-5 border-t border-white/10 pt-5">
          <label className="text-xs text-muted-foreground" htmlFor="display-name">显示昵称</label>
          <div className="mt-2 flex gap-2">
            <input
              id="display-name"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 20))}
              placeholder="给自己取个昵称"
              maxLength={20}
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-primary/70"
            />
            <Button type="button" size="sm" variant="secondary" onClick={saveProfile} disabled={savingName}>
              {savingName ? "保存中" : "保存"}
            </Button>
          </div>
          {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-primary/35 bg-[radial-gradient(circle_at_20%_0%,rgba(255,70,124,0.22),transparent_34%),rgba(255,255,255,0.04)] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/15 text-primary">
            <Gift className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-white">首次登录福利</h2>
              {giftClaimed ? (
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200">
                  已领取
                </span>
              ) : (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary">
                  新人专属
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              每个账号可领取 1 个新人体验包兑换码，可免费解锁各模块深度版各一次，并开启高级截图额度。
            </p>
          </div>
        </div>

        {giftCode ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs text-muted-foreground">你的新人福利码</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="flex-1 rounded-xl border border-primary/30 bg-primary/10 px-3 py-3 font-mono text-lg font-semibold tracking-wide text-primary">
                {giftCode}
              </p>
              <Button type="button" variant="secondary" onClick={copyGiftCode}>
                {copiedGift ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedGift ? "已复制" : "复制"}
              </Button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              这枚码只属于当前账号，使用后不可重复使用。
            </p>
          </div>
        ) : (
          <Button type="button" className="mt-4 w-full" onClick={claimGiftCode} disabled={claimingGift}>
            {claimingGift ? "领取中" : "领取新人福利码"}
          </Button>
        )}

        {giftMessage ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{giftMessage}</p> : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">我的报告</h2>
        </div>
        <div className="mt-4 space-y-3">
          {reports.length ? reports.map((report) => (
            <Link
              key={report.id}
              href={report.kind === "astrology" ? `/astrology/report/${report.id}` : `/report/${report.id}`}
              prefetch={false}
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
              <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(report.createdAt)}</p>
            </Link>
          )) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-muted-foreground">
              还没有保存的报告。生成报告后，可以在报告页绑定到当前账户。
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "numeric", day: "numeric" }).format(new Date(value));
}
