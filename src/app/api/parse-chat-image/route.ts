import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseChatImagesWithQwen, parsedMessagesToChatText } from "@/lib/chat-image-parser";
import { consumeScreenshotQuota, getClientKey, getScreenshotQuotaStatusForUser } from "@/lib/screenshot-usage";
import type { ParsedChatImageResult } from "@/types/report";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxImageSize = 3 * 1024 * 1024;
const freeMaxImageCount = 4;
const paidMaxImageCount = 8;
const parseBatchSize = 1;
const configuredDailyLimit = Number(process.env.SCREENSHOT_DAILY_LIMIT ?? 2);

export const maxDuration = 60;

export async function POST(request: Request) {
  let locale: "zh-CN" | "en-US" = "zh-CN";
  try {
    const body = await readImageRequest(request);
    locale = body.locale;
    const dailyLimit = locale === "en-US" ? 1 : (Number.isFinite(configuredDailyLimit) ? Math.min(configuredDailyLimit, 2) : 2);
    const images = body.images;

    if (!images.length) {
      return NextResponse.json({ error: imageError(locale, "missing") }, { status: 400 });
    }

    const clientKey = getClientKey(request);
    const user = await getCurrentUser();
    const quotaStatus = await getScreenshotQuotaStatusForUser(clientKey, dailyLimit, user?.id, Boolean(user?.isTestAccount));
    const maxImageCount = quotaStatus.maxImagesPerUse;

    if (images.length > maxImageCount) {
      return NextResponse.json(
        {
          code: quotaStatus.paidRemaining > 0 ? "SCREENSHOT_TOO_MANY_IMAGES" : "SCREENSHOT_PAID_REQUIRED",
          error:
            quotaStatus.paidRemaining > 0
              ? imageError(locale, "paidImageLimit", paidMaxImageCount)
              : imageError(locale, "freeImageLimit", freeMaxImageCount, paidMaxImageCount),
          freeRemaining: quotaStatus.freeRemaining,
          paidRemaining: quotaStatus.paidRemaining,
          maxImageCount,
        },
        { status: 400 },
      );
    }

    for (const image of images) {
      if (!allowedTypes.has(image.mimeType)) {
        return NextResponse.json({ error: imageError(locale, "type") }, { status: 400 });
      }
      if (image.size > maxImageSize) {
        return NextResponse.json({ error: imageError(locale, "size") }, { status: 400 });
      }
    }

    const quota = await consumeScreenshotQuota(clientKey, dailyLimit, images.length, user?.id, Boolean(user?.isTestAccount));
    if (!quota.ok) {
      return NextResponse.json(
        {
          code: "SCREENSHOT_DAILY_LIMIT_REACHED",
          error:
            imageError(locale, "dailyLimit"),
          dailyLimit: quota.limit,
          remaining: quota.remaining,
          paidRemaining: quota.paidRemaining,
          maxImageCount: quota.maxImagesPerUse,
        },
        { status: 429 },
      );
    }

    console.log(
      "parse-chat-image received:",
      images.length,
      images.map((image) => `${image.mimeType}:${image.size}:${image.source}`).join(","),
    );

    const inputs = images.map((image) => ({ mimeType: image.mimeType, base64: image.base64 }));
    const batches = chunk(inputs, parseBatchSize);
    const batchResults = await Promise.allSettled(
      batches.map(async (batch, batchIndex) => {
        const parsed = await parseChatImagesWithQwen(batch, locale);
        return offsetParsedImageIndexes(parsed, batchIndex * parseBatchSize);
      }),
    );
    const parsedBatches = batchResults
      .filter((result): result is PromiseFulfilledResult<ParsedChatImageResult> => result.status === "fulfilled")
      .map((result) => result.value);
    const failedBatches = batchResults.filter((result) => result.status === "rejected");
    if (!parsedBatches.length) {
      const firstError = failedBatches[0];
      if (firstError?.status === "rejected") throw firstError.reason;
      throw new Error("No chat bubbles were parsed from the screenshots.");
    }
    const parsed = mergeParsedBatches(parsedBatches, locale);
    if (failedBatches.length) {
      parsed.warnings.push(
        locale === "en-US"
          ? `${failedBatches.length} screenshot(s) could not be read clearly. The report will use the readable screenshots only.`
          : `${failedBatches.length} 张截图未能清晰识别，系统会先基于已识别截图生成报告。`,
      );
    }

    return NextResponse.json({
      parsed,
      quota: {
        tier: quota.tier,
        freeRemaining: quota.remaining,
        paidRemaining: quota.paidRemaining,
        maxImageCount: quota.maxImagesPerUse,
      },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: friendlyImageParseError(message, locale) }, { status: 500 });
  }
}

type ImageRequestItem = {
  mimeType: string;
  base64: string;
  size: number;
  source: "form" | "json";
};

async function readImageRequest(request: Request): Promise<{ locale: "zh-CN" | "en-US"; images: ImageRequestItem[] }> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      locale?: "zh-CN" | "en-US";
      images?: { mimeType?: string; base64?: string; dataUrl?: string }[];
    };
    const images: ImageRequestItem[] = [];
    for (const image of body.images || []) {
      const normalized = normalizeJsonImage(image);
      if (normalized) images.push(normalized);
    }
    return {
      locale: body.locale === "en-US" ? "en-US" : "zh-CN",
      images,
    };
  }

  const formData = await request.formData();
  const locale = formData.get("locale") === "en-US" ? "en-US" : "zh-CN";
  const files = formData.getAll("images").filter((item): item is File => item instanceof File);
  const legacyImage = formData.get("image");
  if (!files.length && legacyImage instanceof File) files.push(legacyImage);
  return {
    locale,
    images: await Promise.all(
      files.map(async (image) => ({
        mimeType: image.type,
        base64: Buffer.from(await image.arrayBuffer()).toString("base64"),
        size: image.size,
        source: "form" as const,
      })),
    ),
  };
}

function normalizeJsonImage(image: { mimeType?: string; base64?: string; dataUrl?: string }) {
  const fromDataUrl = parseDataUrl(image.dataUrl || "");
  const mimeType = compactMimeType(image.mimeType || fromDataUrl?.mimeType || "");
  const base64 = compactBase64(image.base64 || fromDataUrl?.base64 || "");
  if (!mimeType || !base64) return null;
  return {
    mimeType,
    base64,
    size: Math.ceil((base64.length * 3) / 4),
    source: "json" as const,
  };
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function compactMimeType(value: string) {
  return value.trim().toLowerCase();
}

function compactBase64(value: string) {
  return value.replace(/^data:[^;,]+;base64,/i, "").replace(/\s/g, "");
}

function imageError(
  locale: "zh-CN" | "en-US",
  kind: "missing" | "paidImageLimit" | "freeImageLimit" | "type" | "size" | "dailyLimit",
  first?: number,
  second?: number,
) {
  if (locale === "en-US") {
    switch (kind) {
      case "missing": return "Please upload at least one chat screenshot.";
      case "paidImageLimit": return `Your advanced screenshot quota allows up to ${first} images per analysis.`;
      case "freeImageLimit": return `Free screenshot analysis allows up to ${first} images at a time. Unlock advanced access for up to ${second} images.`;
      case "type": return "Only PNG, JPG, and WEBP chat screenshots are supported.";
      case "size": return "Each image must be 3MB or smaller. Please choose a smaller screenshot.";
      case "dailyLimit": return "Your free screenshot analyses for today are used up. You can still use text analysis, or unlock advanced access for more screenshot analyses, up to 8 images each time.";
    }
  }

  switch (kind) {
    case "missing": return "请先上传聊天截图。";
    case "paidImageLimit": return `高级截图额度每次最多上传 ${first} 张。`;
    case "freeImageLimit": return `免费截图识别每次最多 ${first} 张。解锁高级额度后，每次最多 ${second} 张。`;
    case "type": return "只支持 PNG、JPG、WEBP 格式的聊天截图。";
    case "size": return "单张图片太大，请上传 3MB 以内的聊天截图。";
    case "dailyLimit": return "今天的免费截图识别次数已用完。你可以继续免费使用文字分析，或购买兑换码解锁 10 次高级截图额度，每次最多 8 张。";
  }
}

function friendlyImageParseError(message: string, locale: "zh-CN" | "en-US") {
  if (locale === "en-US") {
    if (/Arrearage|overdue-payment|account is in good standing|Access denied|欠费|账务|overdue/i.test(message)) {
      return "Screenshot analysis is temporarily unavailable because the vision model account has a billing issue. Please use text analysis for now.";
    }
    if (/FreeTierOnly|free quota|quota|AllocationQuota/i.test(message)) {
      return "The vision model's free quota is currently unavailable. Please try again later or use text analysis instead.";
    }
    if (/QWEN_VL_API_KEY|DASHSCOPE_API_KEY/i.test(message)) {
      return "Screenshot analysis is not configured yet. Please use text analysis for now.";
    }
    if (/AbortError|超时|timeout/i.test(message)) {
      return "Screenshot analysis timed out. Try fewer screenshots or a clearer image.";
    }
    return "We couldn't read these screenshots. Please try clearer chat screenshots or use text analysis instead.";
  }

  if (/Arrearage|overdue-payment|account is in good standing|Access denied|欠费|账务|overdue/i.test(message)) {
    return "截图识别暂时不可用：视觉模型账号存在欠费或账务状态异常。请先使用文字粘贴分析，站长处理阿里云账单后会恢复截图识别。";
  }
  if (/FreeTierOnly|free quota|quota|AllocationQuota/i.test(message)) {
    return "截图识别额度暂时不可用：视觉模型免费额度已用完。请稍后再试，或先使用文字粘贴分析。";
  }
  if (/QWEN_VL_API_KEY|DASHSCOPE_API_KEY/.test(message)) {
    return "截图识别暂未配置视觉模型 Key，请先使用文字粘贴分析。";
  }
  if (/AbortError|超时|timeout/i.test(message)) {
    return "截图识别超时，请减少截图数量，或换一张更清晰的聊天截图。";
  }
  return message || "聊天截图解析失败，请稍后重试。";
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function offsetParsedImageIndexes(parsed: ParsedChatImageResult, offset: number): ParsedChatImageResult {
  if (offset === 0) return parsed;
  return {
    ...parsed,
    messages: parsed.messages.map((message) => ({
      ...message,
      sourceImageIndex:
        typeof message.sourceImageIndex === "number" ? message.sourceImageIndex + offset : message.sourceImageIndex,
    })),
  };
}

function mergeParsedBatches(batches: ParsedChatImageResult[], locale: "zh-CN" | "en-US" = "zh-CN"): ParsedChatImageResult {
  const messages = batches.flatMap((batch) => batch.messages);
  const warnings = batches.flatMap((batch, index) =>
    batch.warnings.map((warning) =>
      batches.length > 1
        ? locale === "en-US"
          ? `Batch ${index + 1}: ${warning}`
          : `第 ${index + 1} 组：${warning}`
        : warning,
    ),
  );
  const participants = batches.find((batch) => batch.participants)?.participants ?? {
    userLabel: locale === "en-US" ? "Me" : "我",
    targetLabel: locale === "en-US" ? "Other" : "对方",
  };

  return {
    messages,
    participants,
    warnings: warnings.slice(0, 6),
    chatText: parsedMessagesToChatText(messages, locale),
  };
}
