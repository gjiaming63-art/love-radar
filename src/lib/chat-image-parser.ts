import { compactText } from "@/lib/utils";
import type { ParsedChatImageMessage, ParsedChatImageResult } from "@/types/report";

type QwenMessageContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type QwenResponse = {
  choices?: {
    message?: {
      content?: string | { text?: string }[];
    };
  }[];
};

type PartialParsedChatImageResult = Partial<ParsedChatImageResult> & {
  messages?: Partial<ParsedChatImageMessage>[];
  participants?: Partial<ParsedChatImageResult["participants"]>;
};

type ChatImageInput = {
  base64: string;
  mimeType: string;
};

function getQwenConfig() {
  return {
    apiKey:
      process.env.QWEN_VL_API_KEY ||
      process.env.DASHSCOPE_API_KEY ||
      process.env.ALIBABA_DASHSCOPE_API_KEY ||
      "",
    baseUrl: (process.env.QWEN_VL_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(
      /\/+$/,
      "",
    ),
    model: process.env.QWEN_VL_MODEL || "qwen-vl-plus",
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The vision model did not return JSON.");
  return raw.slice(start, end + 1);
}

function extractContent(data: QwenResponse) {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => item.text ?? "").join("\n");
  return "";
}

function labelForSpeaker(speaker: ParsedChatImageMessage["speaker"], locale: "zh-CN" | "en-US") {
  if (speaker === "user") return locale === "en-US" ? "Me" : "我";
  return locale === "en-US" ? "Other" : "对方";
}

function normalizeParsedResult(value: unknown, locale: "zh-CN" | "en-US"): ParsedChatImageResult {
  const input = value as PartialParsedChatImageResult;
  const messages =
    input.messages
      ?.map((item) => {
        const speaker = item.speaker === "target" ? "target" : "user";
        const text = compactText(String(item.text || ""), 500);
        if (!text) return null;
        return {
          speaker,
          text,
          sourceImageIndex:
            typeof item.sourceImageIndex === "number" && Number.isFinite(item.sourceImageIndex)
              ? Math.max(1, Math.round(item.sourceImageIndex))
              : undefined,
          confidence:
            typeof item.confidence === "number" && Number.isFinite(item.confidence)
              ? Math.max(0, Math.min(1, item.confidence))
              : undefined,
        };
      })
      .filter(Boolean) ?? [];

  const safeMessages = messages as ParsedChatImageMessage[];
  const chatText =
    safeMessages.map((item) => `${labelForSpeaker(item.speaker, locale)}: ${item.text}`).join("\n") ||
    compactText(String(input.chatText || ""), 12000);

  if (!safeMessages.length && !chatText.trim()) {
    throw new Error("The vision model did not parse any readable chat messages from the screenshot.");
  }

  return {
    messages: safeMessages,
    participants: {
      userLabel: compactText(String(input.participants?.userLabel || labelForSpeaker("user", locale)), 20),
      targetLabel: compactText(String(input.participants?.targetLabel || labelForSpeaker("target", locale)), 20),
    },
    warnings: Array.isArray(input.warnings)
      ? input.warnings.map((item) => compactText(String(item || ""), 120)).filter(Boolean).slice(0, 5)
      : [],
    chatText,
  };
}

export function parsedMessagesToChatText(messages: ParsedChatImageMessage[], locale: "zh-CN" | "en-US" = "zh-CN") {
  return messages.map((item) => `${labelForSpeaker(item.speaker, locale)}: ${item.text}`).join("\n");
}

export async function parseChatImagesWithQwen(
  images: ChatImageInput[],
  locale: "zh-CN" | "en-US" = "zh-CN",
): Promise<ParsedChatImageResult> {
  const { apiKey, baseUrl, model } = getQwenConfig();
  if (!apiKey) {
    throw new Error("Screenshot analysis is not configured because QWEN_VL_API_KEY or DASHSCOPE_API_KEY is missing.");
  }

  const imageContent: QwenMessageContent[] = images.map((image) => ({
    type: "image_url",
    image_url: {
      url: `data:${image.mimeType};base64,${image.base64}`,
    },
  }));

  try {
    return await parseWithPrompt(baseUrl, apiKey, model, imageContent, buildVisualPrompt(locale, false), locale);
  } catch (error) {
    console.warn("Qwen strict parse failed, retrying with relaxed prompt:", error);
    return parseWithPrompt(baseUrl, apiKey, model, imageContent, buildVisualPrompt(locale, true), locale);
  }
}

function buildVisualPrompt(locale: "zh-CN" | "en-US", relaxed: boolean) {
  const jsonShape =
    '{"messages":[{"speaker":"user","text":"exact message text","sourceImageIndex":1,"confidence":0.92},{"speaker":"target","text":"exact message text","sourceImageIndex":1,"confidence":0.88}],"participants":{"userLabel":"Me","targetLabel":"Other"},"warnings":[],"chatText":"Me: exact message text\\nOther: exact message text"}';

  if (locale === "en-US") {
    return `You are Love Radar AI's visual chat screenshot parser. Read the screenshot as a conversation screenshot, not as a generic image.

Supported apps include Instagram DM, iMessage, WhatsApp, Messenger, TikTok DM, WeChat, Telegram, LINE, Snapchat, and similar chat UIs.

Rules:
1. Extract actual message text in visual order, top to bottom.
2. For Instagram DM and most chat apps: right-side bubbles/messages are the user, speaker "user"; left-side bubbles/messages are the other person, speaker "target".
3. Right-side blue, purple, gradient, or colored messages usually mean "user". Left-side gray, white, or dark messages usually mean "target".
4. Ignore app chrome: status bar, username header, profile buttons, timestamps, "Seen", "Delivered", reaction counters, keyboard, input box, camera/mic icons, ads, and navigation.
5. Do not require perfect rounded bubbles. Instagram DMs may show compact rows, dark mode text, shared posts, replies, reactions, or image placeholders. Extract any readable message-like text from the conversation area.
6. If a message is partially readable, include the readable part and lower confidence. Do not invent missing words.
7. Replace phone numbers, addresses, IDs, schools, and companies with [REDACTED].
8. Do not analyze the relationship. Return structured messages only.
9. Return strict JSON only, no Markdown.
${relaxed ? "10. IMPORTANT: Do not return an empty messages array if there is any readable conversation text. Be permissive and extract short messages, emojis, and reply snippets." : ""}

JSON shape:
${jsonShape}`;
  }

  return `你是 Love Radar 的聊天截图视觉解析器。请把图片当作聊天软件截图来读，不要当作普通图片。

支持的软件包括 Instagram DM、iMessage、WhatsApp、Messenger、TikTok 私信、微信、Telegram、LINE、Snapchat 等聊天界面。

规则：
1. 按视觉顺序从上到下提取真实消息文本。
2. Instagram DM 和大多数聊天软件里，右侧气泡/消息是用户本人，speaker 填 "user"；左侧气泡/消息是对方，speaker 填 "target"。
3. 右侧蓝色、紫色、渐变色、彩色消息通常是用户；左侧灰色、白色、深色消息通常是对方。
4. 忽略状态栏、昵称栏、资料按钮、时间、Seen/Delivered、已读提示、表情反应计数、键盘、输入框、相机/语音按钮、广告、底部导航。
5. 不要强制要求完美气泡。Instagram DM 可能是紧凑消息行、深色模式文字、转发帖子、回复片段、表情反应或图片占位。只要是聊天区域里的可读消息，就要提取。
6. 如果一条消息只能看清一部分，就提取看清的部分并降低 confidence，不要编造。
7. 手机号、地址、身份证、学校、公司等敏感信息用 [REDACTED] 替换。
8. 不做恋爱分析，不给建议，只返回结构化消息。
9. 只返回严格 JSON，不要 Markdown。
${relaxed ? "10. 重要：只要图里存在任何可读聊天内容，就不要返回空 messages。请宽松提取短句、表情和回复片段。" : ""}

JSON 结构：
${jsonShape}`;
}

async function parseWithPrompt(
  baseUrl: string,
  apiKey: string,
  model: string,
  imageContent: QwenMessageContent[],
  prompt: string,
  locale: "zh-CN" | "en-US",
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }, ...imageContent],
          },
        ],
        temperature: 0.05,
        max_tokens: 2200,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Chat screenshot parsing timed out. Please try one clearer screenshot first.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Vision parsing failed: ${response.status}${detail ? ` ${detail}` : ""}`);
  }

  const data = (await response.json()) as QwenResponse;
  const content = extractContent(data);
  if (!content) throw new Error("The vision model returned an empty response.");
  try {
    return normalizeParsedResult(JSON.parse(extractJson(content)), locale);
  } catch (error) {
    console.error("Qwen parse raw content:", content.slice(0, 1200));
    throw error;
  }
}
