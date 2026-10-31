import { NextResponse } from "next/server";
import { parsedMessagesToChatText } from "@/lib/chat-image-parser";
import { parseWechatTranscript, normalizeChatText } from "@/lib/chat-text-parser";
import { analyzeChatWithDeepSeek, createInsufficientReport } from "@/lib/deepseek";
import { analysisModes, type AnalysisMode, type LoveReport, type ParsedChatImageMessage, type RoleContext } from "@/types/report";
import { consumeTextQuota, refundTextQuota } from "@/lib/text-usage";
import { getClientKey } from "@/lib/screenshot-usage";
import { ensureAuthSchema, getCurrentUser } from "@/lib/auth";
import { saveReport } from "@/lib/reports";
import { trackProductEvent } from "@/lib/product-metrics";

const englishDailyLimit = 3;

/**
 * Runs the analysis AND saves the report server-side. The browser only ever receives the report id
 * (+ delete token), so paid sections never reach the client before they are unlocked.
 */
export async function POST(request: Request) {
  let refund: { key: string; bucket: string } | null = null;
  let locale: "zh-CN" | "en-US" = "zh-CN";
  try {
    const body = (await request.json()) as {
      chatText?: string;
      mode?: AnalysisMode;
      parsedMessages?: ParsedChatImageMessage[];
      roleContext?: RoleContext;
      locale?: "zh-CN" | "en-US";
      inputType?: "text" | "image";
    };
    locale = body.locale === "en-US" ? "en-US" : "zh-CN";
    const inputType = body.inputType === "image" ? "image" : "text";
    const parsedChatText = Array.isArray(body.parsedMessages) ? parsedMessagesToChatText(body.parsedMessages, locale) : "";
    const rawChatText = normalizeChatText(parsedChatText || body.chatText || "");
    const parsedTranscript = parseWechatTranscript(rawChatText);
    const chatText = normalizeChatText(parsedTranscript.normalizedText || rawChatText);
    const mode = body.mode ?? "comprehensive";
    const validMode =
      typeof mode === "string" && (analysisModes.some((item) => item.value === mode) || mode.length > 0);

    if (!validMode) {
      return NextResponse.json({ error: "未知分析模式" }, { status: 400 });
    }

    if (!chatText.trim()) {
      return NextResponse.json({ error: locale === "en-US" ? "Add some chat first." : "请先粘贴聊天记录。" }, { status: 400 });
    }

    if (chatText.length > 30000) {
      return NextResponse.json({ error: "聊天记录太长，请先截取最关键的 1-2 段。" }, { status: 400 });
    }

    await ensureAuthSchema();
    const user = await getCurrentUser();

    if (chatText.length < 20) {
      return persist(createInsufficientReport(mode, locale), { locale, inputType, userId: user?.id, isTestAccount: Boolean(user?.isTestAccount), request });
    }

    // Spend the free quota BEFORE calling the model, so over-limit requests cost us nothing.
    // Text and screenshot analyses use separate buckets (screenshots are already limited at parse time).
    if (locale === "en-US" && !user?.isTestAccount) {
      const key = getClientKey(request);
      const bucket = inputType === "image" ? "en-US:image" : "en-US";
      const quota = await consumeTextQuota(key, bucket, englishDailyLimit);
      if (!quota.ok) {
        void track("analyze_failed", request, { source: `quota_${inputType}`, locale, userId: user?.id });
        return NextResponse.json({ code: "TEXT_DAILY_LIMIT_REACHED", error: "Your free analyses for today are used up. Come back tomorrow!", ...quota }, { status: 429 });
      }
      refund = { key, bucket };
    }

    const roleContext: RoleContext | undefined = body.roleContext
      ? {
          ...body.roleContext,
          participants: body.roleContext.participants?.length ? body.roleContext.participants : parsedTranscript.speakers,
        }
      : parsedTranscript.speakers.length
        ? { participants: parsedTranscript.speakers }
        : undefined;

    const report = await analyzeChatWithDeepSeek(chatText, mode, roleContext, locale);
    const response = await persist(report, { locale, inputType, userId: user?.id, isTestAccount: Boolean(user?.isTestAccount), request });
    refund = null;
    return response;
  } catch (error) {
    console.error(error);
    if (refund) await refundTextQuota(refund.key, refund.bucket).catch(() => undefined);
    void track("analyze_failed", request, { source: "server_error", locale });
    const message = error instanceof Error ? error.message : "分析失败";
    return NextResponse.json(
      {
        error: message.includes("DEEPSEEK_API_KEY")
          ? message
          : locale === "en-US"
            ? "The analysis failed on our side. Please try again — this one didn't count toward your free limit."
            : "AI 分析暂时失败，请稍后重试。",
      },
      { status: 500 },
    );
  }
}

async function persist(
  report: LoveReport,
  {
    locale,
    inputType,
    userId,
    isTestAccount,
    request,
  }: { locale: "zh-CN" | "en-US"; inputType: "text" | "image"; userId?: string; isTestAccount: boolean; request: Request },
) {
  const saved = await saveReport(
    {
      ...report,
      locale,
      inputType,
      analysisLanguage: locale,
      // Paid status is only ever set server-side (payment webhook / redeem code), never by the client.
      isPaid: isTestAccount,
      paidAt: isTestAccount ? new Date().toISOString() : null,
    },
    userId,
  );
  if (locale === "en-US") {
    void track("english_report_generated", request, { reportId: saved.id, source: inputType, locale, userId });
  }
  return NextResponse.json({ report: { id: saved.id, deleteToken: saved.deleteToken } });
}

function track(
  eventName: "english_report_generated" | "analyze_failed",
  request: Request,
  extra: { reportId?: string; source?: string; locale?: "zh-CN" | "en-US"; userId?: string },
) {
  return trackProductEvent({ eventName, request, ...extra }).catch((error) => console.error("track failed", error));
}
