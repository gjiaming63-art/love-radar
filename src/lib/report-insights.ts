import type { EvidenceItem, LoveReport } from "@/types/report";

export type InsightLocale = "zh-CN" | "en-US";

export type ReportInsight = {
  type: string;
  title: string;
  verdict: string;
  signal: string;
};

export type RelationshipMeter = {
  label: string;
  value: number;
  caption: string;
  tone: "risk" | "safe" | "neutral";
};

export type ChatSpotlight = {
  title: string;
  quote: string;
  note: string;
  tone: "risk" | "safe" | "neutral";
};

type InsightKind =
  | "insufficient"
  | "sincere"
  | "coldTreatment"
  | "overInvested"
  | "avoidant"
  | "breadcrumbing"
  | "pushPull"
  | "observing";

const insightCopy: Record<InsightLocale, Record<InsightKind, ReportInsight>> = {
  "zh-CN": {
    insufficient: {
      type: "信息不足型",
      title: "样本不足观察报告",
      verdict: "这份记录还不够让雷达锁定信号，建议补充更完整的上下文。",
      signal: "样本偏弱",
    },
    sincere: {
      type: "真诚沟通型",
      title: "真诚沟通信号报告",
      verdict: "这段关系里最好的信号，是对方愿意把话说清楚。",
      signal: "可以继续观察",
    },
    coldTreatment: {
      type: "冷处理预警型",
      title: "冷处理预警报告",
      verdict: "问题不只是回复慢，而是对方可能在用沉默控制关系节奏。",
      signal: "需要降低内耗",
    },
    overInvested: {
      type: "高投入低反馈型",
      title: "高投入低反馈报告",
      verdict: "你不是没有被回应，而是在用高投入换低确定性。",
      signal: "建议先降温",
    },
    avoidant: {
      type: "回避承诺型",
      title: "回避承诺预警报告",
      verdict: "这段关系最明显的信号，是热度还在，但确定性被一直往后推。",
      signal: "看行动别只看话",
    },
    breadcrumbing: {
      type: "暧昧吊着型",
      title: "暧昧吊着信号报告",
      verdict: "对方不是完全离场，而是用一点点回应维持你的期待。",
      signal: "观察推进意愿",
    },
    pushPull: {
      type: "情绪拉扯型",
      title: "情绪拉扯观察报告",
      verdict: "这段聊天让你上头的地方，可能正是忽近忽远带来的不确定感。",
      signal: "先稳住节奏",
    },
    observing: {
      type: "关系观察型",
      title: "关系节奏观察报告",
      verdict: "目前还没到定性的程度，但已经有值得观察的节奏差。",
      signal: "继续看一致性",
    },
  },
  "en-US": {
    insufficient: {
      type: "Not enough signal",
      title: "Not enough to read yet",
      verdict: "This chat is too short for a clear read. Add more of the conversation for a sharper answer.",
      signal: "Thin sample",
    },
    sincere: {
      type: "Genuine communicator",
      title: "Genuine interest detected",
      verdict: "The best sign here: they're willing to say what they mean.",
      signal: "Worth continuing",
    },
    coldTreatment: {
      type: "Silent treatment risk",
      title: "Cold-shoulder warning",
      verdict: "It's not just slow replies. Silence may be how they control the pace.",
      signal: "Protect your energy",
    },
    overInvested: {
      type: "You're giving more",
      title: "High effort, low return",
      verdict: "You are getting replies, but you're trading a lot of effort for very little certainty.",
      signal: "Cool it down a bit",
    },
    avoidant: {
      type: "Commitment-avoidant",
      title: "Commitment keeps getting pushed back",
      verdict: "The spark is still there, but anything definite keeps getting postponed.",
      signal: "Watch actions, not words",
    },
    breadcrumbing: {
      type: "Breadcrumbing",
      title: "Breadcrumbing signals",
      verdict: "They haven't left. They're giving just enough to keep you hoping.",
      signal: "Test their follow-through",
    },
    pushPull: {
      type: "Hot and cold",
      title: "Push-pull pattern",
      verdict: "What keeps you hooked may be exactly the hot-and-cold uncertainty.",
      signal: "Steady your pace",
    },
    observing: {
      type: "Still unfolding",
      title: "Mixed but readable",
      verdict: "Too early to call, but there's already a rhythm mismatch worth watching.",
      signal: "Watch for consistency",
    },
  },
};

export function getReportInsight(report: LoveReport, locale: InsightLocale = "zh-CN"): ReportInsight {
  return insightCopy[locale][getInsightKind(report)];
}

function getInsightKind(report: LoveReport): InsightKind {
  const scores = report.scores;
  const text = `${report.riskLevel} ${report.summary} ${report.riskTags.join(" ")}`;

  if (text.includes("信息不足") || report.overallScore <= 20) return "insufficient";
  if (scores.sincerity >= 70 && scores.avoidance <= 45 && scores.coldViolence <= 40) return "sincere";
  if (scores.coldViolence >= 70) return "coldTreatment";
  if (scores.overInvestmentRisk >= 70 && scores.sincerity <= 58) return "overInvested";
  if (scores.avoidance >= 70) return "avoidant";
  if (scores.breadcrumbing >= 70) return "breadcrumbing";
  if (scores.manipulation >= 60) return "pushPull";
  return "observing";
}

const meterCopy: Record<
  InsightLocale,
  { labels: [string, string, string, string]; captions: [string, string, string][] }
> = {
  "zh-CN": {
    labels: ["确定性", "暧昧迷雾", "情绪消耗", "推进可能"],
    captions: [
      ["话和行动比较对得上", "有信号，但还不够稳定", "关系答案被放在雾里"],
      ["热度有，但边界和承诺都偏模糊", "存在一些不确定信号", "模糊感不算强"],
      ["容易反复想、反复等、反复内耗", "会有一点情绪拉扯", "消耗感暂时不高"],
      ["可以看见继续推进的空间", "能推进，但需要更明确沟通", "先别替对方脑补进度"],
    ],
  },
  "en-US": {
    labels: ["Certainty", "Mixed signals", "Emotional drain", "Chance to progress"],
    captions: [
      ["Their words and actions mostly match", "Some signals, not yet consistent", "The answer is still in the fog"],
      ["Warm, but boundaries and intentions are blurry", "Some uncertain signals", "Not much ambiguity"],
      ["Easy to overthink, wait and spiral", "A bit of emotional push-pull", "Low emotional cost for now"],
      ["There's room for this to move forward", "Can progress, but needs clearer talk", "Don't fill in the progress for them"],
    ],
  },
};

export function getRelationshipMeters(report: LoveReport, locale: InsightLocale = "zh-CN"): RelationshipMeter[] {
  const scores = report.scores;
  const certainty = clamp(
    Math.round(scores.sincerity * 0.55 + (100 - scores.avoidance) * 0.25 + (100 - scores.breadcrumbing) * 0.2),
  );
  const ambiguity = clamp(Math.round(scores.avoidance * 0.48 + scores.breadcrumbing * 0.38 + scores.manipulation * 0.14));
  const emotionalCost = clamp(
    Math.round(scores.overInvestmentRisk * 0.42 + scores.coldViolence * 0.34 + scores.manipulation * 0.24),
  );
  const progress = clamp(Math.round(scores.sincerity * 0.45 + (100 - scores.avoidance) * 0.3 + report.overallScore * 0.25));
  const { labels, captions } = meterCopy[locale];
  const pick = (index: number, value: number) =>
    value >= 70 ? captions[index][0] : value >= 45 ? captions[index][1] : captions[index][2];

  return [
    { label: labels[0], value: certainty, caption: pick(0, certainty), tone: certainty >= 65 ? "safe" : "neutral" },
    { label: labels[1], value: ambiguity, caption: pick(1, ambiguity), tone: ambiguity >= 60 ? "risk" : "neutral" },
    { label: labels[2], value: emotionalCost, caption: pick(2, emotionalCost), tone: emotionalCost >= 60 ? "risk" : "safe" },
    { label: labels[3], value: progress, caption: pick(3, progress), tone: progress >= 65 ? "safe" : "neutral" },
  ];
}

const spotlightCopy: Record<
  InsightLocale,
  {
    redTitle: [string, string];
    redEmpty: [string, string];
    greenTitle: [string, string];
    greenEmpty: [string, string];
    neutralTitle: string;
    neutralNote: string;
    coolDown: { overInvested: string; avoidant: string; cold: string; sincere: string };
  }
> = {
  "zh-CN": {
    redTitle: ["本场最该警惕的一句话", "本场警惕信号"],
    redEmpty: ["暂无足够明确的红旗原句", "这份聊天样本还不足以提取稳定证据，建议补充更多上下文。"],
    greenTitle: ["本场难得的正向信号", "本场正向信号"],
    greenEmpty: ["暂无足够明确的绿旗原句", "AI 没有识别到特别稳定的正向表达，可以继续观察对方是否有实际行动。"],
    neutralTitle: "最适合截图冷静三分钟",
    neutralNote: "这句不是定论，更像提醒：先看对方持续行动，再决定要不要继续投入。",
    coolDown: {
      overInvested: "别把对方偶尔的回应，自动翻译成稳定的在乎。",
      avoidant: "没有明确推进时，热度本身不等于答案。",
      cold: "沉默如果反复出现，就不只是忙。",
      sincere: "有诚意也要看一致性，别急着一次性加满滤镜。",
    },
  },
  "en-US": {
    redTitle: ["The line to be most careful about", "Warning signal"],
    redEmpty: ["No clear red-flag line found", "Not enough of the chat to pull solid evidence. Try adding more context."],
    greenTitle: ["The best sign in this chat", "Positive signal"],
    greenEmpty: ["No clear green-flag line found", "No consistent positive signal yet. Watch whether they follow through with actions."],
    neutralTitle: "Read this before you reply",
    neutralNote: "Not a verdict, just a reminder: watch what they keep doing before you invest more.",
    coolDown: {
      overInvested: "Don't translate an occasional reply into steady interest.",
      avoidant: "Warmth without any real plan isn't an answer.",
      cold: "If the silence keeps coming back, it's not just being busy.",
      sincere: "Even when they seem genuine, look for consistency before you go all in.",
    },
  },
};

export function getChatSpotlights(report: LoveReport, locale: InsightLocale = "zh-CN"): ChatSpotlight[] {
  const redFlag = pickEvidence(report.redFlags);
  const greenFlag = pickEvidence(report.greenFlags);
  const copy = spotlightCopy[locale];

  return [
    {
      title: redFlag ? copy.redTitle[0] : copy.redTitle[1],
      quote: redFlag?.quote ?? copy.redEmpty[0],
      note: redFlag?.reason ?? copy.redEmpty[1],
      tone: "risk",
    },
    {
      title: greenFlag ? copy.greenTitle[0] : copy.greenTitle[1],
      quote: greenFlag?.quote ?? copy.greenEmpty[0],
      note: greenFlag?.reason ?? copy.greenEmpty[1],
      tone: "safe",
    },
    {
      title: copy.neutralTitle,
      quote: buildCoolDownQuote(report, locale),
      note: copy.neutralNote,
      tone: "neutral",
    },
  ];
}

function pickEvidence(items: EvidenceItem[]) {
  return items.find((item) => item.quote.trim() && item.reason.trim()) ?? items[0];
}

function buildCoolDownQuote(report: LoveReport, locale: InsightLocale) {
  const scores = report.scores;
  const lines = spotlightCopy[locale].coolDown;
  if (scores.overInvestmentRisk >= 70) return lines.overInvested;
  if (scores.avoidance >= 70) return lines.avoidant;
  if (scores.coldViolence >= 70) return lines.cold;
  if (scores.sincerity >= 70) return lines.sincere;
  return report.shareCardText || report.summary;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
