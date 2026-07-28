export type AnalysisMode =
  | "comprehensive"
  | "fishing"
  | "cold_violence"
  | "sincerity"
  | "worth_investing"
  | "ambiguity_progress"
  | "post_breakup_chance"
  | string;

export type RoleContext = {
  participants: string[];
  selfName?: string;
  targetName?: string;
};

export type ParsedChatImageMessage = {
  speaker: "user" | "target";
  text: string;
  sourceImageIndex?: number;
  confidence?: number;
};

export type ParsedChatImageResult = {
  messages: ParsedChatImageMessage[];
  participants: {
    userLabel: string;
    targetLabel: string;
  };
  warnings: string[];
  chatText: string;
};

export type EvidenceItem = {
  quote: string;
  reason: string;
  strength?: "强" | "中" | "弱" | string;
};

export type ReportConfidence = {
  level: "高" | "中" | "低" | string;
  reason: string;
  messageCount: number;
  speakerBalance: string;
  limitations: string[];
};

export type RelationshipTrend = {
  label: "升温" | "稳定" | "拉扯" | "降温" | "停滞" | "断联边缘" | string;
  reason: string;
};

export type ReplySuggestion = {
  style: string;
  text: string;
};

export type ConditionalAdvice = {
  scenario: string;
  advice: string;
};

export type ActionPlan = {
  strategy: string;
  nextReplies: ReplySuggestion[];
  ifThen: ConditionalAdvice[];
  dontDo: string[];
};

export type DeepSeekScores = {
  sincerity: number;
  avoidance: number;
  coldViolence: number;
  breadcrumbing: number;
  manipulation: number;
  overInvestmentRisk: number;
};

export type DeepSeekAnalysisReport = {
  id?: string;
  mode?: AnalysisMode;
  overallScore: number;
  riskLevel: string;
  relationshipStage: string;
  summary: string;
  scores: DeepSeekScores;
  riskTags: string[];
  confidence: ReportConfidence;
  relationshipTrend: RelationshipTrend;
  redFlags: EvidenceItem[];
  greenFlags: EvidenceItem[];
  behaviorPattern: string;
  suggestions: string[];
  replyExamples: string[];
  actionPlan: ActionPlan;
  shareCardText: string;
  createdAt?: string;
  expiresAt?: string;
  deleteToken?: string;
  isPaid?: boolean;
  paidAt?: string | null;
};

export type LoveReport = DeepSeekAnalysisReport;

export const analysisModes: { value: AnalysisMode; label: string; hint: string }[] = [
  { value: "comprehensive", label: "综合分析", hint: "关系状态、风险信号与下一步话术" },
  { value: "fishing", label: "TA 是不是在养鱼", hint: "低投入高占用、暧昧不推进与备选感" },
  { value: "cold_violence", label: "是否冷暴力", hint: "沉默、回避关键问题与惩罚性消失" },
  { value: "worth_investing", label: "是否值得继续投入", hint: "投入回报、情绪成本与止损边界" },
  { value: "ambiguity_progress", label: "暧昧推进概率", hint: "主动邀约、未来计划与关系确认信号" },
  { value: "post_breakup_chance", label: "断联后还有没有机会", hint: "沟通窗口、情绪残留与复联风险" },
  { value: "sincerity", label: "对方真诚度检测", hint: "解释意愿、承诺一致性和行动匹配" },
];

export const scoreLabels: { key: keyof DeepSeekScores; label: string; highMeansRisk: boolean }[] = [
  { key: "sincerity", label: "真诚指数", highMeansRisk: false },
  { key: "avoidance", label: "回避指数", highMeansRisk: true },
  { key: "coldViolence", label: "冷暴力指数", highMeansRisk: true },
  { key: "breadcrumbing", label: "养鱼/吊着指数", highMeansRisk: true },
  { key: "manipulation", label: "情绪操控风险", highMeansRisk: true },
  { key: "overInvestmentRisk", label: "上头风险", highMeansRisk: true },
];
