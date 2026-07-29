"use client";

import { useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginForm({
  redirectTo = "/me",
  title = "手机号登录",
}: {
  redirectTo?: string;
  title?: string;
}) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<"send" | "verify" | "">("");
  const [message, setMessage] = useState("");
  const [devCode, setDevCode] = useState("");

  async function sendCode() {
    setLoading("send");
    setMessage("");
    setDevCode("");
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        devCode?: string;
      };
      if (!response.ok || !payload.success) throw new Error(payload.error || "发送失败");
      setSent(true);
      setDevCode(payload.devCode || "");
      setMessage("验证码已发送，5 分钟内有效。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "验证码发送失败，请稍后再试。");
    } finally {
      setLoading("");
    }
  }

  async function verifyCode() {
    setLoading("verify");
    setMessage("");
    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error || "登录失败");
      window.location.assign(redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败，请稍后再试。");
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">无需密码，验证码登录后可保存报告和高级权益。</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
          inputMode="numeric"
          placeholder="请输入手机号"
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-base text-white outline-none transition focus:border-primary/70"
        />

        {sent ? (
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="请输入 6 位验证码"
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-base text-white outline-none transition focus:border-primary/70"
          />
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={sendCode} disabled={loading !== "" || phone.length !== 11}>
            {loading === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {sent ? "重新发送" : "发送验证码"}
          </Button>
          <Button type="button" variant="secondary" onClick={verifyCode} disabled={loading !== "" || code.length !== 6}>
            {loading === "verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            登录
          </Button>
        </div>
      </div>

      {message ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{message}</p> : null}
      {devCode ? <p className="mt-2 text-xs text-primary">开发环境验证码：{devCode}</p> : null}
    </div>
  );
}
