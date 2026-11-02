"use client";

import { type ChangeEvent, type ClipboardEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardPaste, ImagePlus, Loader2, Radar, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analysisModes,
  type AnalysisMode,
  type ParsedChatImageMessage,
  type ParsedChatImageResult,
  type RoleContext,
} from "@/types/report";
import { parseWechatTranscript, normalizeChatText } from "@/lib/chat-text-parser";
import { cn } from "@/lib/utils";

const maxScreenshots = 4;
const screenshotDailyLimit = 3;
const screenshotUploadMaintenance = process.env.NEXT_PUBLIC_ENABLE_SCREENSHOT_UPLOAD === "false";
const defaultMode: AnalysisMode = "comprehensive";

type InputMode = "text" | "image";
type Stage = "idle" | "reading" | "analyzing";

export function AnalyzeForm() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [chatText, setChatText] = useState("");
  const [mode, setMode] = useState<AnalysisMode>(defaultMode);
  const [selfName, setSelfName] = useState("");
  const [targetName, setTargetName] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [pasteNotice, setPasteNotice] = useState("");

  const parsedTranscript = useMemo(() => parseWechatTranscript(chatText), [chatText]);
  const analysisText = parsedTranscript.normalizedText || chatText;
  const count = analysisText.length;
  const lineCount = useMemo(() => countLines(analysisText), [analysisText]);
  const speakers = parsedTranscript.speakers;
  const busy = stage !== "idle";

  const previewUrls = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)), [previewUrls]);

  // 角色：默认按出现最多的两个昵称；用户可以在下拉框里改。
  const self = speakers.includes(selfName) ? selfName : speakers[0] ?? "";
  const target = speakers.includes(targetName) && targetName !== self ? targetName : speakers.find((name) => name !== self) ?? "";

  const textStatus = useMemo(() => {
    if (count === 0) return { ok: false, text: "粘贴后会自动识别双方昵称" };
    if (count > 30000) return { ok: false, text: "内容过长，请截取最关键的一段" };
    if (count < 80 || lineCount < 4) return { ok: false, text: "内容偏短，建议多复制几轮" };
    if (speakers.length > 2) return { ok: false, text: "像是群聊，建议只分析一对一聊天" };
    if (speakers.length >= 2) return { ok: true, text: "已识别双方，可以生成" };
    return { ok: false, text: "没识别到昵称，建议保留“昵称：内容”格式" };
  }, [count, lineCount, speakers.length]);

  function updateChatText(nextText: string, notice?: string) {
    setChatText(normalizeChatText(nextText));
    setError("");
    if (notice !== undefined) setPasteNotice(notice);
  }

  function handleEditorInput(event: FormEvent<HTMLDivElement>) {
    updateChatText(event.currentTarget.innerText || "");
  }

  function handleTextPaste(event: ClipboardEvent<HTMLDivElement>) {
    const plainText = event.clipboardData.getData("text/plain");
    const htmlText = htmlToText(event.clipboardData.getData("text/html"));
    const incomingText = pickLongerText(plainText, htmlText);
    setTimeout(() => {
      updateChatText(
        editorRef.current?.innerText || "",
        incomingText ? `已读取 ${incomingText.length} 字、${countLines(incomingText)} 行` : "",
      );
    }, 0);
  }

  async function handleReadClipboard() {
    setPasteNotice("");
    if (!navigator.clipboard?.readText) {
      setPasteNotice("当前浏览器不支持读取剪贴板，请长按输入框粘贴");
      return;
    }
    try {
      const incomingText = normalizeChatText(await navigator.clipboard.readText());
      if (!incomingText.trim()) {
        setPasteNotice("剪贴板里没有文字");
        return;
      }
      const nextText = chatText ? `${chatText}\n${incomingText}` : incomingText;
      if (editorRef.current) editorRef.current.innerText = nextText;
      updateChatText(nextText, `已追加 ${incomingText.length} 字、${countLines(incomingText)} 行`);
    } catch {
      setPasteNotice("读取失败，请允许剪贴板权限，或长按输入框粘贴");
    }
  }

  function clearText() {
    if (editorRef.current) editorRef.current.innerText = "";
    updateChatText("", "");
  }

  // 选择截图只做预览，点「生成报告」时才上传识别（不会误耗额度）。
  function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!picked.length) return;
    const invalidType = picked.find((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type));
    if (invalidType) {
      setError("只支持 PNG、JPG、WEBP 格式的截图");
      return;
    }
    if (picked.some((file) => file.size > 8 * 1024 * 1024)) {
      setError("单张截图请控制在 8MB 以内");
      return;
    }
    setError(picked.length > maxScreenshots ? `每次最多 ${maxScreenshots} 张，已保留前 ${maxScreenshots} 张` : "");
    setImages(picked.slice(0, maxScreenshots));
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, i) => i !== index));
  }

  async function submitAnalysis(text: string, parsedMessages: ParsedChatImageMessage[] | null, roleContext: RoleContext) {
    setStage("analyzing");
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatText: normalizeChatText(text), mode, roleContext, parsedMessages }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      report?: { id: string; deleteToken?: string };
      error?: string;
    };
    if (!response.ok || !payload.report?.id) throw new Error(payload.error || "分析失败，请稍后重试");
    if (payload.report.deleteToken) {
      try {
        localStorage.setItem(`love-radar-delete:${payload.report.id}`, payload.report.deleteToken);
      } catch {
        // storage unavailable
      }
    }
    router.push(`/report/${payload.report.id}`);
  }

  async function handleGenerate() {
    setError("");
    try {
      if (inputMode === "image") {
        if (!images.length) return;
        setStage("reading");
        const uploadFiles = await Promise.all(images.map((file) => compressImageForUpload(file)));
        const formData = new FormData();
        uploadFiles.forEach((file) => formData.append("images", file));
        const response = await fetch("/api/parse-chat-image", { method: "POST", body: formData });
        const payload = (await response.json().catch(() => ({}))) as { parsed?: ParsedChatImageResult; error?: string };
        if (!response.ok || !payload.parsed?.chatText?.trim()) {
          throw new Error(payload.error || "截图识别失败，请换更清晰的截图");
        }
        await submitAnalysis(payload.parsed.chatText, payload.parsed.messages, {
          participants: ["我", "对方"],
          selfName: "我",
          targetName: "对方",
        });
        return;
      }
      await submitAnalysis(analysisText, null, {
        participants: speakers,
        selfName: self || undefined,
        targetName: target || undefined,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成失败，请稍后重试");
      setStage("idle");
    }
  }

  const canGenerate =
    !busy && (inputMode === "image" ? images.length > 0 && !screenshotUploadMaintenance : Boolean(chatText.trim()) && count <= 30000);
  const otherModes = analysisModes.filter((item) => item.value !== defaultMode);
  const activeMode = analysisModes.find((item) => item.value === mode);

  return (
    <section className="lr-reveal space-y-5 rounded-[28px] border border-white/10 bg-[#0d0a14]/80 p-5 shadow-2xl shadow-black/40 backdrop-blur">
      <div>
        <div className="flex items-center gap-2 text-primary">
          <span aria-hidden="true" className="relative flex h-2 w-2">
            <span className="lr-ping absolute inset-0 rounded-full bg-primary/70" />
            <span className="relative h-2 w-2 rounded-full bg-primary" />
          </span>
          <Sparkles className="h-4 w-4" />
          <span className="text-xs tracking-[0.22em]">恋爱雷达</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-white">分析聊天记录</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">粘贴微信聊天记录或上传截图，AI 帮你看清关系信号。</p>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-[11px] leading-4 text-muted-foreground sm:text-xs">
          {["粘贴/上传", "AI 读信号", "出报告"].map((step, index) => (
            <li key={step} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-[10px] font-semibold text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div role="tablist" aria-label="输入方式" className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
        {(
          [
            { value: "text", label: "粘贴文字" },
            { value: "image", label: "上传截图" },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={inputMode === item.value}
            disabled={busy}
            onClick={() => {
              setInputMode(item.value);
              setError("");
            }}
            className={cn(
              "min-h-10 rounded-xl text-sm font-medium transition",
              inputMode === item.value ? "bg-white/15 text-white shadow-sm" : "text-muted-foreground hover:text-white",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={inputMode === "text" ? "space-y-2" : "hidden"}>
        <div
          ref={editorRef}
          role="textbox"
          aria-label="粘贴微信聊天记录"
          aria-multiline="true"
          contentEditable={!busy}
          suppressContentEditableWarning
          onInput={handleEditorInput}
          onPaste={handleTextPaste}
          data-placeholder={"在微信里多选消息 → 复制 → 粘贴到这里，例如：\n小明：最近忙吗\nLuna：还好，你怎么啦"}
          className="min-h-[220px] w-full whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-7 text-white outline-none transition empty:before:whitespace-pre-wrap empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] focus:border-primary/70"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={cn("flex items-center gap-1.5", textStatus.ok ? "text-accent" : "text-muted-foreground")}>
            {textStatus.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {count ? `${count} 字 · ` : ""}
            {textStatus.text}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleReadClipboard}
              disabled={busy}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-white/10 px-3 text-muted-foreground transition hover:text-white"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              读取剪贴板
            </button>
            {chatText ? (
              <button type="button" onClick={clearText} disabled={busy} className="min-h-8 rounded-full px-3 text-muted-foreground transition hover:text-white">
                清空
              </button>
            ) : null}
          </span>
        </div>
        {pasteNotice ? <p className="text-xs text-muted-foreground">{pasteNotice}</p> : null}

        {speakers.length >= 2 ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>我是</span>
              <select
                value={self}
                onChange={(event) => setSelfName(event.target.value)}
                disabled={busy}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-primary/70"
              >
                {speakers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              <span>分析谁</span>
              <select
                value={target}
                onChange={(event) => setTargetName(event.target.value)}
                disabled={busy}
                className="min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-primary/70"
              >
                {speakers
                  .filter((name) => name !== self)
                  .map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <div className={inputMode === "image" ? "space-y-3" : "hidden"}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy || screenshotUploadMaintenance}
          className="lr-hover-lift flex w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-accent/50 bg-accent/10 px-5 py-8 text-center text-white transition hover:bg-accent/15 disabled:opacity-60"
        >
          <ImagePlus className="h-8 w-8 text-accent" />
          <span className="mt-3 text-lg font-semibold">
            {screenshotUploadMaintenance ? "截图识别维护中" : images.length ? "重新选择截图" : "上传聊天截图"}
          </span>
          <span className="mt-1 text-xs leading-5 text-muted-foreground">
            {screenshotUploadMaintenance ? "请先使用粘贴文字分析" : `按聊天顺序选择，每次最多 ${maxScreenshots} 张`}
          </span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleImagePick} />
        {images.length ? (
          <div className="grid grid-cols-4 gap-2">
            {previewUrls.map((url, index) => (
              <div key={url} className="relative aspect-[9/16] overflow-hidden rounded-xl border border-white/10 bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`截图 ${index + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label={`删除截图 ${index + 1}`}
                  onClick={() => removeImage(index)}
                  disabled={busy}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">每天可免费识别 {screenshotDailyLimit} 次截图</p>
      </div>

      <details className="group rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between text-muted-foreground">
          <span>
            分析角度：<span className="text-white">{activeMode?.label ?? "综合分析"}</span>
          </span>
          <span className="flex items-center gap-1 text-xs">
            更多分析角度
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </span>
        </summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {[analysisModes.find((item) => item.value === defaultMode), ...otherModes]
            .filter((item): item is (typeof analysisModes)[number] => Boolean(item))
            .map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                disabled={busy}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition",
                  mode === item.value ? "border-primary/60 bg-primary/15 text-white" : "border-white/10 text-muted-foreground hover:text-white",
                )}
              >
                {item.label}
              </button>
            ))}
        </div>
      </details>

      {error ? (
        <p className="flex items-start gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm leading-6 text-red-200">
          <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Button type="button" size="lg" className={cn("w-full", canGenerate && "lr-breathe")} disabled={!canGenerate} onClick={() => void handleGenerate()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
          {stage === "reading" ? "正在识别截图…" : stage === "analyzing" ? "AI 正在分析…" : "生成报告"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">聊天原文不会保存，仅用于生成本次分析</p>
      </div>
    </section>
  );
}

function htmlToText(html: string) {
  if (!html || typeof document === "undefined") return "";
  const container = document.createElement("div");
  container.innerHTML = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n$&");
  return normalizeChatText(container.innerText || container.textContent || "");
}

function pickLongerText(primary: string, secondary: string) {
  const normalizedPrimary = normalizeChatText(primary || "");
  const normalizedSecondary = normalizeChatText(secondary || "");
  const primaryScore = normalizedPrimary.length + countLines(normalizedPrimary) * 20;
  const secondaryScore = normalizedSecondary.length + countLines(normalizedSecondary) * 20;
  return secondaryScore > primaryScore ? normalizedSecondary : normalizedPrimary;
}

function countLines(text: string) {
  const normalized = normalizeChatText(text);
  if (!normalized) return 0;
  return normalized.split("\n").length;
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

  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
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
