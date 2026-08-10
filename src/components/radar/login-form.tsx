"use client";

import { useState } from "react";
import { AtSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginForm({ redirectTo = "/me", title = "邮箱登录", locale = "zh-CN", bindReportId }: { redirectTo?: string; title?: string; locale?: "zh-CN" | "en-US"; bindReportId?: string }) {
  const english = locale === "en-US";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<"send" | "verify" | "">("");
  const [message, setMessage] = useState("");

  async function sendCode() {
    setLoading("send");
    setMessage("");
    try {
      const response = await fetch("/api/auth/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || "验证码发送失败");
      setSent(true);
      setMessage(english ? "Code sent. Check your inbox or spam folder. It is valid for 10 minutes." : "验证码已发送，请检查收件箱或垃圾邮件文件夹。10 分钟内有效。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : english ? "Could not send the code. Please try again." : "验证码发送失败，请稍后再试。");
    } finally {
      setLoading("");
    }
  }

  async function verifyCode() {
    setLoading("verify");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || (english ? "Sign-in failed" : "登录失败"));
      if (bindReportId) await fetch(`/api/reports/${bindReportId}/bind`, { method: "POST" });
      window.location.assign(redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : english ? "Sign-in failed. Please try again." : "登录失败，请稍后再试。");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary">
          <AtSign className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">{english ? "No password needed. Save reports and access your account with an email code." : "无需密码，邮箱验证码登录后可保存报告和高级权益。"}</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={english ? "Enter your email" : "请输入邮箱地址"}
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-base text-white outline-none transition focus:border-primary/70"
        />
        {sent ? (
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={english ? "Enter the 6-digit code" : "请输入 6 位验证码"}
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-base text-white outline-none transition focus:border-primary/70"
          />
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={sendCode} disabled={loading !== "" || !email.includes("@") }>
            {loading === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {sent ? (english ? "Resend code" : "重新发送") : (english ? "Send code" : "发送验证码")}
          </Button>
          <Button type="button" variant="secondary" onClick={verifyCode} disabled={loading !== "" || code.length !== 6}>
            {loading === "verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {english ? "Sign in" : "登录"}
          </Button>
        </div>
      </div>
      {message ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{message}</p> : null}
    </div>
  );
}
