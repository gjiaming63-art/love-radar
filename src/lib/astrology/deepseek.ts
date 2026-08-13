import type { AstrologyAiSections, AstrologyReport } from "@/types/astrology";

type DeepSeekMessage = {
  role: "system" | "user";
  content: string;
};

type DeepSeekResponse = {
  choices?: { message?: { content?: string } }[];
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

function trimText(value: unknown, fallback: string, max = 320) {
  const text = String(value || fallback).replace(/\s+/g, " ").trim();
  return text.slice(0, max);
}

function trimList(value: unknown, fallback: string[], limit = 4) {
  if (!Array.isArray(value)) return fallback;
  const items = value.map((item) => trimText(item, "", 160)).filter(Boolean).slice(0, limit);
  return items.length ? items : fallback;
}

function normalizeAiSections(value: unknown, report: AstrologyReport): AstrologyAiSections {
  const input = value as Partial<AstrologyAiSections>;
  return {
    overallConnection: trimText(input.overallConnection, report.oneLineSummary, 360),
    attractionReason: trimText(input.attractionReason, "你们的吸引来自核心星体之间的互动，需要结合现实相处继续验证。", 300),
    emotionalBond: trimText(input.emotionalBond, "情绪连接有一定潜力，但稳定程度取决于双方是否愿意表达真实需求。", 300),
    communicationPattern: trimText(input.communicationPattern, "沟通里既有对频点，也可能存在理解节奏差异。", 300),
    chemistryAndIntimacy: trimText(input.chemistryAndIntimacy, "亲密火花可以成为推进关系的动力，但不应该替代关系确认。", 300),
    longTermPotential: trimText(input.longTermPotential, "长期潜力更依赖现实中的稳定回应、边界感和共同节奏。", 300),
    biggestStrength: trimText(input.biggestStrength, report.coreTags[0] || "彼此仍有可观察的吸引点。", 180),
    biggestChallenge: trimText(input.biggestChallenge, "不要把相位张力直接理解成命运结论。", 180),
    relationshipAdvice: trimText(input.relationshipAdvice, report.basicAdvice, 320),
    futureTrend: trimText(input.futureTrend, "未来趋势适合先看 2-4 周内是否有更稳定的行动和沟通。", 260),
    smartReplies: trimList(input.smartReplies, ["我想更清楚地了解我们现在的相处节奏，也希望我们可以把话说得具体一点。"], 4),
    shareCardText: trimText(input.shareCardText, `恋爱占星师：${report.oneLineSummary}`, 120),
  };
}

export async function interpretAstrologyWithDeepSeek(report: AstrologyReport): Promise<AstrologyAiSections> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  if (!apiKey) {
    return normalizeAiSections({}, report);
  }

  const compactPayload = {
    people: [report.profileAName, report.profileBName],
    scores: report.scores,
    tags: report.coreTags,
    dataQualityNotice: report.dataQualityNotice,
    planets: {
      [report.profileAName]: report.chartA.positions,
      [report.profileBName]: report.chartB.positions,
    },
    topAspects: report.aspects.slice(0, 8).map((aspect) => ({
      title: aspect.title,
      aspect: `${aspect.personAPlanetLabel}-${aspect.personBPlanetLabel}${aspect.typeLabel}`,
      orb: aspect.orb,
      strength: aspect.strength,
      dimension: aspect.dimension,
      interpretation: aspect.interpretation,
    })),
  };

  const messages: DeepSeekMessage[] = [
    {
      role: "system",
      content:
        "你是 Love Radar 的恋爱占星解释员。你只能解释服务端已经计算好的星体位置、相位、强度和分数，不允许编造新的星体、宫位、上升、下降、组合盘、行运或宿命结论。语气要有趣、克制、有洞察力，像关系观察报告，不像迷信判词。必须强调这是娱乐、自我观察和关系探索参考，不是科学预测。",
    },
    {
      role: "user",
      content: `请根据下面的确定性计算结果，输出严格 JSON。不要输出 Markdown。

要求：
1. 不要说“注定”“必然”“一定分开/一定在一起”。
2. 硬相位要解释成吸引和摩擦并存，不要直接判坏。
3. 出生时间未知时，要承认结果降级，不要提上升、下降或宫位。
4. 不要复述出生日期、出生城市等原始信息。
5. 文案适合中文年轻用户阅读，可分享，但不要浮夸。

JSON 结构：
{
  "overallConnection": "100-180字关系总览",
  "attractionReason": "为什么互相吸引",
  "emotionalBond": "情绪连接",
  "communicationPattern": "沟通模式",
  "chemistryAndIntimacy": "亲密与化学反应",
  "longTermPotential": "长期潜力",
  "biggestStrength": "最大优势",
  "biggestChallenge": "最大挑战",
  "relationshipAdvice": "关系建议",
  "futureTrend": "未来关系趋势，不能做确定预测",
  "smartReplies": ["可复制沟通话术1", "可复制沟通话术2", "可复制沟通话术3"],
  "shareCardText": "适合分享卡片的一句话"
}

计算结果：
${JSON.stringify(compactPayload)}`,
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
      temperature: 0.72,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    console.error("Astrology DeepSeek failed:", await response.text().catch(() => ""));
    return normalizeAiSections({}, report);
  }

  const data = (await response.json()) as DeepSeekResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  if (!content) return normalizeAiSections({}, report);
  return normalizeAiSections(JSON.parse(extractJson(content)), report);
}
