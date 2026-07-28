import { NextResponse } from "next/server";
import { parsedMessagesToChatText } from "@/lib/chat-image-parser";
import { parseWechatTranscript, normalizeChatText } from "@/lib/chat-text-parser";
import { analyzeChatWithDeepSeek, createInsufficientReport } from "@/lib/deepseek";
import { analysisModes, type AnalysisMode, type ParsedChatImageMessage, type RoleContext } from "@/types/report";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      chatText?: string;
      mode?: AnalysisMode;
      parsedMessages?: ParsedChatImageMessage[];
      roleContext?: RoleContext;
    };
    const parsedChatText = Array.isArray(body.parsedMessages) ? parsedMessagesToChatText(body.parsedMessages) : "";
    const rawChatText = normalizeChatText(parsedChatText || body.chatText || "");
    const parsedTranscript = parseWechatTranscript(rawChatText);
    const chatText = normalizeChatText(parsedTranscript.normalizedText || rawChatText);
    console.log("received chatText length:", chatText.length);
    console.log("received chatText preview:", chatText.slice(0, 500));
    console.log("parsed messages:", parsedTranscript.messages.length, "speakers:", parsedTranscript.speakers.join(","));
    const mode = body.mode ?? "comprehensive";
    const validMode =
      typeof mode === "string" && (analysisModes.some((item) => item.value === mode) || mode.length > 0);

    if (!validMode) {
      return NextResponse.json({ error: "未知分析模式" }, { status: 400 });
    }

    if (!chatText.trim()) {
      return NextResponse.json({ error: "请先粘贴聊天记录。" }, { status: 400 });
    }

    if (chatText.length < 20) {
      return NextResponse.json({ report: createInsufficientReport(mode) });
    }

    if (chatText.length > 30000) {
      return NextResponse.json({ error: "聊天记录太长，请先截取最关键的 1-2 段。" }, { status: 400 });
    }

    const roleContext: RoleContext | undefined = body.roleContext
      ? {
          ...body.roleContext,
          participants: body.roleContext.participants?.length ? body.roleContext.participants : parsedTranscript.speakers,
        }
      : parsedTranscript.speakers.length
        ? { participants: parsedTranscript.speakers }
        : undefined;

    const report = await analyzeChatWithDeepSeek(chatText, mode, roleContext);
    return NextResponse.json({ report });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "分析失败";
    return NextResponse.json(
      { error: message.includes("DEEPSEEK_API_KEY") ? message : "AI 分析暂时失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
