"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SaveReportButton({ reportId }: { reportId: string }) {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json())
      .then((payload) => setLoggedIn(Boolean(payload.user)))
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);

  async function bind() {
    setMessage("");
    const response = await fetch(`/api/reports/${reportId}/bind`, { method: "POST" });
    if (response.ok) {
      setSaved(true);
      setMessage("已保存到我的账号。");
      return;
    }
    setMessage("保存失败，请先登录后再试。");
  }

  if (checking) {
    return (
      <div className="rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
        正在检查登录状态...
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="rounded-md border border-primary/25 bg-primary/10 p-3 text-sm leading-6">
        <p className="text-muted-foreground">登录后可以保存这份报告和高级权益，换手机也能找回。</p>
        <Link
          href={`/login?redirect=/report/${reportId}`}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          手机号登录并保存
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-accent/25 bg-accent/10 p-3">
      <Button type="button" size="sm" variant="secondary" onClick={bind} disabled={saved}>
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Loader2 className="hidden h-4 w-4" />}
        {saved ? "已保存" : "保存到我的账号"}
      </Button>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
