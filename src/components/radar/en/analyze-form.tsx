"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { ImagePlus, Loader2, Send, Sparkles, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enUS } from "@/lib/i18n/en-US";
import { parseWechatTranscript } from "@/lib/chat-text-parser";
import type { AnalysisMode, LoveReport, ParsedChatImageMessage, RoleContext } from "@/types/report";

export function EnglishAnalyzeForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [mode, setMode] = useState<AnalysisMode>("comprehensive");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "reading" | "analyzing">("idle");
  const [error, setError] = useState("");
  const [parsedMessages, setParsedMessages] = useState<ParsedChatImageMessage[] | null>(null);
  const parsedTranscript = parseWechatTranscript(text);
  const speakers = parsedTranscript.speakers;
  const [speakerChoice, setSpeakerChoice] = useState<{ selfName: string; targetName: string } | null>(null);
  const activeSpeakerChoice = speakerChoice && speakers.includes(speakerChoice.selfName) && speakers.includes(speakerChoice.targetName)
    ? speakerChoice
    : speakers.length >= 2
      ? { selfName: speakers[0], targetName: speakers[1] }
      : null;

  const isScreenshotConversation = Boolean(parsedMessages?.length);

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedImages = Array.from(event.target.files ?? []).slice(0, 8);
    event.target.value = "";
    if (!selectedImages.length) return;

    setError("");
    setImages(selectedImages);
    setParsedMessages(null);
    setSpeakerChoice(null);
    setStage("reading");

    try {
      const response = await uploadScreenshotsForParsing(selectedImages);
      const payload = await response.json();
      if (!response.ok || !payload.parsed?.chatText) {
        throw new Error(payload.error || "Could not read these screenshots.");
      }

      setText(payload.parsed.chatText);
      setParsedMessages(payload.parsed.messages?.length ? payload.parsed.messages : null);
    } catch (cause) {
      setImages([]);
      setParsedMessages(null);
      const message = cause instanceof Error ? cause.message : "";
      setError(
        /expected pattern|string did not match|pattern/i.test(message)
          ? "Your browser could not prepare this screenshot for upload. Please choose a JPG/PNG screenshot from Photos, or take a fresh screenshot and try again."
          : message || "Could not read these screenshots. Please try again.",
      );
    } finally {
      setStage("idle");
    }
  }

  async function analyze() {
    setError("");
    if (!text.trim() && !images.length) {
      setError("Add chat text or upload at least one screenshot.");
      return;
    }
    setLoading(true);
    try {
      const chatText = text.trim();
      const inputType: "text" | "image" = isScreenshotConversation ? "image" : "text";
      const roleContext: RoleContext = isScreenshotConversation
        ? { participants: ["Me", "Other"], selfName: "Me", targetName: "Other" }
        : {
            participants: speakers,
            selfName: activeSpeakerChoice?.selfName,
            targetName: activeSpeakerChoice?.targetName,
          };
      setStage("analyzing");
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatText,
          parsedMessages,
          mode,
          locale: "en-US",
          inputType,
          roleContext,
        }),
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
      <textarea id="chat-text" value={text} onChange={(event) => { setText(event.target.value); setImages([]); setParsedMessages(null); }} rows={10} placeholder="Paste the conversation here..." className="min-h-[240px] w-full resize-y rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-white outline-none focus:border-primary/70" />
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImageUpload} />
      {images.length ? <p className="text-xs text-muted-foreground">{images.length} screenshot{images.length > 1 ? "s" : ""} selected.</p> : null}
      {isScreenshotConversation ? (
        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-white">
          <div className="flex items-center gap-2 font-medium"><Users className="h-4 w-4 text-accent" />Chat direction recognized</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Right-side bubbles are set as <strong className="text-white">Me</strong>; left-side bubbles are set as <strong className="text-white">Other</strong>. Your report will analyze the other person&apos;s signals toward you.</p>
        </div>
      ) : speakers.length >= 2 ? (
        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-white">
          <div className="mb-3 flex items-center gap-2 font-medium"><Users className="h-4 w-4 text-accent" />Detected two speakers: {speakers[0]} and {speakers[1]}</div>
          <p className="mb-3 text-xs leading-5 text-muted-foreground">Choose whose perspective you want to use for this report.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ selfName: speakers[0], targetName: speakers[1] }, { selfName: speakers[1], targetName: speakers[0] }].map((choice) => {
              const active = activeSpeakerChoice?.selfName === choice.selfName && activeSpeakerChoice?.targetName === choice.targetName;
              return <button key={`${choice.selfName}-${choice.targetName}`} type="button" onClick={() => setSpeakerChoice(choice)} className={`rounded-xl border p-3 text-left text-xs transition ${active ? "border-accent bg-accent/15 text-white" : "border-white/10 bg-black/20 text-muted-foreground hover:bg-white/10"}`}>
                I am <strong>{choice.selfName}</strong><br />Analyze <strong>{choice.targetName}</strong>&apos;s attitude toward me
              </button>;
            })}
          </div>
        </div>
      ) : text.trim().length >= 20 ? (
        <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-muted-foreground">We could not confidently identify two speaker names yet. Keep the original names in lines such as “Alex: ...” and “Jamie: ...” for a clearer analysis.</p>
      ) : null}
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
      <Button type="button" size="lg" className="w-full" onClick={analyze} disabled={loading || stage === "reading"}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{loading ? enUS.analyzing : enUS.generate}</Button>
    </section>
  );
}

async function uploadScreenshotsForParsing(files: File[]) {
  try {
    const images = await Promise.all(files.map((file) => fileToBase64Payload(file)));
    return await fetch("/api/parse-chat-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: "en-US", images }),
    });
  } catch (error) {
    console.warn("Base64 screenshot upload failed, falling back to FormData:", error);
    const form = new FormData();
    form.append("locale", "en-US");
    files.forEach((file) => form.append("images", file));
    return fetch("/api/parse-chat-image", { method: "POST", body: form });
  }
}

function fileToBase64Payload(file: File): Promise<{ mimeType: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read this screenshot from your device."));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const commaIndex = result.indexOf(",");
      if (!result || commaIndex < 0) {
        reject(new Error("Could not prepare this screenshot for upload."));
        return;
      }
      resolve({
        mimeType: file.type || "image/jpeg",
        base64: result.slice(commaIndex + 1),
      });
    };
    reader.readAsDataURL(file);
  });
}
