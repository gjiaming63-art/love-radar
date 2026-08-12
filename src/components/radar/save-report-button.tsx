"use client";

import Link from "next/link";
import { useState } from "react";
import { BookmarkCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SaveReportButton({ reportId }: { reportId: string }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [message, setMessage] = useState("");

  async function bind() {
    setSaving(true);
    setMessage("");
    setNeedsLogin(false);
    try {
      const response = await fetch(`/api/reports/${reportId}/bind`, { method: "POST" });
      if (response.ok) {
        setSaved(true);
        setMessage("已保存到你的账号。");
        return;
      }
      setNeedsLogin(true);
      setMessage("登录后可以保存这份报告和高级权益，换手机也能找回。");
    } catch {
      setMessage("保存失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-accent/25 bg-accent/10 p-3">
      <Button type="button" size="sm" variant="secondary" onClick={bind} disabled={saving || saved}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookmarkCheck className="h-4 w-4" />}
        {saved ? "已保存" : saving ? "保存中" : "登录并保存"}
      </Button>
      {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
      {needsLogin ? (
        <Link
          href={`/login?redirect=/report/${reportId}`}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          去登录
        </Link>
      ) : null}
    </div>
  );
}
