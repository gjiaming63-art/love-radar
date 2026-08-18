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
  const items = value.map((item) => trimText(item, "", 180)).filter(Boolean).slice(0, limit);
  return items.length ? items : fallback;
}

function fallbackAi(report: AstrologyReport): AstrologyAiSections {
  if (report.locale === "en-US") {
    return {
      overallConnection: report.oneLineSummary,
      attractionReason:
        "The attraction comes from visible synastry signals between personal planets. It can feel interesting, but it still needs real-life consistency.",
      emotionalBond:
        "There is emotional potential here, especially if both people can express needs without guessing or testing each other.",
      communicationPattern:
        "The communication pattern may work best when both sides name what they mean instead of relying on hints.",
      chemistryAndIntimacy:
        "Chemistry may be present, but it should not be treated as proof of commitment. Watch whether warmth becomes steady action.",
      longTermPotential:
        "Long-term potential depends less on the chart and more on consistency, emotional pacing, and mutual respect.",
      biggestStrength: report.coreTags[0] || "There is still something worth observing in the connection.",
      biggestChallenge: "Do not turn astrology into a final verdict. Use it as context, then check the real behavior.",
      relationshipAdvice: report.basicAdvice,
      futureTrend:
        "Over the next few weeks, pay attention to whether communication becomes clearer and effort becomes more consistent.",
      smartReplies: [
        "I like talking to you, but I also need a clearer rhythm between us.",
        "I do not want to overread things. Can we be more direct about what we both want?",
        "I am open to seeing where this goes, as long as it feels mutual.",
      ],
      shareCardText: report.oneLineSummary,
    };
  }

  return {
    overallConnection: report.oneLineSummary,
    attractionReason: "你们的吸引来自核心星体之间的互动，但仍需要结合现实相处继续验证。",
    emotionalBond: "情绪连接有一定潜力，但稳定程度取决于双方是否愿意表达真实需求。",
    communicationPattern: "沟通里既有对频点，也可能存在理解节奏差异。",
    chemistryAndIntimacy: "亲密火花可以成为推进关系的动力，但不应该替代关系确认。",
    longTermPotential: "长期潜力更依赖现实中的稳定回应、边界感和共同节奏。",
    biggestStrength: report.coreTags[0] || "彼此仍有可观察的吸引点。",
    biggestChallenge: "不要把相位张力直接理解成命运结论。",
    relationshipAdvice: report.basicAdvice,
    futureTrend: "未来趋势适合先看 2-4 周内是否有更稳定的行动和沟通。",
    smartReplies: ["我想更清楚地了解我们现在的相处节奏，也希望我们可以把话说得具体一点。"],
    shareCardText: `恋爱占星师：${report.oneLineSummary}`,
  };
}

function normalizeAiSections(value: unknown, report: AstrologyReport): AstrologyAiSections {
  const input = value as Partial<AstrologyAiSections>;
  const fallback = fallbackAi(report);
  return {
    overallConnection: trimText(input.overallConnection, fallback.overallConnection, 360),
    attractionReason: trimText(input.attractionReason, fallback.attractionReason, 320),
    emotionalBond: trimText(input.emotionalBond, fallback.emotionalBond, 320),
    communicationPattern: trimText(input.communicationPattern, fallback.communicationPattern, 320),
    chemistryAndIntimacy: trimText(input.chemistryAndIntimacy, fallback.chemistryAndIntimacy, 320),
    longTermPotential: trimText(input.longTermPotential, fallback.longTermPotential, 320),
    biggestStrength: trimText(input.biggestStrength, fallback.biggestStrength, 180),
    biggestChallenge: trimText(input.biggestChallenge, fallback.biggestChallenge, 180),
    relationshipAdvice: trimText(input.relationshipAdvice, fallback.relationshipAdvice, 320),
    futureTrend: trimText(input.futureTrend, fallback.futureTrend, 280),
    smartReplies: trimList(input.smartReplies, fallback.smartReplies, 4),
    shareCardText: trimText(input.shareCardText, fallback.shareCardText, 140),
  };
}

export async function interpretAstrologyWithDeepSeek(report: AstrologyReport): Promise<AstrologyAiSections> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  if (!apiKey) return normalizeAiSections({}, report);

  const compactPayload = {
    locale: report.locale,
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
      aspect: `${aspect.personAPlanetLabel}-${aspect.personBPlanetLabel} ${aspect.typeLabel}`,
      orb: aspect.orb,
      strength: aspect.strength,
      dimension: aspect.dimension,
      interpretation: aspect.interpretation,
    })),
  };

  const messages = report.locale === "en-US" ? buildEnglishMessages(compactPayload) : buildChineseMessages(compactPayload);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: report.locale === "en-US" ? 0.68 : 0.72,
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

function buildEnglishMessages(compactPayload: unknown): DeepSeekMessage[] {
  return [
    {
      role: "system",
      content:
        "You are a modern relationship astrology interpreter for Love Radar AI. You only interpret server-calculated planet positions, synastry aspects, strengths, and scores. Do not invent rising signs, houses, descendants, transits, composite charts, or destiny claims. Do not say destined, guaranteed soulmate, will break up, or will marry. Use modern, clear, emotionally intelligent English for young TikTok/Instagram users. Astrology is symbolic reflection and entertainment, not scientific prediction or relationship decision advice.",
    },
    {
      role: "user",
      content: `Return strict JSON only. Do not use Markdown.
Rules:
1. Base the analysis only on the calculated payload.
2. Hard aspects should be described as attraction plus friction, not as bad fate.
3. If birth time is missing, acknowledge the reading is simplified and do not mention rising signs, houses, or descendants.
4. Do not repeat raw birth dates, birth times, or city names.
5. Keep the tone modern mystical: specific, warm, concise, and not fatalistic.

JSON shape:
{
  "overallConnection": "100-170 characters, relationship overview",
  "attractionReason": "why they may feel drawn to each other",
  "emotionalBond": "emotional bond",
  "communicationPattern": "communication pattern",
  "chemistryAndIntimacy": "romantic chemistry and intimacy",
  "longTermPotential": "long-term potential",
  "biggestStrength": "biggest strength",
  "biggestChallenge": "biggest challenge",
  "relationshipAdvice": "practical relationship advice",
  "futureTrend": "near-term relationship outlook without prediction certainty",
  "smartReplies": ["copyable message", "copyable message", "copyable message"],
  "shareCardText": "one short shareable sentence"
}

Calculated payload:
${JSON.stringify(compactPayload)}`,
    },
  ];
}

function buildChineseMessages(compactPayload: unknown): DeepSeekMessage[] {
  return [
    {
      role: "system",
      content:
        "你是 Love Radar 的恋爱占星解释员。你只能解释服务端已经计算好的星体位置、相位、强度和分数，不允许编造新的星体、宫位、上升、下降、组合盘、行运或宿命结论。语气要有趣、克制、有洞察力，像关系观察报告，不像迷信判词。必须强调这是娱乐、自我观察和关系探索参考，不是科学预测。",
    },
    {
      role: "user",
      content: `请根据下面的确定性计算结果，输出严格 JSON。不要输出 Markdown。
要求：1. 不要说“注定”“必然”“一定分开/一定在一起”。2. 硬相位要解释成吸引和摩擦并存，不要直接判坏。3. 出生时间未知时，要承认结果降级，不要提上升、下降或宫位。4. 不要复述出生日期、出生城市等原始信息。5. 文案适合中文年轻用户阅读，可分享，但不要浮夸。
JSON 结构：{
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
  "smartReplies": ["可复制沟通话术", "可复制沟通话术", "可复制沟通话术"],
  "shareCardText": "适合分享卡片的一句话"
}

计算结果：${JSON.stringify(compactPayload)}`,
    },
  ];
}
