import { clampScore, compactText } from "@/lib/utils";
import type {
  ActionPlan,
  AnalysisMode,
  DeepSeekAnalysisReport,
  DeepSeekScores,
  EvidenceItem,
  RelationshipTrend,
  ReportConfidence,
  RoleContext,
} from "@/types/report";

type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

type DeepSeekResponse = {
  choices?: { message?: { content?: string } }[];
};

type PartialReport = Partial<DeepSeekAnalysisReport> & {
  scores?: Partial<DeepSeekScores>;
};

let cachedApiKey: string | null = null;

function getDeepSeekConfig() {
  cachedApiKey = cachedApiKey ?? process.env.DEEPSEEK_API_KEY ?? "";
  return {
    apiKey: cachedApiKey,
    baseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, ""),
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  };
}

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("DeepSeek response did not contain JSON.");
  return raw.slice(start, end + 1);
}

function stringList(value: unknown, fallback: string[], limit: number) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => compactText(String(item ?? ""), 90))
    .filter(Boolean)
    .slice(0, limit);
  return items.length ? items : fallback;
}

function evidenceList(value: unknown, fallback: EvidenceItem[], limit: number, locale: "zh-CN" | "en-US" = "zh-CN") {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => {
      const input = item as Partial<EvidenceItem>;
      return {
        quote: compactText(String(input.quote ?? ""), 90),
        reason: compactText(String(input.reason ?? ""), 140),
        strength: locale === "en-US" ? normalizeEnglishStrength(input.strength) : normalizeStrength(input.strength),
      };
    })
    .filter((item) => item.quote && item.reason)
    .slice(0, limit);
  return items.length ? items : fallback;
}

function normalizeEnglishStrength(value: unknown): "Strong" | "Medium" | "Weak" {
  const text = String(value || "").toLowerCase();
  if (text.includes("strong") || text.includes("high") || text.includes("强")) return "Strong";
  if (text.includes("weak") || text.includes("low") || text.includes("弱")) return "Weak";
  return "Medium";
}

function normalizeStrength(value: unknown): "强" | "中" | "弱" {
  const text = String(value || "");
  if (text.includes("强")) return "强";
  if (text.includes("弱")) return "弱";
  return "中";
}

function confidencePayload(value: unknown, fallback: ReportConfidence): ReportConfidence {
  const input = value as Partial<ReportConfidence>;
  return {
    level: compactText(String(input.level || fallback.level), 8),
    reason: compactText(String(input.reason || fallback.reason), 160),
    messageCount: Number.isFinite(Number(input.messageCount))
      ? Math.max(0, Math.round(Number(input.messageCount)))
      : fallback.messageCount,
    speakerBalance: compactText(String(input.speakerBalance || fallback.speakerBalance), 80),
    limitations: stringList(input.limitations, fallback.limitations, 4),
  };
}

function trendPayload(value: unknown, fallback: RelationshipTrend): RelationshipTrend {
  const input = value as Partial<RelationshipTrend>;
  return {
    label: compactText(String(input.label || fallback.label), 12),
    reason: compactText(String(input.reason || fallback.reason), 160),
  };
}

function replySuggestions(value: unknown, fallback: ActionPlan["nextReplies"], limit: number) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => {
      const input = item as Partial<ActionPlan["nextReplies"][number]>;
      return {
        style: compactText(String(input.style || ""), 20),
        text: compactText(String(input.text || ""), 160),
      };
    })
    .filter((item) => item.style && item.text)
    .slice(0, limit);
  return items.length ? items : fallback;
}

function conditionalAdvice(value: unknown, fallback: ActionPlan["ifThen"], limit: number) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => {
      const input = item as Partial<ActionPlan["ifThen"][number]>;
      return {
        scenario: compactText(String(input.scenario || ""), 40),
        advice: compactText(String(input.advice || ""), 160),
      };
    })
    .filter((item) => item.scenario && item.advice)
    .slice(0, limit);
  return items.length ? items : fallback;
}

function actionPlanPayload(value: unknown, fallback: ActionPlan): ActionPlan {
  const input = value as Partial<ActionPlan>;
  return {
    strategy: compactText(String(input.strategy || fallback.strategy), 120),
    nextReplies: replySuggestions(input.nextReplies, fallback.nextReplies, 4),
    ifThen: conditionalAdvice(input.ifThen, fallback.ifThen, 4),
    dontDo: stringList(input.dontDo, fallback.dontDo, 4),
  };
}

function softenRiskScore(value: unknown, fallback: number, type: "normal" | "strict" | "cold") {
  const score = clampScore(value, fallback);
  if (score >= 88) return Math.max(78, score - 4);
  if (score >= 72) return Math.round(score * (type === "strict" ? 0.9 : type === "cold" ? 0.92 : 0.94));
  if (score >= 45) return Math.round(score * (type === "strict" ? 0.84 : type === "cold" ? 0.88 : 0.91));
  return score;
}

function softenOverallScore(value: unknown, fallback: number) {
  const score = clampScore(value, fallback);
  if (score >= 88) return Math.max(80, score - 4);
  if (score >= 65) return Math.round(score * 0.94);
  if (score >= 40) return Math.round(score * 0.9);
  return score;
}

function calibratedRiskLevel(riskLevel: string, overallScore: number, insufficient: boolean, locale: "zh-CN" | "en-US") {
  if (insufficient) return locale === "en-US" ? "Insufficient context" : "信息不足";
  const level = compactText(riskLevel || "中等风险", 20);
  if (overallScore < 45 && /高|中高/.test(level)) return "轻微风险";
  if (overallScore < 65 && /高|中高/.test(level)) return "中等风险";
  if (overallScore < 78 && level === "高风险") return "中高风险";
  return level;
}

function normalizeReport(value: unknown, mode: AnalysisMode, locale: "zh-CN" | "en-US" = "zh-CN"): DeepSeekAnalysisReport {
  const input = value as PartialReport;
  const insufficient = input.riskLevel === "信息不足" || input.riskLevel === "Insufficient context";
  const english = locale === "en-US";
  const scores: Partial<DeepSeekScores> = input.scores ?? {};
  const fallbackScore = insufficient ? 20 : 50;
  const overallScore = insufficient ? clampScore(input.overallScore, 15) : softenOverallScore(input.overallScore, 50);
  const fallbackConfidence: ReportConfidence = insufficient
    ? {
        level: english ? "Low" : "低",
        reason: english ? "The sample is too short to establish a reliable pattern." : "聊天样本太短，缺少连续上下文，只能做轻量判断。",
        messageCount: 0,
        speakerBalance: english ? "There is not enough context to compare both sides." : "样本不足，无法判断双方发言比例。",
        limitations: english ? ["Long-term patterns cannot be assessed.", "Offline actions and intent cannot be confirmed."] : ["无法判断长期行为模式。", "无法确认线下行动和真实意图。"],
      }
    : {
        level: english ? "Medium" : "中",
        reason: english ? "The chat shows some interaction signals, but a longer timeline would be more reliable." : "当前聊天能看出部分互动信号，但仍建议结合更长时间线观察。",
        messageCount: 0,
        speakerBalance: english ? "The balance between both speakers needs more context." : "双方发言比例需要结合原始聊天判断。",
        limitations: english ? ["A fragment cannot confirm a long-term personality pattern.", "Offline actions cannot be confirmed."] : ["不能仅凭片段确认长期人格模式。", "无法确认线下行动是否一致。"],
      };
  const fallbackActionPlan: ActionPlan = {
    strategy: insufficient ? (english ? "Add more context before making a stronger read." : "先补充更多上下文，再做判断。") : (english ? "Reduce emotional over-investment and use one clear conversation to get clearer feedback." : "先降低情绪消耗，用一次清晰沟通换取更明确反馈。"),
    nextReplies: [
      {
        style: english ? "Gentle check-in" : "温和沟通版",
        text: english ? "I want to understand how you feel, and I would appreciate a more direct conversation." : "我想更清楚地了解你的想法，也希望我们沟通得具体一点。",
      },
      {
        style: english ? "Clear boundary" : "边界感版",
        text: english ? "If you are not ready to move this forward, you can tell me directly and I will adjust my investment." : "如果你暂时不想推进关系，可以直接说，我也会调整自己的投入。",
      },
    ],
    ifThen: [
      {
        scenario: english ? "If they respond openly" : "如果对方积极回应",
        advice: english ? "Keep watching whether their actions match their words." : "继续观察实际行动，不急着一次性加大投入。",
      },
      {
        scenario: english ? "If they stay vague" : "如果对方继续模糊",
        advice: english ? "Stop chasing clarity repeatedly and return attention to your own rhythm." : "减少主动追问，把注意力收回到自己的生活节奏。",
      },
    ],
    dontDo: english ? ["Do not repeatedly ask why they are not replying.", "Do not use tests or threats to force an answer."] : ["不要连续追问对方为什么不回。", "不要用测试或威胁逼对方表态。"],
  };

  return {
    mode,
    overallScore,
    riskLevel: calibratedRiskLevel(
      String(input.riskLevel || (insufficient ? (english ? "Insufficient context" : "信息不足") : (english ? "Moderate risk" : "中等风险"))),
      overallScore,
      insufficient,
      locale,
    ),
    relationshipStage: compactText(String(input.relationshipStage || (english ? "Unclear stage" : "关系阶段不明")), 30),
    summary: compactText(
      String(input.summary || (english ? "There is not enough context for a confident read yet." : "聊天记录信号不足，只能做轻量娱乐判断。")),
      220,
    ),
    scores: {
      sincerity: clampScore(scores.sincerity, fallbackScore),
      avoidance: insufficient ? clampScore(scores.avoidance, fallbackScore) : softenRiskScore(scores.avoidance, fallbackScore, "normal"),
      coldViolence: insufficient
        ? clampScore(scores.coldViolence, fallbackScore)
        : softenRiskScore(scores.coldViolence, fallbackScore, "cold"),
      breadcrumbing: insufficient
        ? clampScore(scores.breadcrumbing, fallbackScore)
        : softenRiskScore(scores.breadcrumbing, fallbackScore, "normal"),
      manipulation: insufficient
        ? clampScore(scores.manipulation, Math.min(fallbackScore, 30))
        : softenRiskScore(scores.manipulation, Math.min(fallbackScore, 30), "strict"),
      overInvestmentRisk: insufficient
        ? clampScore(scores.overInvestmentRisk, fallbackScore)
        : softenRiskScore(scores.overInvestmentRisk, fallbackScore, "normal"),
    },
    riskTags: stringList(input.riskTags, insufficient ? [english ? "Insufficient context" : "信息不足"] : [english ? "Worth observing" : "需要继续观察"], 5),
    confidence: confidencePayload(input.confidence, fallbackConfidence),
    relationshipTrend: trendPayload(input.relationshipTrend, {
      label: insufficient ? (english ? "Not enough data" : "样本不足") : (english ? "Observe" : "继续观察"),
      reason: insufficient ? (english ? "The chat is too short to assess the relationship direction." : "聊天记录太短，无法判断关系走势。") : (english ? "The current signals are not enough for a definite conclusion; watch whether future actions stay consistent." : "当前信号还不足以做绝对判断，建议看后续行动一致性。"),
    }),
    redFlags: evidenceList(
      input.redFlags,
      [{ quote: english ? "Not enough chat context" : "聊天记录不足", reason: english ? "There is not enough context for stable evidence." : "缺少足够上下文，无法提取稳定风险证据。", strength: "弱" }],
      4,
      locale,
    ),
    greenFlags: evidenceList(
      input.greenFlags,
      [{ quote: english ? "Worth observing" : "仍可继续观察", reason: english ? "This fragment should not be treated as a definite verdict." : "仅凭当前片段不宜做绝对判断。", strength: "弱" }],
      4,
      locale,
    ),
    behaviorPattern: compactText(
      String(input.behaviorPattern || (english ? "This fragment is not enough to identify a stable behavior pattern." : "当前片段不足以判断稳定行为模式。")),
      180,
    ),
    suggestions: stringList(
      input.suggestions,
      english ? ["Add more chat context before drawing a stronger conclusion.", "Watch whether their replies and actions remain consistent."] : ["补充更多聊天上下文后再分析。", "先观察对方是否有稳定回应和实际行动。"],
      4,
    ),
    replyExamples: stringList(
      input.replyExamples,
      english ? ["I want to understand how you feel, and I would appreciate a more direct conversation."] : ["我想更清楚地了解你的想法，也希望我们沟通得具体一点。"],
      4,
    ),
    actionPlan: actionPlanPayload(input.actionPlan, fallbackActionPlan),
    shareCardText: compactText(
      String(input.shareCardText || (english ? "Love Radar report: not enough context yet. Add more chat to get a clearer read." : "恋爱雷达报告：当前信息不足，建议补充聊天记录后再判断。")),
      120,
    ),
  };
}

export function createInsufficientReport(mode: AnalysisMode, locale: "zh-CN" | "en-US" = "zh-CN"): DeepSeekAnalysisReport {
  if (locale === "en-US") {
    return normalizeReport({
      overallScore: 15, riskLevel: "Insufficient context", relationshipStage: "Not enough data",
      summary: "This chat is too short to identify a reliable relationship pattern.",
      scores: { sincerity: 20, avoidance: 20, coldViolence: 10, breadcrumbing: 15, manipulation: 5, overInvestmentRisk: 20 },
      riskTags: ["Insufficient context", "Add more messages"],
      redFlags: [{ quote: "Chat sample is too short", reason: "There are not enough lines to support a risk signal." }],
      greenFlags: [{ quote: "Worth observing", reason: "A short fragment should not be treated as a verdict." }],
      behaviorPattern: "There is not enough context to identify a stable behavior pattern.",
      suggestions: ["Add 20-80 recent messages for a clearer read.", "Keep both sides and the surrounding context."],
      replyExamples: ["I would like to understand how you feel. Can we talk more directly?"],
      shareCardText: "Love Radar report: not enough context yet.",
    }, mode, locale);
  }
  return normalizeReport(
    {
      overallScore: 15,
      riskLevel: "信息不足",
      relationshipStage: "样本不足",
      summary: "这段聊天记录太短，缺少稳定互动信号，只能做轻量娱乐判断。",
      scores: {
        sincerity: 20,
        avoidance: 20,
        coldViolence: 10,
        breadcrumbing: 15,
        manipulation: 5,
        overInvestmentRisk: 20,
      },
      riskTags: ["信息不足", "建议补充上下文"],
      redFlags: [{ quote: "聊天记录太短", reason: "没有足够原句支撑风险判断。" }],
      greenFlags: [{ quote: "仍可继续观察", reason: "当前片段不足以说明关系一定存在问题。" }],
      behaviorPattern: "暂时无法判断稳定行为模式。",
      suggestions: ["补充最近 20-80 条聊天记录。", "尽量保留双方昵称、时间线和关键上下文。"],
      replyExamples: ["我想更清楚地了解你的想法，我们可以具体聊聊吗？"],
      shareCardText: "恋爱雷达报告：信息不足，建议补充更多聊天后再分析。",
    },
    mode,
  );
}

function modeLabel(mode: AnalysisMode, locale: "zh-CN" | "en-US" = "zh-CN") {
  if (locale === "en-US") {
    const labels: Record<string, string> = { comprehensive: "Overall analysis", fishing: "Are they keeping options open?", cold_violence: "Could this be silent treatment?", sincerity: "How sincere are they?", worth_investing: "Is this worth more investment?", ambiguity_progress: "Will this relationship move forward?", post_breakup_chance: "Is there a chance after no contact?" };
    return labels[String(mode)] ?? String(mode || "Overall analysis");
  }
  const labels: Record<string, string> = {
    comprehensive: "综合分析",
    fishing: "是否养鱼",
    cold_violence: "是否冷暴力",
    sincerity: "是否真诚",
    worth_investing: "是否值得继续投入",
    ambiguity_progress: "暧昧推进概率",
    post_breakup_chance: "断联后还有没有机会",
  };
  return labels[String(mode)] ?? String(mode || "综合分析");
}

function roleInstruction(roleContext?: RoleContext, locale: "zh-CN" | "en-US" = "zh-CN") {
  const participants = roleContext?.participants?.filter(Boolean).slice(0, 4) ?? [];
  const selfName = roleContext?.selfName?.trim();
  const targetName = roleContext?.targetName?.trim();

  if (selfName && targetName) {
    return locale === "en-US" ? `The user confirmed the viewpoint: "${selfName}" is the user and should be called "you"; "${targetName}" is the other person and should be called "the other person". Do not include names in the final output.` : `用户已确认分析视角：微信昵称“${selfName}”代表用户本人，最终报告里称为“你”；微信昵称“${targetName}”代表分析对象，最终报告里称为“对方”。昵称只用于理解对话角色，不要出现在最终输出字段中。`;
  }

  if (participants.length >= 2) {
    return locale === "en-US" ? `The detected participants are ${participants.join(", ")}. The viewpoint is unconfirmed; use "Person A/Person B" if uncertain.` : `系统识别到聊天对象：${participants.join("、")}。用户未确认视角，请根据聊天内容判断；不确定时使用“A方/B方”，不要强行认定谁是用户。`;
  }

  return locale === "en-US" ? "The two speakers are not reliably identified. Use Person A/Person B rather than inventing identities." : "未稳定识别双方昵称。不确定时使用“A方/B方”，不要编造身份。";
}

export async function analyzeChatWithDeepSeek(
  chatText: string,
  mode: AnalysisMode,
  roleContext?: RoleContext,
  locale: "zh-CN" | "en-US" = "zh-CN",
): Promise<DeepSeekAnalysisReport> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  if (!apiKey) {
    throw new Error("服务端未配置 DEEPSEEK_API_KEY，无法生成真实 AI 报告。");
  }

  const englishPrompt = `Analysis mode: ${modeLabel(mode, "en-US")}

Role context:
${roleInstruction(roleContext, "en-US")}

You must analyze only the supplied conversation and return English text in every human-readable field. Do not output Chinese, even if the chat contains Chinese. Keep evidence quotes in their original language, but write every reason, label, summary, suggestion, action plan field, and share card sentence in English.

Rules:
1. Scores, tags, suggestions, and conclusions must change when the supplied chat changes.
2. redFlags and greenFlags must quote exact sentences from the chat. Never invent evidence.
3. If context is insufficient, set riskLevel to "Insufficient context" and explain the limitation in English without forcing a verdict.
4. Use "you" and "the other person", or "Person A" and "Person B". Do not expose usernames in the output.
5. Do not diagnose mental health, make absolute judgments, insult anyone, or encourage extreme behavior.
6. Be slightly forgiving: one short reply, one delayed response, or a normal explanation of being busy is not enough for a high-risk score.
7. High risk requires repeated evidence or a clear pattern. Emotional manipulation requires clear belittling, threats, isolation, control, or repeated blame.
8. Include confidence, evidence strength, relationship trend, and an actionable plan with gentle, clear-boundary, and light-check-in reply options.
9. Use only these English evidence strength values: "Strong", "Medium", or "Weak".
10. Use an English relationship trend label such as "Warming", "Stable", "Push-pull", "Cooling", "Stalled", "Near no-contact", or "Insufficient data".

Return strict JSON only with exactly this structure:
{
  "overallScore": 78,
  "riskLevel": "Moderate risk",
  "relationshipStage": "Talking stage",
  "summary": "A concise English summary grounded in the conversation.",
  "scores": { "sincerity": 42, "avoidance": 55, "coldViolence": 20, "breadcrumbing": 45, "manipulation": 15, "overInvestmentRisk": 60 },
  "riskTags": ["Mixed signals", "Low clarity"],
  "confidence": { "level": "Medium", "reason": "Explain how reliable the sample is.", "messageCount": 20, "speakerBalance": "Describe the balance in English.", "limitations": ["Name a limitation in English."] },
  "relationshipTrend": { "label": "Push-pull", "reason": "Explain the trend in English." },
  "redFlags": [{ "quote": "Exact sentence from the chat", "reason": "Explain the concern in English.", "strength": "Medium" }],
  "greenFlags": [{ "quote": "Exact sentence from the chat", "reason": "Explain the positive signal in English.", "strength": "Medium" }],
  "behaviorPattern": "Describe the observed communication pattern in English.",
  "suggestions": ["Give practical advice in English."],
  "replyExamples": ["Give a natural English reply."],
  "actionPlan": {
    "strategy": "Give the main next step in English.",
    "nextReplies": [
      { "style": "Gentle check-in", "text": "A natural English reply." },
      { "style": "Clear boundary", "text": "A natural English reply." },
      { "style": "Light check-in", "text": "A natural English reply." }
    ],
    "ifThen": [{ "scenario": "If they respond openly", "advice": "Give advice in English." }],
    "dontDo": ["Give a calm thing to avoid in English."]
  },
  "shareCardText": "A short English share-card sentence."
}

Conversation:
${chatText.slice(0, 12000)}`;

  const messages: DeepSeekMessage[] = [
    {
      role: "system",
      content:
        locale === "en-US" ? "You are an AI relationship analyst for Love Radar AI. Analyze only the user's actual conversation. Never use a fixed result or invent evidence. Do not diagnose mental health, make absolute judgments, insult anyone, or encourage extreme behavior. Use a warm, non-judgmental tone and express uncertainty where appropriate. This is for entertainment and communication reference only. Return strict JSON only, with no Markdown or explanation." : "你是 Love Radar（恋爱雷达）的娱乐向聊天关系分析 AI。你必须基于用户提供的聊天记录分析，不允许输出固定模板或编造证据。不要做心理诊断，不要给绝对判断，不要使用侮辱性语言，不要鼓励极端行为。整体语气要有提醒感但不审判：像朋友帮忙看信号，不像法官下结论。你的输出只作为娱乐和沟通参考。你必须只返回严格 JSON，不要 Markdown，不要解释。",
    },
    {
      role: "user",
      content: locale === "en-US" ? englishPrompt : `${(locale as "zh-CN" | "en-US") === "en-US" ? "Analysis mode" : "分析模式"}: ${modeLabel(mode, locale)}

角色信息：
${roleInstruction(roleContext, locale)}

任务：
1. ${(locale as "zh-CN" | "en-US") === "en-US" ? "Base every score, tag, suggestion, and conclusion on the supplied chat. Scores must change when the chat changes." : "必须基于下面的聊天记录动态分析，分数必须随聊天内容变化。"}
2. redFlags 和 greenFlags 必须引用聊天记录中的具体原句；不要引用不存在的句子。
3. 如果信息不足，明确返回 riskLevel 为“信息不足”，summary 说明原因，分数降低置信度，不要强行判断。
4. 最终报告用“你/对方”或“A方/B方”，不要泄露微信昵称。
5. 不保存、不复述完整聊天记录，只提取必要证据短句。
6. 评分要比“吐槽向测试”稍微宽松：不要因为单句冷淡、一次慢回复、普通忙碌解释就判高风险。
7. 高风险必须有重复证据或明显模式；冷暴力、养鱼、情绪操控不能只凭一两句模糊话就打高分。
8. 普通忙碌、表达不清、关系未明确推进，优先归为“建议观察/轻微风险/中等风险”，除非聊天里有连续回避、贬低、威胁、控制、长期消失等证据。
9. PUA/情绪操控风险尤其要严格：没有明显贬低、威胁、孤立、控制、反复让对方自责，就不要给高分。
10. 分享标签可以轻度调侃，但正文结论要温和、证据驱动，多用“可能”“倾向”“建议观察”，少用绝对判断。
11. 必须输出“样本可信度”：根据聊天条数、双方发言比例、上下文连续性，说明本次判断有多可靠。
12. 必须输出“证据强度”：redFlags/greenFlags 每条都要有 strength，取值只能是“强”“中”“弱”。强信号必须是重复出现或语义明确；单句模糊表达只能是弱或中。
13. 必须输出“关系走势”：只能从“升温、稳定、拉扯、降温、停滞、断联边缘、样本不足”里选择或接近表达，并说明依据。
14. 必须输出“行动方案”：重点给用户现在就能复制使用的话术，包含温和沟通版、边界感版、轻松试探版，且不要煽动吵架、报复、威胁或极端行为。
15. 如果分析模式是“暧昧推进概率”，重点判断是否有主动邀约、未来计划、关系确认、模糊不推进；如果是“断联后还有没有机会”，重点判断沟通窗口、明确拒绝、情绪残留和复联风险。

严格返回以下 JSON 结构，字段名不能改变：
{
  "overallScore": 78,
  "riskLevel": "中高风险",
  "relationshipStage": "暧昧期",
  "summary": "这段聊天中存在回避承诺、低投入和情绪拉扯信号。",
  "scores": {
    "sincerity": 42,
    "avoidance": 86,
    "coldViolence": 63,
    "breadcrumbing": 79,
    "manipulation": 38,
    "overInvestmentRisk": 72
  },
  "riskTags": ["回避承诺", "忽冷忽热", "低投入高占用"],
  "confidence": {
    "level": "中",
    "reason": "聊天轮次较完整，但时间跨度有限，适合判断当前沟通状态，不适合下长期定论。",
    "messageCount": 38,
    "speakerBalance": "双方发言较均衡，对方回应略偏短。",
    "limitations": ["无法确认线下行动是否一致", "不能仅凭片段判断长期人格模式"]
  },
  "relationshipTrend": {
    "label": "拉扯",
    "reason": "对方保持回应，但在明确安排和关系推进上反复模糊。"
  },
  "redFlags": [
    { "quote": "到时候再看吧", "reason": "这句话回避了明确安排，可能代表低投入或拖延。", "strength": "强" }
  ],
  "greenFlags": [
    { "quote": "我最近确实有点忙", "reason": "这句话有一定解释意愿，说明并非完全拒绝沟通。", "strength": "中" }
  ],
  "behaviorPattern": "对方倾向于维持聊天热度，但回避明确关系推进。",
  "suggestions": [
    "降低情绪投入，观察对方是否有实际行动。",
    "可以直接表达自己的需求。"
  ],
  "replyExamples": [
    "我理解你最近忙，但我也需要更明确的相处节奏。"
  ],
  "actionPlan": {
    "strategy": "降低情绪投入，保留一次明确沟通，看对方是否给出具体行动。",
    "nextReplies": [
      { "style": "温和沟通版", "text": "我理解你最近忙，但我也想知道我们接下来是不是还有继续了解的空间。" },
      { "style": "边界感版", "text": "如果你暂时不想推进关系，可以直接告诉我，我也会调整自己的投入。" },
      { "style": "轻松试探版", "text": "那我先不脑补啦，你有空的时候我们再约个具体时间？" }
    ],
    "ifThen": [
      { "scenario": "如果对方积极回应", "advice": "继续观察实际行动，不急着加大投入。" },
      { "scenario": "如果对方继续模糊", "advice": "减少主动追问，把注意力收回到自己的生活节奏。" }
    ],
    "dontDo": ["不要连续追问对方为什么不回", "不要用测试或威胁逼对方表态"]
  },
  "shareCardText": "恋爱雷达报告：回避承诺指数86，建议先降温观察。"
}

聊天记录：
${chatText.slice(0, 12000)}`,
    },
  ];

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.65,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek request failed: ${response.status}${detail ? ` ${detail}` : ""}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("DeepSeek returned an empty response.");
  return normalizeReport(JSON.parse(extractJson(content)), mode, locale);
}
