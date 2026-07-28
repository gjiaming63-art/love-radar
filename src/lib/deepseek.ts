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

function evidenceList(value: unknown, fallback: EvidenceItem[], limit: number) {
  if (!Array.isArray(value)) return fallback;
  const items = value
    .map((item) => {
      const input = item as Partial<EvidenceItem>;
      return {
        quote: compactText(String(input.quote ?? ""), 90),
        reason: compactText(String(input.reason ?? ""), 140),
        strength: normalizeStrength(input.strength),
      };
    })
    .filter((item) => item.quote && item.reason)
    .slice(0, limit);
  return items.length ? items : fallback;
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

function calibratedRiskLevel(riskLevel: string, overallScore: number, insufficient: boolean) {
  if (insufficient) return "信息不足";
  const level = compactText(riskLevel || "中等风险", 20);
  if (overallScore < 45 && /高|中高/.test(level)) return "轻微风险";
  if (overallScore < 65 && /高|中高/.test(level)) return "中等风险";
  if (overallScore < 78 && level === "高风险") return "中高风险";
  return level;
}

function normalizeReport(value: unknown, mode: AnalysisMode): DeepSeekAnalysisReport {
  const input = value as PartialReport;
  const insufficient = input.riskLevel === "信息不足";
  const scores: Partial<DeepSeekScores> = input.scores ?? {};
  const fallbackScore = insufficient ? 20 : 50;
  const overallScore = insufficient ? clampScore(input.overallScore, 15) : softenOverallScore(input.overallScore, 50);
  const fallbackConfidence: ReportConfidence = insufficient
    ? {
        level: "低",
        reason: "聊天样本太短，缺少连续上下文，只能做轻量判断。",
        messageCount: 0,
        speakerBalance: "样本不足，无法判断双方发言比例。",
        limitations: ["无法判断长期行为模式。", "无法确认线下行动和真实意图。"],
      }
    : {
        level: "中",
        reason: "当前聊天能看出部分互动信号，但仍建议结合更长时间线观察。",
        messageCount: 0,
        speakerBalance: "双方发言比例需要结合原始聊天判断。",
        limitations: ["不能仅凭片段确认长期人格模式。", "无法确认线下行动是否一致。"],
      };
  const fallbackActionPlan: ActionPlan = {
    strategy: insufficient ? "先补充更多上下文，再做判断。" : "先降低情绪消耗，用一次清晰沟通换取更明确反馈。",
    nextReplies: [
      {
        style: "温和沟通版",
        text: "我想更清楚地了解你的想法，也希望我们沟通得具体一点。",
      },
      {
        style: "边界感版",
        text: "如果你暂时不想推进关系，可以直接说，我也会调整自己的投入。",
      },
    ],
    ifThen: [
      {
        scenario: "如果对方积极回应",
        advice: "继续观察实际行动，不急着一次性加大投入。",
      },
      {
        scenario: "如果对方继续模糊",
        advice: "减少主动追问，把注意力收回到自己的生活节奏。",
      },
    ],
    dontDo: ["不要连续追问对方为什么不回。", "不要用测试或威胁逼对方表态。"],
  };

  return {
    mode,
    overallScore,
    riskLevel: calibratedRiskLevel(String(input.riskLevel || (insufficient ? "信息不足" : "中等风险")), overallScore, insufficient),
    relationshipStage: compactText(String(input.relationshipStage || "关系阶段不明"), 30),
    summary: compactText(
      String(input.summary || "聊天记录信号不足，只能做轻量娱乐判断。"),
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
    riskTags: stringList(input.riskTags, insufficient ? ["信息不足"] : ["需要继续观察"], 5),
    confidence: confidencePayload(input.confidence, fallbackConfidence),
    relationshipTrend: trendPayload(input.relationshipTrend, {
      label: insufficient ? "样本不足" : "继续观察",
      reason: insufficient ? "聊天记录太短，无法判断关系走势。" : "当前信号还不足以做绝对判断，建议看后续行动一致性。",
    }),
    redFlags: evidenceList(
      input.redFlags,
      [{ quote: "聊天记录不足", reason: "缺少足够上下文，无法提取稳定风险证据。", strength: "弱" }],
      4,
    ),
    greenFlags: evidenceList(
      input.greenFlags,
      [{ quote: "仍可继续观察", reason: "仅凭当前片段不宜做绝对判断。", strength: "弱" }],
      4,
    ),
    behaviorPattern: compactText(
      String(input.behaviorPattern || "当前片段不足以判断稳定行为模式。"),
      180,
    ),
    suggestions: stringList(
      input.suggestions,
      ["补充更多聊天上下文后再分析。", "先观察对方是否有稳定回应和实际行动。"],
      4,
    ),
    replyExamples: stringList(
      input.replyExamples,
      ["我想更清楚地了解你的想法，也希望我们沟通得具体一点。"],
      4,
    ),
    actionPlan: actionPlanPayload(input.actionPlan, fallbackActionPlan),
    shareCardText: compactText(
      String(input.shareCardText || "恋爱雷达报告：当前信息不足，建议补充聊天记录后再判断。"),
      120,
    ),
  };
}

export function createInsufficientReport(mode: AnalysisMode): DeepSeekAnalysisReport {
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

function modeLabel(mode: AnalysisMode) {
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

function roleInstruction(roleContext?: RoleContext) {
  const participants = roleContext?.participants?.filter(Boolean).slice(0, 4) ?? [];
  const selfName = roleContext?.selfName?.trim();
  const targetName = roleContext?.targetName?.trim();

  if (selfName && targetName) {
    return `用户已确认分析视角：微信昵称“${selfName}”代表用户本人，最终报告里称为“你”；微信昵称“${targetName}”代表分析对象，最终报告里称为“对方”。昵称只用于理解对话角色，不要出现在最终输出字段中。`;
  }

  if (participants.length >= 2) {
    return `系统识别到聊天对象：${participants.join("、")}。用户未确认视角，请根据聊天内容判断；不确定时使用“A方/B方”，不要强行认定谁是用户。`;
  }

  return "未稳定识别双方昵称。不确定时使用“A方/B方”，不要编造身份。";
}

export async function analyzeChatWithDeepSeek(
  chatText: string,
  mode: AnalysisMode,
  roleContext?: RoleContext,
): Promise<DeepSeekAnalysisReport> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  if (!apiKey) {
    throw new Error("服务端未配置 DEEPSEEK_API_KEY，无法生成真实 AI 报告。");
  }

  const messages: DeepSeekMessage[] = [
    {
      role: "system",
      content:
        "你是 Love Radar（恋爱雷达）的娱乐向聊天关系分析 AI。你必须基于用户提供的聊天记录分析，不允许输出固定模板或编造证据。不要做心理诊断，不要给绝对判断，不要使用侮辱性语言，不要鼓励极端行为。整体语气要有提醒感但不审判：像朋友帮忙看信号，不像法官下结论。你的输出只作为娱乐和沟通参考。你必须只返回严格 JSON，不要 Markdown，不要解释。",
    },
    {
      role: "user",
      content: `分析模式：${modeLabel(mode)}

角色信息：
${roleInstruction(roleContext)}

任务：
1. 必须基于下面的聊天记录动态分析，分数必须随聊天内容变化。
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
  return normalizeReport(JSON.parse(extractJson(content)), mode);
}
