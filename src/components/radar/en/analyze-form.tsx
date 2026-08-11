"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enUS } from "@/lib/i18n/en-US";
import type { AnalysisMode, LoveReport } from "@/types/report";

export function EnglishAnalyzeForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [mode, setMode] = useState<AnalysisMode>("comprehensive");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "reading" | "analyzing">("idle");
  const [error, setError] = useState("");

  async function analyze() {
    setError("");
    if (!text.trim() && !images.length) {
      setError("Add chat text or upload at least one screenshot.");
      return;
    }
    setLoading(true);
    try {
      let chatText = text.trim();
      let parsedMessages: unknown[] | undefined;
      let inputType: "text" | "image" = "text";
      if (images.length) {
        inputType = "image";
        setStage("reading");
        const form = new FormData();
        form.append("locale", "en-US");
        images.forEach((file) => form.append("images", file));
        const response = await fetch("/api/parse-chat-image", { method: "POST", body: form });
        const payload = await response.json();
        if (!response.ok || !payload.parsed) throw new Error(payload.error || "Could not read these screenshots.");
        chatText = payload.parsed.chatText;
        parsedMessages = payload.parsed.messages;
      }
      setStage("analyzing");
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatText, parsedMessages, mode, locale: "en-US", inputType }),
      });
      const payload = (await response.json()) as { report?: LoveReport; error?: string };
      if (!response.ok || !payload.report) throw new Error(payload.error || "Analysis failed. Please try again.");
      const save = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: payload.report, locale: "en-US", inputType }),
      });
      const saved = (await save.json()) as { report?: { id: string }; error?: string };
      if (!save.ok || !saved.report) throw new Error(saved.error || "Could not save the report.");
      void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventName: "english_report_generated", reportId: saved.report.id, locale: "en-US" }) });
      router.push(`/en/report/${saved.report.id}`);
    } catch (cause) {
      setStage("idle");
      setError(cause instanceof Error ? cause.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
      setStage("idle");
    }
  }

  return (
    <section className="space-y-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30">
      <div>
        <div className="flex items-center gap-2 text-primary"><Sparkles className="h-5 w-5" /><span className="text-xs uppercase tracking-[0.22em]">Love Radar AI</span></div>
        <h1 className="mt-3 text-3xl font-semibold text-white">{enUS.analyzeTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{enUS.analyzeHint}</p>
      </div>
      <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-muted-foreground">{enUS.privacy}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => document.getElementById("chat-text")?.focus()} className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-left text-sm text-white">{enUS.textMode}<span className="mt-1 block text-xs text-muted-foreground">Free text analysis: 3/day</span></button>
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-left text-sm text-white"><ImagePlus className="mb-2 h-5 w-5 text-accent" />{enUS.imageMode}<span className="mt-1 block text-xs text-muted-foreground">Free screenshot analysis: 1/day, up to 4 images</span></button>
      </div>
      <textarea id="chat-text" value={text} onChange={(event) => setText(event.target.value)} rows={10} placeholder="Paste the conversation here..." className="min-h-[240px] w-full resize-y rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-white outline-none focus:border-primary/70" />
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(event) => setImages(Array.from(event.target.files ?? []).slice(0, 4))} />
      {images.length ? <p className="text-xs text-muted-foreground">{images.length} screenshot{images.length > 1 ? "s" : ""} selected.</p> : null}
      {stage !== "idle" ? (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/35 bg-primary/10 p-4 text-sm text-white" role="status" aria-live="polite">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-black/25">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="absolute inset-0 animate-ping rounded-full border border-primary/25" />
          </span>
          <span>
            <strong className="block font-medium">{stage === "reading" ? "Reading your screenshots" : "Analyzing the relationship signals"}</strong>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{stage === "reading" ? "Detecting chat bubbles, speakers, and message order..." : "Comparing the conversation patterns and preparing your report..."}</span>
          </span>
        </div>
      ) : null}
      <select value={mode} onChange={(event) => setMode(event.target.value)} className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none">
        <option value="comprehensive">Overall analysis</option><option value="sincerity">How sincere are they?</option><option value="fishing">Are they keeping options open?</option><option value="cold_violence">Could this be silent treatment?</option><option value="worth_investing">Is this worth more investment?</option>
      </select>
      {error ? <p className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm leading-6 text-red-200">{error}</p> : null}
      <Button type="button" size="lg" className="w-full" onClick={analyze} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{loading ? enUS.analyzing : enUS.generate}</Button>
    </section>
  );
}
