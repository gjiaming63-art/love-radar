"use client";

import { type ChangeEvent, type ClipboardEvent, type FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardPaste,
  Loader2,
  LockKeyhole,
  Radar,
  ShieldAlert,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  analysisModes,
  type AnalysisMode,
  type LoveReport,
  type ParsedChatImageMessage,
  type ParsedChatImageResult,
  type RoleContext,
} from "@/types/report";
import { parseWechatTranscript, normalizeChatText } from "@/lib/chat-text-parser";
import { cn } from "@/lib/utils";

const maxChatImageCount = 8;
const freeChatImageCount = 4;
const screenshotDailyLimit = 2;
const screenshotUploadMaintenance = process.env.NEXT_PUBLIC_ENABLE_SCREENSHOT_UPLOAD === "false";
const mianbaoduoBuyUrl = process.env.NEXT_PUBLIC_MBD_BUY_URL || "";

type SpeakerChoice = {
  selfName: string;
  targetName: string;
};

type SampleQuality = {
  level: "good" | "weak" | "poor";
  label: string;
  description: string;
  warnings: string[];
  suggestions: string[];
};

export function AnalyzeForm() {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [chatText, setChatText] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("comprehensive");
  const [speakerChoice, setSpeakerChoice] = useState<SpeakerChoice | null>(null);
  const [error, setError] = useState("");
  const [ocrError, setOcrError] = useState("");
  const [ocrLimitReached, setOcrLimitReached] = useState(false);
  const [ocrImageName, setOcrImageName] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [imageParseStatus, setImageParseStatus] = useState("");
  const [parsedMessages, setParsedMessages] = useState<ParsedChatImageMessage[] | null>(null);
  const [lastSubmitLength, setLastSubmitLength] = useState<number | null>(null);
  const [pasteNotice, setPasteNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const parsedTranscript = useMemo(() => parseWechatTranscript(chatText), [chatText]);
  const analysisText = parsedTranscript.normalizedText || chatText;
  const count = analysisText.length;
  const lineCount = useMemo(() => countLines(analysisText), [analysisText]);
  const speakers = parsedTranscript.speakers;
  const sampleQuality = useMemo(() => analyzeSampleQuality(analysisText, speakers), [analysisText, speakers]);
  const activeSpeakerChoice =
    speakerChoice &&
    speakers.includes(speakerChoice.selfName) &&
    speakers.includes(speakerChoice.targetName) &&
    speakerChoice.selfName !== speakerChoice.targetName
      ? speakerChoice
      : speakers.length >= 2
        ? { selfName: speakers[0], targetName: speakers[1] }
        : null;

  const status = useMemo(() => {
    if (count === 0) return "请粘贴聊天记录";
    if (count < 20) return "信息偏少，AI 会返回轻量判断";
    if (count > 30000) return "内容过长，请截取重点";
    if (speakers.length >= 2) return "已识别双方，可以生成报告";
    return "可以生成报告，但建议保留双方昵称";
  }, [count, speakers.length]);

  function resetParsedState() {
    setParsedMessages(null);
    setImageParseStatus("");
    setOcrError("");
    setOcrLimitReached(false);
    setOcrImageName("");
  }

  function updateChatText(nextText: string, notice?: string) {
    const normalized = normalizeChatText(nextText);
    setChatText(normalized);
    resetParsedState();
    if (notice) setPasteNotice(notice);
  }

  function syncEditorText(notice?: string) {
    const nextText = normalizeChatText(editorRef.current?.innerText || "");
    setChatText(nextText);
    resetParsedState();
    if (notice) setPasteNotice(notice);
  }

  function clearEditor() {
    if (editorRef.current) editorRef.current.innerText = "";
    updateChatText("");
  }

  function handleEditorInput(event: FormEvent<HTMLDivElement>) {
    updateChatText(event.currentTarget.innerText || "");
  }

  function handleTextPaste(event: ClipboardEvent<HTMLDivElement>) {
    const plainText = event.clipboardData.getData("text/plain");
    const htmlText = htmlToText(event.clipboardData.getData("text/html"));
    const incomingText = pickLongerText(plainText, htmlText);
    if (incomingText) {
      setTimeout(() => syncEditorText(`已读取到 ${incomingText.length} 字、${countLines(incomingText)} 行。`), 0);
    } else {
      setTimeout(() => syncEditorText(), 0);
    }
  }

  async function handleReadClipboardAppend() {
    setPasteNotice("");
    if (!navigator.clipboard?.readText) {
      setPasteNotice("当前浏览器不支持直接读取剪贴板，请长按文本框粘贴。");
      return;
    }

    try {
      const incomingText = normalizeChatText(await navigator.clipboard.readText());
      if (!incomingText.trim()) {
        setPasteNotice("剪贴板里没有读到文字内容。");
        return;
      }
      const nextText = chatText ? `${chatText}\n${incomingText}` : incomingText;
      if (editorRef.current) editorRef.current.innerText = nextText;
      updateChatText(
        nextText,
        `已从剪贴板追加 ${incomingText.length} 字、${countLines(incomingText)} 行。`,
      );
    } catch {
      setPasteNotice("读取剪贴板失败。请确认浏览器允许剪贴板权限，或长按文本框粘贴。");
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setOcrError("");
    setOcrLimitReached(false);
    setImageParseStatus("");
    setOcrImageName(files.length === 1 ? files[0].name : `${files.length} 张截图`);

    if (files.length > maxChatImageCount) {
      setOcrError(`高级截图额度每次最多上传 ${maxChatImageCount} 张。免费额度每次最多 ${freeChatImageCount} 张。`);
      return;
    }

    for (const file of files) {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setOcrError("只支持 PNG、JPG、WEBP 格式的聊天截图。");
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        setOcrError("单张图片太大，请上传 8MB 以内的聊天截图。");
        return;
      }
    }

    setOcrLoading(true);
    try {
      setImageParseStatus("正在压缩图片");
      const uploadFiles = await Promise.all(files.map((file) => compressImageForUpload(file)));
      const formData = new FormData();
      uploadFiles.forEach((file) => formData.append("images", file));

      setImageParseStatus("正在理解聊天截图");
      const response = await fetch("/api/parse-chat-image", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { parsed?: ParsedChatImageResult; error?: string; code?: string };

      if (!response.ok || !payload.parsed?.chatText?.trim()) {
        if (
          response.status === 429 ||
          payload.code === "SCREENSHOT_DAILY_LIMIT_REACHED" ||
          payload.code === "SCREENSHOT_PAID_REQUIRED"
        ) {
          setOcrLimitReached(true);
        }
        throw new Error(payload.error || "截图解析失败，请换一张更清晰的截图。");
      }

      setParsedMessages(payload.parsed.messages);
      setChatText(normalizeChatText(payload.parsed.chatText));
      setOcrLimitReached(false);
      setImageParseStatus(`已解析 ${payload.parsed.messages.length} 条聊天气泡`);
      if (payload.parsed.warnings.length) {
        setOcrError(payload.parsed.warnings.join("；"));
      }
    } catch (uploadError) {
      setOcrError(uploadError instanceof Error ? uploadError.message : "截图解析失败，请稍后重试。");
    } finally {
      setOcrLoading(false);
    }
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const roleContext: RoleContext = {
        participants: speakers,
        selfName: activeSpeakerChoice?.selfName,
        targetName: activeSpeakerChoice?.targetName,
      };
      const normalizedChatText = normalizeChatText(analysisText);
      setLastSubmitLength(normalizedChatText.length);
      console.log("submit chatText length:", normalizedChatText.length);
      console.log("submit chatText preview:", normalizedChatText.slice(0, 500));
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatText: normalizedChatText, mode, roleContext, parsedMessages }),
      });
      const analyzePayload = (await analyzeResponse.json()) as {
        report?: LoveReport;
        error?: string;
      };
      if (!analyzeResponse.ok || !analyzePayload.report) {
        throw new Error(analyzePayload.error || "分析失败");
      }

      const saveResponse = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: analyzePayload.report }),
      });
      const savePayload = (await saveResponse.json()) as {
        report?: LoveReport & { id: string; deleteToken: string };
        error?: string;
      };
      if (!saveResponse.ok || !savePayload.report?.id) {
        throw new Error(savePayload.error || "保存报告失败");
      }

      localStorage.setItem(`love-radar-delete:${savePayload.report.id}`, savePayload.report.deleteToken);
      router.push(`/report/${savePayload.report.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Badge className="border-primary/30 bg-primary/10 text-primary">DeepSeek AI 分析</Badge>
        <h1 className="text-3xl font-semibold tracking-normal sm:text-5xl">粘贴聊天记录</h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
          直接粘贴微信聊天记录，AI 会基于文字内容生成恋爱雷达报告。也可以上传聊天截图，系统会先识别聊天气泡再分析。
        </p>
      </div>

      <div className="sticky top-0 z-20 rounded-lg border border-primary/40 bg-primary/15 p-3 shadow-[0_12px_38px_rgb(0_0_0/0.28)] backdrop-blur">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">上传前先看这里</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              微信昵称可以保留，它有助于 AI 判断双方角色。请优先打码手机号、地址、身份证、定位、公司、学校等高敏信息。
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary" />
            分析模式
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {analysisModes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={cn(
                  "rounded-md border p-3 text-left transition",
                  mode === item.value
                    ? "border-primary bg-primary/12 text-foreground"
                    : "border-border bg-background/45 text-muted-foreground hover:bg-muted/60",
                )}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="mt-1 block text-xs leading-5">{item.hint}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>聊天记录文本</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            ref={editorRef}
            role="textbox"
            aria-label="粘贴微信聊天记录"
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onPaste={handleTextPaste}
            data-placeholder={"请粘贴微信聊天记录，建议保留双方昵称和多轮上下文，例如：\n小明：最近忙吗\nLuna：还好，你怎么啦\n小明：想问问周末要不要一起吃饭"}
            className="min-h-[260px] w-full whitespace-pre-wrap break-words rounded-md border border-border bg-background/70 p-4 text-sm leading-7 text-foreground outline-none transition empty:before:whitespace-pre-wrap empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] focus:border-primary"
          />

          <div className="flex flex-col gap-3 text-xs text-muted-foreground">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {count} 字 · {lineCount} 行 · {status}
                {lastSubmitLength !== null ? ` · 上次提交 ${lastSubmitLength} 字` : ""}
              </span>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={handleReadClipboardAppend}>
                  <ClipboardPaste className="h-4 w-4" />
                  读取剪贴板并追加
                </Button>
                {chatText ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearEditor();
                      setLastSubmitLength(null);
                      setPasteNotice("");
                    }}
                  >
                    清空重填
                  </Button>
                ) : null}
              </div>
            </div>
            {pasteNotice ? (
              <span className="rounded-md border border-accent/25 bg-accent/10 p-2 text-accent">{pasteNotice}</span>
            ) : null}
            {chatText ? (
              <span className="rounded-md border border-primary/25 bg-primary/10 p-2 text-primary">
                已整理出 {parsedTranscript.messages.length} 条消息
                {speakers.length
                  ? ` · 默认按出现最多的昵称识别：${speakers.slice(0, 2).join("、")}`
                  : " · 暂未稳定识别双方昵称"}
              </span>
            ) : null}
          </div>

          <div className="rounded-md border border-border bg-background/45 p-3 text-xs leading-6 text-muted-foreground">
            当前版本直接使用文字分析，不保存聊天原文。若手机长按粘贴仍只出现一条，请先点“读取剪贴板并追加”。
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/75">
        <CardHeader>
          <CardTitle>聊天截图</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-primary/35 bg-primary/10 p-3 text-sm leading-6 text-foreground">
            截图识别会消耗高级视觉 AI 额度。每天免费 {screenshotDailyLimit} 次，每次最多{" "}
            {freeChatImageCount} 张；解锁高级额度后获得 10 次截图识别，每次最多 {maxChatImageCount} 张。
            文本粘贴分析一直免费可用。
          </div>
          <label
            className={cn(
              "relative flex min-h-[180px] flex-col items-center justify-center gap-4 overflow-hidden rounded-lg border border-dashed border-border bg-muted/25 p-6 text-center transition hover:border-primary/60 hover:bg-primary/10",
              screenshotUploadMaintenance && "cursor-not-allowed opacity-70 hover:border-border hover:bg-muted/25",
              ocrLoading && "pointer-events-none border-primary/55 bg-primary/10",
            )}
          >
            {ocrLoading ? (
              <>
                <span className="absolute inset-x-8 top-0 h-20 bg-gradient-to-b from-primary/20 to-transparent blur-2xl" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-background/60">
                  <span className="absolute h-20 w-20 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                  <span className="absolute h-12 w-12 animate-spin rounded-full border-2 border-accent/15 border-b-accent [animation-direction:reverse]" />
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </span>
              </>
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background/55 text-4xl leading-none text-muted-foreground">
                +
              </span>
            )}
            <span className="space-y-2">
              <span className="block text-base font-semibold text-foreground">
                {ocrLoading
                  ? imageParseStatus || "正在理解聊天截图"
                  : screenshotUploadMaintenance
                    ? "截图上传功能维护中"
                    : "点击上传聊天截图"}
              </span>
              <span className="block text-xs leading-6 text-muted-foreground">
                {ocrLoading
                  ? "AI 正在识别聊天气泡和双方关系，请勿关闭页面。"
                  : screenshotUploadMaintenance
                    ? "当前图片识别额度维护中，请先使用上方文本粘贴分析。"
                    : `建议上传 1-3 张清晰截图，按聊天顺序选择。免费每次最多 ${freeChatImageCount} 张，高级最多 ${maxChatImageCount} 张。`}
              </span>
            </span>
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={screenshotUploadMaintenance || ocrLoading}
              multiple
              onChange={handleImageUpload}
            />
          </label>

          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <span>
              {ocrImageName ? `${ocrImageName} · ` : ""}
              {screenshotUploadMaintenance
                ? "截图上传维护中"
                : `免费 ${screenshotDailyLimit} 次/天 · 免费最多 ${freeChatImageCount} 张 · 高级最多 ${maxChatImageCount} 张`}
            </span>
            {ocrLimitReached ? (
              <div className="rounded-lg border border-primary/35 bg-primary/10 p-4 text-foreground">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">今日免费截图分析次数已用完</p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      截图识别需要消耗高级视觉 AI 额度。你可以继续免费使用文字分析，或购买兑换码解锁 10 次高级截图额度，每次最多 8 张，并同时开启高级报告内容。
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      {mianbaoduoBuyUrl ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => window.open(mianbaoduoBuyUrl, "_blank", "noopener,noreferrer")}
                        >
                          ￥6.9 解锁高级额度
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => editorRef.current?.focus()}
                      >
                        继续用文字免费分析
                      </Button>
                    </div>
                    {ocrError ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{ocrError}</p> : null}
                  </div>
                </div>
              </div>
            ) : ocrError ? (
              <span className="rounded-md border border-destructive/35 bg-destructive/10 p-3 text-destructive">
                {ocrError}
              </span>
            ) : imageParseStatus ? (
              <span className="rounded-md border border-border bg-background/45 p-3">{imageParseStatus}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>生成报告</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SampleQualityCard quality={sampleQuality} count={count} speakers={speakers} />

          {speakers.length >= 2 ? (
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-accent" />
                识别到两位聊天对象：{speakers[0]}、{speakers[1]}。你想分析谁对谁？
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { selfName: speakers[0], targetName: speakers[1] },
                  { selfName: speakers[1], targetName: speakers[0] },
                ].map((choice) => {
                  const active =
                    activeSpeakerChoice?.selfName === choice.selfName &&
                    activeSpeakerChoice?.targetName === choice.targetName;
                  return (
                    <button
                      key={`${choice.selfName}-${choice.targetName}`}
                      type="button"
                      onClick={() => setSpeakerChoice(choice)}
                      className={cn(
                        "rounded-md border p-3 text-left text-sm transition",
                        active
                          ? "border-accent bg-accent/15 text-foreground"
                          : "border-border bg-background/45 text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      我是 <span className="font-semibold">{choice.selfName}</span>
                      <br />
                      分析 <span className="font-semibold">{choice.targetName}</span> 对我的态度
                    </button>
                  );
                })}
              </div>
              {speakers.length > 2 ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  还识别到：{speakers.slice(2).join("、")}。建议不要用群聊记录做关系分析，结果容易跑偏。
                </p>
              ) : null}
            </div>
          ) : count >= 20 ? (
            <div className="rounded-md border border-border bg-background/45 p-3 text-xs leading-6 text-muted-foreground">
              暂时没有稳定识别到两位昵称。仍可生成报告，AI 会使用“A方 / B方”做轻量判断，但建议保留双方昵称。
            </div>
          ) : null}

          <div className="rounded-md border border-accent/25 bg-accent/10 p-3 text-xs leading-6 text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
              <LockKeyhole className="h-4 w-4 text-accent" />
              隐私与免责声明
            </div>
            本报告由 AI 生成，仅供娱乐和沟通参考，不构成心理、法律或情感决策建议。请勿上传身份证、手机号、地址、学校、公司等敏感信息。
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={loading || !chatText.trim() || count > 30000}
            onClick={handleSubmit}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            生成报告
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SampleQualityCard({
  quality,
  count,
  speakers,
}: {
  quality: SampleQuality;
  count: number;
  speakers: string[];
}) {
  const Icon = quality.level === "good" ? SignalHigh : quality.level === "weak" ? SignalMedium : SignalLow;

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        quality.level === "good" && "border-accent/35 bg-accent/10",
        quality.level === "weak" && "border-primary/35 bg-primary/10",
        quality.level === "poor" && "border-destructive/35 bg-destructive/10",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">样本质量：{quality.label}</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">{quality.description}</p>
          </div>
        </div>
        <Badge className="shrink-0 border-border bg-background/60">
          {count} 字 · {speakers.length || 0} 人
        </Badge>
      </div>

      {quality.warnings.length ? (
        <div className="mt-3 grid gap-2">
          {quality.warnings.map((warning) => (
            <p key={warning} className="flex gap-2 text-xs leading-5 text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              {warning}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-3 flex gap-2 text-xs leading-5 text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          这份记录已经比较适合生成动态报告。
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {quality.suggestions.map((suggestion) => (
          <span
            key={suggestion}
            className="rounded-full border border-border bg-background/45 px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            {suggestion}
          </span>
        ))}
      </div>
    </div>
  );
}

function analyzeSampleQuality(text: string, speakers: string[]): SampleQuality {
  const trimmed = normalizeChatText(text);
  const messageLines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const warnings: string[] = [];
  const suggestions = ["建议 20-80 条消息", "保留双方昵称", "截取关系关键上下文"];

  if (!trimmed) {
    return {
      level: "poor",
      label: "待上传",
      description: "先粘贴微信聊天记录，系统会直接基于文字生成分析报告。",
      warnings: ["还没有聊天内容。"],
      suggestions,
    };
  }

  if (trimmed.length < 80 || messageLines.length < 4) {
    warnings.push("聊天样本偏短，AI 可能只能给出“信息不足”的轻量判断。");
  }
  if (messageLines.length < 12 && trimmed.length < 600) {
    warnings.push("上下文较少，建议多复制几轮来回对话。");
  }
  if (trimmed.length > 30000) {
    warnings.push("内容过长，建议截取最近或最关键的片段，避免报告发散。");
  }
  if (speakers.length === 0) {
    warnings.push("暂未识别到稳定昵称，建议保留“昵称：内容”的格式。");
  }
  if (speakers.length === 1) {
    warnings.push("看起来可能只有单方消息，关系判断会明显偏弱。");
  }
  if (speakers.length > 2) {
    warnings.push("识别到超过两位发言者，可能是群聊，建议只上传一对一聊天。");
  }

  if (warnings.length === 0) {
    return {
      level: "good",
      label: "样本较好",
      description: "有双方角色和足够上下文，适合生成更具体的证据和建议。",
      warnings,
      suggestions,
    };
  }

  if (trimmed.length >= 120 && warnings.length <= 2) {
    return {
      level: "weak",
      label: "可分析但偏弱",
      description: "可以先跑一版，但补充更多上下文会让分数、标签和证据更准。",
      warnings,
      suggestions,
    };
  }

  return {
    level: "poor",
    label: "建议补充",
    description: "当前样本容易让 AI 只能泛泛判断，最好补齐双方多轮对话。",
    warnings,
    suggestions,
  };
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
