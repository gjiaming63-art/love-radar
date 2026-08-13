import { compactText, clampScore } from "@/lib/utils";
import type { AstrologyReport } from "@/types/astrology";
import type { ChatAstrologyDimension, ChatAstrologyExpressionLevel, ChatAstrologyLayer } from "@/types/chat-astrology";
import { chatAstrologyDimensionKeys } from "@/types/chat-astrology";
import type { LoveReport } from "@/types/report";

type DeepSeekResponse = {
  choices?: { message?: { content?: string } }[];
};

type PartialLayer = Partial<Omit<ChatAstrologyLayer, "reportId" | "astrologySnapshot">> & {
  dimensions?: Partial<ChatAstrologyDimension>[];
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

function normalizeExpression(value: unknown): ChatAstrologyExpressionLevel {
  const text = String(value || "");
  if (/strong|明显|强/i.test(text)) return "Strongly Expressed";
  if (/not|未|没有|暂时/i.test(text)) return "Not Currently Expressed";
  return "Partially Expressed";
}

function normalizeDimensions(value: unknown): ChatAstrologyDimension[] {
  const input = Array.isArray(value) ? value : [];
  return chatAstrologyDimensionKeys.map((key) => {
    const found = input.find((item) => String((item as Partial<ChatAstrologyDimension>)?.key || "") === key) as
      | Partial<ChatAstrologyDimension>
      | undefined;
    return {
      key,
      realityEvidence: compactText(String(found?.realityEvidence || "聊天证据不足，暂时只能作为观察项。"), 220),
      astrologyPattern: compactText(String(found?.astrologyPattern || "星盘中有相关关系倾向，但不能单独作为判断依据。"), 220),
      aiConclusion: compactText(String(found?.aiConclusion || "建议优先看现实互动，再把星盘作为辅助解释。"), 240),
      expressionLevel: normalizeExpression(found?.expressionLevel),
    };
  });
}

function astrologySnapshot(astrology: AstrologyReport): ChatAstrologyLayer["astrologySnapshot"] {
  return {
    profileAName: astrology.profileAName,
    profileBName: astrology.profileBName,
    chartA: astrology.chartA,
    chartB: astrology.chartB,
    aspects: astrology.aspects.slice(0, 12),
    scores: astrology.scores,
    coreTags: astrology.coreTags,
    dataQualityNotice: astrology.dataQualityNotice,
    engineVersion: astrology.engineVersion,
    calculationSource: astrology.calculationSource,
  };
}

function estimateAlignmentScore(chatReport: LoveReport, astrology: AstrologyReport) {
  const realityFit =
    (chatReport.scores.sincerity +
      (100 - chatReport.scores.avoidance) +
      (100 - chatReport.scores.coldViolence) +
      (100 - chatReport.scores.breadcrumbing) +
      (100 - chatReport.scores.manipulation)) /
    5;
  const astroFit =
    astrology.scores.overall * 0.34 +
    astrology.scores.emotional * 0.18 +
    astrology.scores.communication * 0.16 +
    astrology.scores.chemistry * 0.14 +
    astrology.scores.stability * 0.18 -
    Math.max(0, astrology.scores.conflictRisk - 55) * 0.22;
  const conflictPenalty =
    (chatReport.scores.avoidance + chatReport.scores.coldViolence + chatReport.scores.breadcrumbing + chatReport.scores.manipulation) / 18;
  return clampScore(Math.round(realityFit * 0.48 + astroFit * 0.52 - conflictPenalty), 58);
}

function normalizeLayer(value: unknown, reportId: string, astrology: AstrologyReport, chatReport: LoveReport): ChatAstrologyLayer {
  const input = value as PartialLayer;
  const estimatedScore = estimateAlignmentScore(chatReport, astrology);
  const aiScore = clampScore(input.alignmentScore, estimatedScore);
  const alignmentScore = clampScore(Math.round(aiScore * 0.45 + estimatedScore * 0.55), estimatedScore);
  return {
    reportId,
    alignmentScore,
    alignmentLevel: normalizeExpression(input.alignmentLevel),
    summary: compactText(
      String(input.summary || "现实聊天是主证据，星盘显示的关系倾向可以作为理解互动模式的辅助参考。"),
      180,
    ),
    dimensions: normalizeDimensions(input.dimensions),
    astrologySnapshot: astrologySnapshot(astrology),
    disclaimer:
      "星盘辅助解读仅供娱乐、自我观察和关系讨论参考；现实聊天和实际行动永远优先于占星倾向。",
  };
}

export async function synthesizeChatAstrologyLayer(
  chatReport: LoveReport & { id: string },
  astrology: AstrologyReport,
): Promise<ChatAstrologyLayer> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  if (!apiKey) throw new Error("服务端未配置 DEEPSEEK_API_KEY，无法生成星盘辅助解读。");

  const prompt = `请为 Love Radar 生成“聊天记录 × 西方占星”的融合分析。

核心原则：
- Reality First：聊天记录和聊天报告是主判断依据。
- Astrology Second：星盘只解释关系倾向，不能替代现实证据。
- AI Synthesis Last：只做交叉验证和综合解释。
- 不允许说“注定”“一定”“TA肯定喜欢你”“一定分手/结婚”。
- 如果聊天证据和星盘倾向不一致，必须明确写不一致，不要强行圆。
- 输出中文，语气有洞察力但克制。

聊天报告摘要：
${JSON.stringify(
  {
    overallScore: chatReport.overallScore,
    riskLevel: chatReport.riskLevel,
    relationshipStage: chatReport.relationshipStage,
    summary: chatReport.summary,
    scores: chatReport.scores,
    riskTags: chatReport.riskTags,
    redFlags: chatReport.redFlags,
    greenFlags: chatReport.greenFlags,
    behaviorPattern: chatReport.behaviorPattern,
    suggestions: chatReport.suggestions,
    relationshipTrend: chatReport.relationshipTrend,
  },
  null,
  2,
)}

已计算星盘与合盘结果：
${JSON.stringify(
  {
    profileAName: astrology.profileAName,
    profileBName: astrology.profileBName,
    scores: astrology.scores,
    coreTags: astrology.coreTags,
    dataQualityNotice: astrology.dataQualityNotice,
    aspects: astrology.aspects.map((item) => ({
      planets: `${item.personAPlanetLabel} × ${item.personBPlanetLabel}`,
      aspect: item.typeLabel,
      dimension: item.dimension,
      strength: item.strength,
      interpretation: item.interpretation,
    })),
  },
  null,
  2,
)}

请返回严格 JSON，字段名固定：
{
  "alignmentScore": "0-100 的整数，必须根据聊天报告和星盘结果动态生成，不要固定为示例分",
  "alignmentLevel": "Strongly Expressed",
  "summary": "一句话说明星盘倾向和现实聊天的吻合情况。",
  "dimensions": [
    {
      "key": "Attraction",
      "realityEvidence": "聊天里的现实证据，必须优先引用聊天报告中已有证据或摘要。",
      "astrologyPattern": "星盘里的对应倾向，只能基于已计算相位和分数。",
      "aiConclusion": "综合结论，明确现实证据优先。",
      "expressionLevel": "Strongly Expressed"
    }
  ]
}

维度 key 必须完整包含：
Attraction, Emotional Bond, Communication, Chemistry, Stability, Relationship Risk

expressionLevel 只能是：
Strongly Expressed, Partially Expressed, Not Currently Expressed`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是 Love Radar 的关系分析助手。你只能基于聊天报告和服务端已计算好的星盘结果做辅助解释。聊天现实证据永远优先，占星不能作为喜欢、分手、结婚等绝对判断依据。只返回严格 JSON。",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`DeepSeek request failed: ${response.status}${detail ? ` ${detail}` : ""}`);
  }
  const data = (await response.json()) as DeepSeekResponse;
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) throw new Error("DeepSeek returned an empty response.");
  return normalizeLayer(JSON.parse(extractJson(content)), chatReport.id, astrology, chatReport);
}
