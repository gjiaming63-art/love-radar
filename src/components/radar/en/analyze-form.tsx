"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Send, Sparkles, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enUS } from "@/lib/i18n/en-US";
import { parseWechatTranscript } from "@/lib/chat-text-parser";
import type { AnalysisMode, LoveReport, ParsedChatImageMessage, RoleContext } from "@/types/report";

const maxScreenshots = 4;

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

  const previewUrls = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)), [previewUrls]);

  // Selecting screenshots only previews them. Nothing is uploaded (and no quota is used)
  // until the user taps the analyze button.
  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!picked.length) return;
    setError(picked.length > maxScreenshots ? `Only the first ${maxScreenshots} screenshots were added.` : "");
    setImages(picked.slice(0, maxScreenshots));
    setText("");
    setParsedMessages(null);
    setSpeakerChoice(null);
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
    setParsedMessages(null);
  }

  async function analyzeScreenshots() {
    if (!images.length) return;
    setError("");
    setParsedMessages(null);
    setSpeakerChoice(null);
    setStage("reading");

    try {
      const response = await uploadScreenshotsForParsing(images);
      const payload = await response.json();
      if (!response.ok || !payload.parsed?.chatText) {
        throw new Error(payload.error || "Could not read these screenshots.");
      }

      const parsedText = payload.parsed.chatText;
      const nextParsedMessages = payload.parsed.messages?.length ? payload.parsed.messages : null;
      setParsedMessages(nextParsedMessages);
      setStage("analyzing");
      await analyze({
        chatText: parsedText,
        parsedMessages: nextParsedMessages,
        inputType: "image",
      });
    } catch (cause) {
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

  async function analyze(input?: {
    chatText?: string;
    parsedMessages?: ParsedChatImageMessage[] | null;
    inputType?: "text" | "image";
  }) {
    setError("");
    const currentChatText = input?.chatText?.trim() ?? text.trim();
    const currentParsedMessages = input?.parsedMessages ?? parsedMessages;
    const currentInputType = input?.inputType ?? (images.length ? "image" : "text");
    if (!currentChatText && !images.length) {
      setError("Add chat text or upload at least one screenshot.");
      return;
    }
    setLoading(true);
    try {
      const roleContext: RoleContext = currentInputType === "image"
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
          chatText: currentChatText,
          parsedMessages: currentParsedMessages,
          mode,
          locale: "en-US",
          inputType: currentInputType,
          roleContext,
        }),
      });
      const payload = (await response.json()) as { report?: LoveReport; error?: string };
      if (!response.ok || !payload.report) throw new Error(payload.error || "Analysis failed. Please try again.");
      const save = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: payload.report, locale: "en-US", inputType: currentInputType }),
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
    <section className="lr-reveal space-y-5 rounded-[28px] border border-white/10 bg-[#0d0a14]/80 p-5 shadow-2xl shadow-black/40 backdrop-blur">
      <div>
        <div className="flex items-center gap-2 text-primary">
          <span aria-hidden="true" className="relative flex h-2 w-2">
            <span className="lr-ping absolute inset-0 rounded-full bg-primary/70" />
            <span className="relative h-2 w-2 rounded-full bg-primary" />
          </span>
          <Sparkles className="h-4 w-4" />
          <span className="text-xs uppercase tracking-[0.22em]">Love Radar AI</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-white">{enUS.analyzeTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{enUS.analyzeHint}</p>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-[11px] leading-4 text-muted-foreground sm:text-xs">
          {["Add screenshots", "AI reads the signals", "Get your report"].map((step, index) => (
            <li key={step} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-[10px] font-semibold text-primary">{index + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-muted-foreground">{enUS.privacy}</div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={stage !== "idle"}
        className="lr-hover-lift flex w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-accent/50 bg-accent/10 px-5 py-8 text-center text-white transition hover:bg-accent/15 disabled:opacity-60"
      >
        <ImagePlus className="h-8 w-8 text-accent" />
        <span className="mt-3 text-lg font-semibold">{images.length ? "Choose different screenshots" : "Upload chat screenshots"}</span>
        <span className="mt-1 text-xs leading-5 text-muted-foreground">iMessage, Instagram, WhatsApp, Snapchat, Tinder, Hinge and more</span>
        <span className="mt-1 text-xs leading-5 text-muted-foreground">Up to 4 screenshots · 3 free analyses per day</span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      <details className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white" open={Boolean(text) && !images.length}>
        <summary className="cursor-pointer select-none text-sm text-muted-foreground">Or paste the chat as text (e.g. a WhatsApp chat export)</summary>
        <textarea id="chat-text" value={text} onChange={(event) => { setText(event.target.value); setImages([]); setParsedMessages(null); }} rows={8} placeholder={"Alex: hey, you around this weekend?\nMe: maybe! what's up?"} className="mt-3 min-h-[200px] w-full resize-y rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-white outline-none focus:border-primary/70" />
        <span className="mt-2 block text-xs text-muted-foreground">Free text analysis: 3 per day</span>
      </details>
      {images.length ? (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {previewUrls.map((url, index) => (
              <div key={url} className="relative aspect-[9/16] overflow-hidden rounded-xl border border-white/10 bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Screenshot ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  disabled={stage !== "idle"}
                  aria-label={`Remove screenshot ${index + 1}`}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {images.length} screenshot{images.length > 1 ? "s" : ""} ready. Check they&apos;re the right chat, then tap Analyze. Nothing is uploaded until you do.
          </p>
        </div>
      ) : null}
      {isScreenshotConversation ? (
        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-white">
          <div className="flex items-center gap-2 font-medium"><Users className="h-4 w-4 text-accent" />Chat direction recognized</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Your messages (right side, or labeled &ldquo;ME&rdquo;) are set as <strong className="text-white">Me</strong>; the other person&apos;s are set as <strong className="text-white">Other</strong>. Your report will analyze their signals toward you.</p>
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
      <Button type="button" size="lg" className={`w-full ${(images.length || text.trim()) && stage === "idle" && !loading ? "lr-breathe" : ""}`} onClick={() => (images.length ? analyzeScreenshots() : analyze())} disabled={loading || stage !== "idle"}>{loading || stage !== "idle" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{loading || stage !== "idle" ? enUS.analyzing : images.length ? "Analyze screenshots" : enUS.generate}</Button>
    </section>
  );
}

async function uploadScreenshotsForParsing(files: File[]) {
  const uploadFiles = await Promise.all(files.map((file) => compressImageForUpload(file)));
  const form = new FormData();
  form.append("locale", "en-US");
  uploadFiles.forEach((file) => form.append("images", file));
  return fetch("/api/parse-chat-image", { method: "POST", body: form });
}

async function compressImageForUpload(file: File) {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;

  const image = await loadImageForCompression(file);
  if (!image) return file;

  const maxSide = 1400;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    closeLoadedImage(image);
    return file;
  }

  context.drawImage(image.source, 0, 0, width, height);
  closeLoadedImage(image);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg") || "chat-screenshot.jpg", {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  objectUrl?: string;
  close?: () => void;
};

async function loadImageForCompression(file: File): Promise<LoadedImage | null> {
  if ("createImageBitmap" in window) {
    const bitmap = await window.createImageBitmap(file).catch(() => null);
    if (bitmap) {
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;

  const loaded = await new Promise<HTMLImageElement | null>((resolve) => {
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
  });

  if (!loaded) {
    URL.revokeObjectURL(objectUrl);
    return null;
  }

  return {
    source: loaded,
    width: loaded.naturalWidth || loaded.width,
    height: loaded.naturalHeight || loaded.height,
    objectUrl,
  };
}

function closeLoadedImage(image: LoadedImage) {
  image.close?.();
  if (image.objectUrl) URL.revokeObjectURL(image.objectUrl);
}
