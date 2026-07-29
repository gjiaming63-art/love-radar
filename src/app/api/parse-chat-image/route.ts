import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { parseChatImagesWithQwen, parsedMessagesToChatText } from "@/lib/chat-image-parser";
import { consumeScreenshotQuota, getClientKey, getScreenshotQuotaStatusForUser } from "@/lib/screenshot-usage";
import type { ParsedChatImageResult } from "@/types/report";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxImageSize = 3 * 1024 * 1024;
const freeMaxImageCount = 4;
const paidMaxImageCount = 8;
const parseBatchSize = 4;
const configuredDailyLimit = Number(process.env.SCREENSHOT_DAILY_LIMIT ?? 2);
const dailyLimit = Number.isFinite(configuredDailyLimit) ? Math.min(configuredDailyLimit, 2) : 2;

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const images = formData.getAll("images").filter((item): item is File => item instanceof File);
    const legacyImage = formData.get("image");
    if (!images.length && legacyImage instanceof File) images.push(legacyImage);

    if (!images.length) {
      return NextResponse.json({ error: "请先上传聊天截图。" }, { status: 400 });
    }

    const clientKey = getClientKey(request);
    const user = await getCurrentUser();
    const quotaStatus = await getScreenshotQuotaStatusForUser(clientKey, dailyLimit, user?.id);
    const maxImageCount = quotaStatus.maxImagesPerUse;

    if (images.length > maxImageCount) {
      return NextResponse.json(
        {
          code: quotaStatus.paidRemaining > 0 ? "SCREENSHOT_TOO_MANY_IMAGES" : "SCREENSHOT_PAID_REQUIRED",
          error:
            quotaStatus.paidRemaining > 0
              ? `高级截图额度每次最多上传 ${paidMaxImageCount} 张。`
              : `免费截图识别每次最多 ${freeMaxImageCount} 张。解锁高级额度后，每次最多 ${paidMaxImageCount} 张。`,
          freeRemaining: quotaStatus.freeRemaining,
          paidRemaining: quotaStatus.paidRemaining,
          maxImageCount,
        },
        { status: 400 },
      );
    }

    for (const image of images) {
      if (!allowedTypes.has(image.type)) {
        return NextResponse.json({ error: "只支持 PNG、JPG、WEBP 格式的聊天截图。" }, { status: 400 });
      }
      if (image.size > maxImageSize) {
        return NextResponse.json({ error: "单张图片太大，请上传 3MB 以内的聊天截图。" }, { status: 400 });
      }
    }

    const quota = await consumeScreenshotQuota(clientKey, dailyLimit, images.length, user?.id);
    if (!quota.ok) {
      return NextResponse.json(
        {
          code: "SCREENSHOT_DAILY_LIMIT_REACHED",
          error:
            "今天的免费截图识别次数已用完。你可以继续免费使用文字分析，或购买兑换码解锁 10 次高级截图额度，每次最多 8 张。",
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
      images.map((image) => `${image.type}:${image.size}`).join(","),
    );

    const inputs = await Promise.all(
      images.map(async (image) => ({
        mimeType: image.type,
        base64: Buffer.from(await image.arrayBuffer()).toString("base64"),
      })),
    );
    const batches = chunk(inputs, parseBatchSize);
    const parsedBatches = await Promise.all(
      batches.map(async (batch, batchIndex) => {
        const parsed = await parseChatImagesWithQwen(batch);
        return offsetParsedImageIndexes(parsed, batchIndex * parseBatchSize);
      }),
    );
    const parsed = mergeParsedBatches(parsedBatches);

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
    const message = error instanceof Error ? error.message : "聊天截图解析失败，请稍后重试。";
    return NextResponse.json({ error: friendlyImageParseError(message) }, { status: 500 });
  }
}

function friendlyImageParseError(message: string) {
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
  return message;
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

function mergeParsedBatches(batches: ParsedChatImageResult[]): ParsedChatImageResult {
  const messages = batches.flatMap((batch) => batch.messages);
  const warnings = batches.flatMap((batch, index) =>
    batch.warnings.map((warning) => (batches.length > 1 ? `第 ${index + 1} 组：${warning}` : warning)),
  );
  const participants = batches.find((batch) => batch.participants)?.participants ?? {
    userLabel: "我",
    targetLabel: "对方",
  };

  return {
    messages,
    participants,
    warnings: warnings.slice(0, 6),
    chatText: parsedMessagesToChatText(messages),
  };
}
