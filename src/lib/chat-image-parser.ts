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
  if (start < 0 || end < start) throw new Error("视觉模型没有返回 JSON。");
  return raw.slice(start, end + 1);
}

function extractContent(data: QwenResponse) {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => item.text ?? "").join("\n");
  return "";
}

function normalizeParsedResult(value: unknown): ParsedChatImageResult {
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
    safeMessages.map((item) => `${item.speaker === "user" ? "我" : "对方"}：${item.text}`).join("\n") ||
    compactText(String(input.chatText || ""), 12000);

  if (!safeMessages.length && !chatText.trim()) {
    throw new Error("视觉模型没有从截图中解析出有效聊天气泡。");
  }

  return {
    messages: safeMessages,
    participants: {
      userLabel: compactText(String(input.participants?.userLabel || "我"), 20),
      targetLabel: compactText(String(input.participants?.targetLabel || "对方"), 20),
    },
    warnings: Array.isArray(input.warnings)
      ? input.warnings.map((item) => compactText(String(item || ""), 120)).filter(Boolean).slice(0, 5)
      : [],
    chatText,
  };
}

export function parsedMessagesToChatText(messages: ParsedChatImageMessage[]) {
  return messages.map((item) => `${item.speaker === "user" ? "我" : "对方"}：${item.text}`).join("\n");
}

export async function parseChatImagesWithQwen(images: ChatImageInput[]): Promise<ParsedChatImageResult> {
  const { apiKey, baseUrl, model } = getQwenConfig();
  if (!apiKey) {
    throw new Error("服务端未配置 QWEN_VL_API_KEY 或 DASHSCOPE_API_KEY，暂时不能智能解析聊天截图。");
  }

  const imageContent: QwenMessageContent[] = images.map((image) => ({
    type: "image_url",
    image_url: {
      url: `data:${image.mimeType};base64,${image.base64}`,
    },
  }));

  const prompt = `你是 Love Radar 的聊天截图视觉解析器。请直接看懂微信/聊天软件截图，不要只做 OCR。

核心规则：
1. 多张图按用户上传顺序拼接，先处理第 1 张，再处理第 2 张，以此类推。
2. 必须识别聊天气泡左右关系：右侧气泡统一视为用户本人，speaker 填 "user"；左侧气泡统一视为对方，speaker 填 "target"。
3. 只提取真实聊天气泡内容。过滤时间、日期、备注、昵称栏、状态栏、电量、网络、返回按钮、输入框、键盘、转账按钮、表情面板、系统 UI、广告、底部菜单。
4. 如果某个气泡文字不完整或看不清，可以跳过或在 warnings 说明，不要编造。
5. 不分析恋爱关系，不输出建议，只做结构化解析。
6. 不要泄露截图中可能出现的手机号、地址、身份证、公司、学校等敏感信息；遇到这类信息用 [已打码] 替代。
7. 只返回严格 JSON，不要 Markdown，不要解释。禁止输出 JSON 之外的任何文字。

返回 JSON 结构：
{
  "messages": [
    {
      "speaker": "user",
      "text": "气泡里的原句",
      "sourceImageIndex": 1,
      "confidence": 0.92
    },
    {
      "speaker": "target",
      "text": "气泡里的原句",
      "sourceImageIndex": 1,
      "confidence": 0.88
    }
  ],
  "participants": {
    "userLabel": "我",
    "targetLabel": "对方"
  },
  "warnings": [],
  "chatText": "我：气泡里的原句\\n对方：气泡里的原句"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

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
        temperature: 0.1,
        max_tokens: 1800,
      }),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("聊天截图解析超时，请先上传 1 张更清晰的截图。");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`视觉解析失败：${response.status}${detail ? ` ${detail}` : ""}`);
  }

  const data = (await response.json()) as QwenResponse;
  const content = extractContent(data);
  if (!content) throw new Error("视觉模型返回为空。");
  try {
    return normalizeParsedResult(JSON.parse(extractJson(content)));
  } catch (error) {
    console.error("Qwen parse raw content:", content.slice(0, 1200));
    throw error;
  }
}
