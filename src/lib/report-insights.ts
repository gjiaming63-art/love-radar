import type { EvidenceItem, LoveReport } from "@/types/report";

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

export function getReportInsight(report: LoveReport): ReportInsight {
  const scores = report.scores;
  const text = `${report.riskLevel} ${report.summary} ${report.riskTags.join(" ")}`;

  if (text.includes("信息不足") || report.overallScore <= 20) {
    return {
      type: "信息不足型",
      title: "样本不足观察报告",
      verdict: "这份记录还不够让雷达锁定信号，建议补充更完整的上下文。",
      signal: "样本偏弱",
    };
  }

  if (scores.sincerity >= 70 && scores.avoidance <= 45 && scores.coldViolence <= 40) {
    return {
      type: "真诚沟通型",
      title: "真诚沟通信号报告",
      verdict: "这段关系里最好的信号，是对方愿意把话说清楚。",
      signal: "可以继续观察",
    };
  }

  if (scores.coldViolence >= 70) {
    return {
      type: "冷处理预警型",
      title: "冷处理预警报告",
      verdict: "问题不只是回复慢，而是对方可能在用沉默控制关系节奏。",
      signal: "需要降低内耗",
    };
  }

  if (scores.overInvestmentRisk >= 70 && scores.sincerity <= 58) {
    return {
      type: "高投入低反馈型",
      title: "高投入低反馈报告",
      verdict: "你不是没有被回应，而是在用高投入换低确定性。",
      signal: "建议先降温",
    };
  }

  if (scores.avoidance >= 70) {
    return {
      type: "回避承诺型",
      title: "回避承诺预警报告",
      verdict: "这段关系最明显的信号，是热度还在，但确定性被一直往后推。",
      signal: "看行动别只看话",
    };
  }

  if (scores.breadcrumbing >= 70) {
    return {
      type: "暧昧吊着型",
      title: "暧昧吊着信号报告",
      verdict: "对方不是完全离场，而是用一点点回应维持你的期待。",
      signal: "观察推进意愿",
    };
  }

  if (scores.manipulation >= 60) {
    return {
      type: "情绪拉扯型",
      title: "情绪拉扯观察报告",
      verdict: "这段聊天让你上头的地方，可能正是忽近忽远带来的不确定感。",
      signal: "先稳住节奏",
    };
  }

  return {
    type: "关系观察型",
    title: "关系节奏观察报告",
    verdict: "目前还没到定性的程度，但已经有值得观察的节奏差。",
    signal: "继续看一致性",
  };
}

export function getRelationshipMeters(report: LoveReport): RelationshipMeter[] {
  const scores = report.scores;
  const certainty = clamp(
    Math.round(scores.sincerity * 0.55 + (100 - scores.avoidance) * 0.25 + (100 - scores.breadcrumbing) * 0.2),
  );
  const ambiguity = clamp(Math.round(scores.avoidance * 0.48 + scores.breadcrumbing * 0.38 + scores.manipulation * 0.14));
  const emotionalCost = clamp(
    Math.round(scores.overInvestmentRisk * 0.42 + scores.coldViolence * 0.34 + scores.manipulation * 0.24),
  );
  const progress = clamp(Math.round(scores.sincerity * 0.45 + (100 - scores.avoidance) * 0.3 + report.overallScore * 0.25));

  return [
    {
      label: "确定性",
      value: certainty,
      caption: certainty >= 70 ? "话和行动比较对得上" : certainty >= 45 ? "有信号，但还不够稳定" : "关系答案被放在雾里",
      tone: certainty >= 65 ? "safe" : "neutral",
    },
    {
      label: "暧昧迷雾",
      value: ambiguity,
      caption: ambiguity >= 70 ? "热度有，但边界和承诺都偏模糊" : ambiguity >= 45 ? "存在一些不确定信号" : "模糊感不算强",
      tone: ambiguity >= 60 ? "risk" : "neutral",
    },
    {
      label: "情绪消耗",
      value: emotionalCost,
      caption: emotionalCost >= 70 ? "容易反复想、反复等、反复内耗" : emotionalCost >= 45 ? "会有一点情绪拉扯" : "消耗感暂时不高",
      tone: emotionalCost >= 60 ? "risk" : "safe",
    },
    {
      label: "推进可能",
      value: progress,
      caption: progress >= 70 ? "可以看见继续推进的空间" : progress >= 45 ? "能推进，但需要更明确沟通" : "先别替对方脑补进度",
      tone: progress >= 65 ? "safe" : "neutral",
    },
  ];
}

export function getChatSpotlights(report: LoveReport): ChatSpotlight[] {
  const redFlag = pickEvidence(report.redFlags);
  const greenFlag = pickEvidence(report.greenFlags);

  return [
    {
      title: redFlag ? "本场最该警惕的一句话" : "本场警惕信号",
      quote: redFlag?.quote ?? "暂无足够明确的红旗原句",
      note: redFlag?.reason ?? "这份聊天样本还不足以提取稳定证据，建议补充更多上下文。",
      tone: "risk",
    },
    {
      title: greenFlag ? "本场难得的正向信号" : "本场正向信号",
      quote: greenFlag?.quote ?? "暂无足够明确的绿旗原句",
      note: greenFlag?.reason ?? "AI 没有识别到特别稳定的正向表达，可以继续观察对方是否有实际行动。",
      tone: "safe",
    },
    {
      title: "最适合截图冷静三分钟",
      quote: buildCoolDownQuote(report),
      note: "这句不是定论，更像提醒：先看对方持续行动，再决定要不要继续投入。",
      tone: "neutral",
    },
  ];
}

function pickEvidence(items: EvidenceItem[]) {
  return items.find((item) => item.quote.trim() && item.reason.trim()) ?? items[0];
}

function buildCoolDownQuote(report: LoveReport) {
  const scores = report.scores;
  if (scores.overInvestmentRisk >= 70) return "别把对方偶尔的回应，自动翻译成稳定的在乎。";
  if (scores.avoidance >= 70) return "没有明确推进时，热度本身不等于答案。";
  if (scores.coldViolence >= 70) return "沉默如果反复出现，就不只是忙。";
  if (scores.sincerity >= 70) return "有诚意也要看一致性，别急着一次性加满滤镜。";
  return report.shareCardText || report.summary;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
