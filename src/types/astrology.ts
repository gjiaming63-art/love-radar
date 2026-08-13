export type AstrologyLocale = "zh-CN" | "en-US";

export type AstrologyProfileInput = {
  name: string;
  birthDate: string;
  birthTime?: string;
  birthCityId?: string;
  birthCityText?: string;
  timeKnown: boolean;
};

export type AstrologyCity = {
  id: string;
  name: string;
  country: string;
  region?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetMinutes: number;
};

export type AstrologyPlanetKey = "sun" | "moon" | "mercury" | "venus" | "mars";

export type PlanetPosition = {
  planet: AstrologyPlanetKey;
  label: string;
  longitude: number;
  sign: string;
  signIndex: number;
  degree: number;
  retrograde: boolean;
};

export type NatalChart = {
  name: string;
  timeKnown: boolean;
  cityLabel: string;
  timezone: string;
  positions: PlanetPosition[];
  calculationNote: string;
};

export type AspectType = "conjunction" | "sextile" | "square" | "trine" | "opposition";

export type SynastryAspect = {
  id: string;
  personAPlanet: AstrologyPlanetKey;
  personBPlanet: AstrologyPlanetKey;
  personAPlanetLabel: string;
  personBPlanetLabel: string;
  type: AspectType;
  typeLabel: string;
  angle: number;
  orb: number;
  maxOrb: number;
  strength: number;
  dimension: keyof AstrologyScores;
  title: string;
  interpretation: string;
};

export type AstrologyScores = {
  overall: number;
  chemistry: number;
  emotional: number;
  communication: number;
  intimacy: number;
  stability: number;
  conflictRisk: number;
};

export type AstrologyAiSections = {
  overallConnection: string;
  attractionReason: string;
  emotionalBond: string;
  communicationPattern: string;
  chemistryAndIntimacy: string;
  longTermPotential: string;
  biggestStrength: string;
  biggestChallenge: string;
  relationshipAdvice: string;
  futureTrend: string;
  smartReplies: string[];
  shareCardText: string;
};

export type AstrologyReport = {
  id?: string;
  locale: AstrologyLocale;
  profileAName: string;
  profileBName: string;
  chartA: NatalChart;
  chartB: NatalChart;
  aspects: SynastryAspect[];
  scores: AstrologyScores;
  coreTags: string[];
  oneLineSummary: string;
  basicAdvice: string;
  dataQualityNotice: string | null;
  ai: AstrologyAiSections;
  engineVersion: string;
  calculationSource: string;
  isPaid?: boolean;
  paidAt?: string | null;
  createdAt?: string;
  expiresAt?: string;
  deleteToken?: string;
};

export const astrologyScoreLabels: { key: keyof AstrologyScores; label: string; highMeansRisk: boolean }[] = [
  { key: "overall", label: "综合吸引力", highMeansRisk: false },
  { key: "chemistry", label: "化学反应", highMeansRisk: false },
  { key: "emotional", label: "情绪连接", highMeansRisk: false },
  { key: "communication", label: "沟通匹配", highMeansRisk: false },
  { key: "intimacy", label: "亲密火花", highMeansRisk: false },
  { key: "stability", label: "稳定潜力", highMeansRisk: false },
  { key: "conflictRisk", label: "冲突张力", highMeansRisk: true },
];
