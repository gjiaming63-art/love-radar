"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AtSign, KeyRound, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type LoginFormProps = {
  redirectTo?: string;
  title?: string;
  locale?: "zh-CN" | "en-US";
  bindReportId?: string;
};

type ApiPayload = {
  success?: boolean;
  error?: string;
  resendAfter?: number;
};

type EnglishAuthMode = "password" | "code" | "register" | "reset";

export function LoginForm({
  redirectTo = "/me",
  title = "邮箱登录",
  locale = "zh-CN",
  bindReportId,
}: LoginFormProps) {
  if (locale === "en-US") {
    return <EnglishAuthForm redirectTo={redirectTo} title={title} bindReportId={bindReportId} />;
  }
  return <ChineseCodeLoginForm redirectTo={redirectTo} title={title} bindReportId={bindReportId} />;
}

function EnglishAuthForm({
  redirectTo,
  title,
  bindReportId,
}: {
  redirectTo: string;
  title: string;
  bindReportId?: string;
}) {
  const [mode, setMode] = useState<EnglishAuthMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<"error" | "success">("success");

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = password.length >= 8 && password.length <= 128;
  const passwordsMatch = password === confirmPassword;

  function switchMode(nextMode: EnglishAuthMode) {
    setMode(nextMode);
    setCode("");
    setCodeSent(false);
    setCountdown(0);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  function showError(error: unknown, fallback: string) {
    setMessageKind("error");
    setMessage(error instanceof Error ? error.message : fallback);
  }

  function showSuccess(value: string) {
    setMessageKind("success");
    setMessage(value);
  }

  async function post(path: string, body: Record<string, string>) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiPayload;
    if (!response.ok || !payload.success) throw new Error(payload.error || "Something went wrong. Please try again.");
    return payload;
  }

  async function finishSignIn() {
    if (bindReportId) await fetch(`/api/reports/${bindReportId}/bind`, { method: "POST" }).catch(() => undefined);
    window.location.assign(redirectTo);
  }

  async function signInWithPassword() {
    setLoading(true);
    setMessage("");
    try {
      await post("/api/auth/password-login", { email, password });
      await finishSignIn();
    } catch (error) {
      showError(error, "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function sendLoginCode() {
    setLoading(true);
    setMessage("");
    try {
      const payload = await post("/api/auth/send-email-code", { email, locale: "en-US" });
      setCodeSent(true);
      setCountdown(payload.resendAfter ?? 60);
      showSuccess("Code sent. Check your inbox or spam folder. It is valid for 10 minutes.");
    } catch (error) {
      showError(error, "Could not send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithCode() {
    setLoading(true);
    setMessage("");
    try {
      await post("/api/auth/verify-email-code", { email, code, locale: "en-US" });
      await finishSignIn();
    } catch (error) {
      showError(error, "Sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function startRegistration() {
    setLoading(true);
    setMessage("");
    try {
      const payload = await post("/api/auth/password-register", {
        stage: "start",
        email,
        password,
        confirmPassword,
      });
      setCodeSent(true);
      setCountdown(payload.resendAfter ?? 60);
      showSuccess("We sent a verification code to your email. Enter it below to create your account.");
    } catch (error) {
      showError(error, "Could not start registration. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyRegistration() {
    setLoading(true);
    setMessage("");
    try {
      await post("/api/auth/password-register", { stage: "verify", email, code });
      await finishSignIn();
    } catch (error) {
      showError(error, "Could not create the account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function startReset() {
    setLoading(true);
    setMessage("");
    try {
      const payload = await post("/api/auth/password-reset", { stage: "start", email });
      setCodeSent(true);
      setCountdown(payload.resendAfter ?? 60);
      showSuccess("If this email can be used here, a verification code is on its way. Check your inbox or spam folder.");
    } catch (error) {
      showError(error, "Could not send the reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function completeReset() {
    setLoading(true);
    setMessage("");
    try {
      await post("/api/auth/password-reset", {
        stage: "complete",
        email,
        code,
        password,
        confirmPassword,
      });
      await finishSignIn();
    } catch (error) {
      showError(error, "Could not reset the password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "password") return signInWithPassword();
    if (mode === "code") return codeSent ? signInWithCode() : sendLoginCode();
    if (mode === "register") return codeSent ? verifyRegistration() : startRegistration();
    return codeSent ? completeReset() : startReset();
  }

  async function resendCode() {
    if (countdown > 0 || loading) return;
    if (mode === "code") return sendLoginCode();
    if (mode === "register") return startRegistration();
    return startReset();
  }

  const heading =
    mode === "password"
      ? title
      : mode === "code"
        ? "Sign in with a verification code"
        : mode === "register"
          ? "Create your account"
          : "Reset your password";
  const description =
    mode === "password"
      ? "Sign in to save reports and access your Love Radar account."
      : mode === "code"
        ? "We will email you a secure 6-digit sign-in code."
        : mode === "register"
          ? codeSent
            ? "Verify your email to finish creating your account."
            : "Use your email and a password to create an account."
          : codeSent
            ? "Enter the code and choose a new password."
            : "We will send a verification code before you set a new password.";
  const icon = mode === "register" ? <UserPlus className="h-5 w-5" /> : mode === "password" || mode === "reset" ? <KeyRound className="h-5 w-5" /> : <AtSign className="h-5 w-5" />;

  const primaryDisabled =
    loading ||
    !emailValid ||
    (mode === "password" && !password) ||
    (mode === "code" && codeSent && code.length !== 6) ||
    (mode === "register" && (codeSent ? code.length !== 6 : !passwordValid || !passwordsMatch)) ||
    (mode === "reset" && codeSent && (code.length !== 6 || !passwordValid || !passwordsMatch));
  const primaryLabel =
    mode === "password"
      ? "Sign in"
      : mode === "code"
        ? codeSent
          ? "Sign in"
          : "Send code"
        : mode === "register"
          ? codeSent
            ? "Verify & create account"
            : "Create account"
          : codeSent
            ? "Reset password"
            : "Send reset code";

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/35 bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-white">{heading}</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <Field label="Email">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={codeSent}
            className={inputClassName}
          />
        </Field>

        {mode === "password" ? (
          <Field label="Password">
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              maxLength={128}
              className={inputClassName}
            />
          </Field>
        ) : null}

        {mode === "code" && codeSent ? <CodeField code={code} setCode={setCode} /> : null}

        {mode === "register" && !codeSent ? (
          <PasswordSetupFields
            password={password}
            confirmPassword={confirmPassword}
            setPassword={setPassword}
            setConfirmPassword={setConfirmPassword}
          />
        ) : null}

        {mode === "register" && codeSent ? <CodeField code={code} setCode={setCode} /> : null}

        {mode === "reset" && codeSent ? (
          <>
            <CodeField code={code} setCode={setCode} />
            <PasswordSetupFields
              password={password}
              confirmPassword={confirmPassword}
              setPassword={setPassword}
              setConfirmPassword={setConfirmPassword}
            />
          </>
        ) : null}

        <Button type="submit" className="h-12 w-full rounded-2xl" disabled={primaryDisabled}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {primaryLabel}
        </Button>

        {codeSent ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCode("");
                setCountdown(0);
                setMessage("");
                setPassword("");
                setConfirmPassword("");
              }}
              className="text-muted-foreground transition hover:text-white"
            >
              Change email
            </button>
            <button
              type="button"
              onClick={resendCode}
              disabled={loading || countdown > 0}
              className="text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
            </button>
          </div>
        ) : null}
      </form>

      {message ? (
        <p className={`mt-4 text-sm leading-6 ${messageKind === "error" ? "text-red-200" : "text-muted-foreground"}`} aria-live="polite">
          {message}
        </p>
      ) : null}

      <div className="mt-6 border-t border-white/10 pt-5 text-center text-sm">
        {mode === "password" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              <AuthLink onClick={() => switchMode("reset")}>Forgot password?</AuthLink>
              <AuthLink onClick={() => switchMode("code")}>Sign in with verification code</AuthLink>
            </div>
            <p className="text-muted-foreground">
              New to Love Radar? <AuthLink onClick={() => switchMode("register")}>Create account</AuthLink>
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {mode === "register" ? "Already have an account? " : "Prefer your password? "}
            <AuthLink onClick={() => switchMode("password")}>Sign in</AuthLink>
          </p>
        )}
      </div>
    </div>
  );
}

function ChineseCodeLoginForm({
  redirectTo,
  title,
  bindReportId,
}: {
  redirectTo: string;
  title: string;
  bindReportId?: string;
}) {
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
        body: JSON.stringify({ email, locale: "zh-CN" }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.success) throw new Error(payload.error || "验证码发送失败");
      setSent(true);
      setMessage("验证码已发送，请检查收件箱或垃圾邮件文件夹。10 分钟内有效。");
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
      const response = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, locale: "zh-CN" }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.success) throw new Error(payload.error || "登录失败");
      if (bindReportId) await fetch(`/api/reports/${bindReportId}/bind`, { method: "POST" });
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
          <AtSign className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          <p className="mt-1 text-xs text-muted-foreground">无需密码，邮箱验证码登录后可保存报告和高级权益。</p>
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="请输入邮箱地址"
          className={inputClassName}
        />
        {sent ? <CodeField code={code} setCode={setCode} label="验证码" placeholder="请输入 6 位验证码" /> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={sendCode} disabled={loading !== "" || !email.includes("@")}>
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function CodeField({
  code,
  setCode,
  label = "Verification code",
  placeholder = "Enter the 6-digit code",
}: {
  code: string;
  setCode: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <input
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder={placeholder}
        className={inputClassName}
      />
    </Field>
  );
}

function PasswordSetupFields({
  password,
  confirmPassword,
  setPassword,
  setConfirmPassword,
}: {
  password: string;
  confirmPassword: string;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
}) {
  return (
    <>
      <Field label="Password">
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          minLength={8}
          maxLength={128}
          className={inputClassName}
        />
      </Field>
      <Field label="Confirm password">
        <input
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          type="password"
          autoComplete="new-password"
          placeholder="Enter the password again"
          minLength={8}
          maxLength={128}
          className={inputClassName}
        />
      </Field>
      <p className="text-xs leading-5 text-muted-foreground">Use 8–128 characters.</p>
    </>
  );
}

function AuthLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="font-medium text-primary transition hover:text-white">
      {children}
    </button>
  );
}

const inputClassName =
  "min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-base text-white outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/70 disabled:cursor-not-allowed disabled:opacity-65";
