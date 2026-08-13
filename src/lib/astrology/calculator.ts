import { formatCityLabel } from "@/lib/astrology/cities";
import { clampScore } from "@/lib/utils";
import type {
  AstrologyCity,
  AspectType,
  AstrologyPlanetKey,
  AstrologyReport,
  AstrologyScores,
  NatalChart,
  PlanetPosition,
  SynastryAspect,
} from "@/types/astrology";

const signs = ["白羊", "金牛", "双子", "巨蟹", "狮子", "处女", "天秤", "天蝎", "射手", "摩羯", "水瓶", "双鱼"];

const planets: Record<AstrologyPlanetKey, { label: string; base: number; speed: number; retroCycle?: number }> = {
  sun: { label: "太阳", base: 280.2, speed: 0.985647 },
  moon: { label: "月亮", base: 218.3, speed: 13.176358 },
  mercury: { label: "水星", base: 265.8, speed: 4.092334, retroCycle: 116 },
  venus: { label: "金星", base: 340.6, speed: 1.60213, retroCycle: 584 },
  mars: { label: "火星", base: 19.4, speed: 0.524039, retroCycle: 780 },
};

const aspectDefs: Record<AspectType, { angle: number; label: string; maxOrb: number }> = {
  conjunction: { angle: 0, label: "合相", maxOrb: 8 },
  sextile: { angle: 60, label: "六合", maxOrb: 5 },
  square: { angle: 90, label: "刑相", maxOrb: 7 },
  trine: { angle: 120, label: "拱相", maxOrb: 7 },
  opposition: { angle: 180, label: "冲相", maxOrb: 8 },
};

const aspectOrder: AspectType[] = ["conjunction", "trine", "sextile", "opposition", "square"];

type ScoreDelta = Partial<Record<keyof AstrologyScores, number>>;

export type ResolvedAstrologyProfile = {
  name: string;
  birthDate: string;
  birthTime?: string;
  timeKnown: boolean;
  city: AstrologyCity;
};

const pairRules: Record<string, { dimension: keyof AstrologyScores; title: string; soft: string; hard: string; deltas: Record<AspectType, ScoreDelta> }> = {
  "sun-moon": {
    dimension: "emotional",
    title: "核心气质与情绪节奏",
    soft: "两个人容易在生活节奏和情绪需求上互相看见，有一种自然靠近的熟悉感。",
    hard: "两个人会被彼此吸引，但表达需求的方式容易错位，需要主动翻译彼此的感受。",
    deltas: {
      conjunction: { emotional: 16, stability: 8, overall: 8 },
      trine: { emotional: 14, stability: 8, overall: 7 },
      sextile: { emotional: 10, communication: 4, overall: 5 },
      opposition: { emotional: 8, chemistry: 6, conflictRisk: 10 },
      square: { emotional: 4, chemistry: 5, conflictRisk: 14 },
    },
  },
  "moon-venus": {
    dimension: "emotional",
    title: "温柔感与被照顾感",
    soft: "相处里容易出现柔软、照顾和愿意靠近的感觉，适合慢慢培养安全感。",
    hard: "喜欢的方式和被安抚的方式可能不完全一致，容易一边在意一边误会。",
    deltas: {
      conjunction: { emotional: 14, intimacy: 8, overall: 7 },
      trine: { emotional: 12, intimacy: 7, overall: 6 },
      sextile: { emotional: 9, intimacy: 5, overall: 4 },
      opposition: { emotional: 6, intimacy: 6, conflictRisk: 7 },
      square: { emotional: 4, intimacy: 5, conflictRisk: 10 },
    },
  },
  "venus-mars": {
    dimension: "chemistry",
    title: "心动火花与身体吸引",
    soft: "这是一组很有恋爱感的配置，容易有心动、靠近和想表达喜欢的冲动。",
    hard: "吸引力明显，但节奏可能忽快忽慢，处理不好会变成拉扯或试探。",
    deltas: {
      conjunction: { chemistry: 18, intimacy: 14, overall: 9 },
      trine: { chemistry: 15, intimacy: 12, overall: 7 },
      sextile: { chemistry: 11, intimacy: 8, overall: 5 },
      opposition: { chemistry: 15, intimacy: 10, conflictRisk: 9 },
      square: { chemistry: 13, intimacy: 8, conflictRisk: 13 },
    },
  },
  "mercury-mercury": {
    dimension: "communication",
    title: "聊天频率与理解方式",
    soft: "两个人的理解速度和表达方式较容易对上，适合用沟通降低误会。",
    hard: "思考路径不同，容易出现一个想讲逻辑、一个在听情绪的错位。",
    deltas: {
      conjunction: { communication: 16, stability: 5, overall: 6 },
      trine: { communication: 14, stability: 5, overall: 6 },
      sextile: { communication: 10, stability: 4, overall: 4 },
      opposition: { communication: 6, conflictRisk: 8 },
      square: { communication: 3, conflictRisk: 13 },
    },
  },
  "sun-venus": {
    dimension: "chemistry",
    title: "欣赏感与被喜欢的感觉",
    soft: "两个人容易欣赏彼此的气质，一方会让另一方觉得自己是被看见、被喜欢的。",
    hard: "吸引存在，但期待的示爱方式不同，容易把对方的表达理解成不够用心。",
    deltas: {
      conjunction: { chemistry: 13, emotional: 7, overall: 7 },
      trine: { chemistry: 11, emotional: 6, overall: 6 },
      sextile: { chemistry: 8, emotional: 4, overall: 4 },
      opposition: { chemistry: 9, conflictRisk: 5 },
      square: { chemistry: 7, conflictRisk: 8 },
    },
  },
  "moon-mars": {
    dimension: "conflictRisk",
    title: "情绪触发点与行动冲动",
    soft: "一方的行动力能带动另一方的情绪流动，适合把喜欢落到具体行动里。",
    hard: "这组配置容易情绪被点燃，既有吸引，也可能因为急躁、冷淡或误解而互相刺到。",
    deltas: {
      conjunction: { chemistry: 10, intimacy: 8, conflictRisk: 8 },
      trine: { chemistry: 8, intimacy: 7, conflictRisk: 3 },
      sextile: { chemistry: 6, intimacy: 5, conflictRisk: 2 },
      opposition: { chemistry: 9, conflictRisk: 12 },
      square: { chemistry: 8, conflictRisk: 16 },
    },
  },
};

const relevantPairs = new Set(Object.keys(pairRules));

export function calculateAstrologyReport(inputA: ResolvedAstrologyProfile, inputB: ResolvedAstrologyProfile): AstrologyReport {
  const chartA = createNatalChart(inputA);
  const chartB = createNatalChart(inputB);
  const aspects = calculateSynastry(chartA, chartB);
  const scores = calculateScores(aspects, chartA.timeKnown && chartB.timeKnown);
  const coreTags = buildTags(scores, aspects);
  const dataQualityNotice =
    chartA.timeKnown && chartB.timeKnown
      ? null
      : "本报告未使用完整出生时间，月亮位置可能存在轻微偏差；上升、下降与宫位已在 V1 中降级处理。";

  return {
    locale: "zh-CN",
    profileAName: chartA.name,
    profileBName: chartB.name,
    chartA,
    chartB,
    aspects,
    scores,
    coreTags,
    oneLineSummary: buildOneLineSummary(scores, coreTags),
    basicAdvice: buildBasicAdvice(scores),
    dataQualityNotice,
    ai: {
      overallConnection: "",
      attractionReason: "",
      emotionalBond: "",
      communicationPattern: "",
      chemistryAndIntimacy: "",
      longTermPotential: "",
      biggestStrength: "",
      biggestChallenge: "",
      relationshipAdvice: "",
      futureTrend: "",
      smartReplies: [],
      shareCardText: "",
    },
    engineVersion: "love-radar-astro-v1-approx",
    calculationSource: "V1 轻量行星近似算法，后续可替换为授权星历引擎",
  };
}

function createNatalChart(input: ResolvedAstrologyProfile): NatalChart {
  const city = input.city;
  const name = sanitizeName(input.name);
  const utcDate = parseBirthDate(input.birthDate, input.birthTime, input.timeKnown, city.utcOffsetMinutes);
  const days = daysSinceJ2000(utcDate);
  const positions = (Object.keys(planets) as AstrologyPlanetKey[]).map((planet) => getPlanetPosition(planet, days));
  return {
    name,
    timeKnown: Boolean(input.timeKnown && input.birthTime),
    cityLabel: formatCityLabel(city),
    timezone: city.timezone,
    positions,
    calculationNote: input.timeKnown
      ? "已使用出生日期、出生时间与城市时区进行 V1 近似计算。"
      : "未使用出生时间，结果不包含上升、下降和宫位；月亮位置仅供娱乐参考。",
  };
}

function sanitizeName(name: string) {
  const value = name.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 16);
  return value || "TA";
}

function parseBirthDate(date: string, time: string | undefined, timeKnown: boolean, utcOffsetMinutes: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("出生日期格式不正确。");
  const safeTime = timeKnown && time && /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = safeTime.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - utcOffsetMinutes * 60 * 1000);
}

function daysSinceJ2000(date: Date) {
  return (date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}

function getPlanetPosition(planet: AstrologyPlanetKey, days: number): PlanetPosition {
  const config = planets[planet];
  const seasonalWave = Math.sin((days / 365.25) * Math.PI * 2 + config.base / 57.3) * (planet === "moon" ? 3.5 : 1.8);
  const longitude = normalizeDegrees(config.base + config.speed * days + seasonalWave);
  const signIndex = Math.floor(longitude / 30);
  const degree = longitude - signIndex * 30;
  const retrograde = Boolean(config.retroCycle && Math.sin((days / config.retroCycle) * Math.PI * 2) < -0.72);
  return {
    planet,
    label: config.label,
    longitude: round(longitude, 2),
    sign: signs[signIndex],
    signIndex,
    degree: round(degree, 2),
    retrograde,
  };
}

function calculateSynastry(chartA: NatalChart, chartB: NatalChart) {
  const aspects: SynastryAspect[] = [];
  for (const a of chartA.positions) {
    for (const b of chartB.positions) {
      const key = pairKey(a.planet, b.planet);
      if (!relevantPairs.has(key)) continue;
      const aspect = findAspect(a, b);
      if (!aspect) continue;
      const rule = pairRules[key];
      const hard = aspect.type === "square" || aspect.type === "opposition";
      aspects.push({
        id: `${a.planet}-${b.planet}-${aspect.type}`,
        personAPlanet: a.planet,
        personBPlanet: b.planet,
        personAPlanetLabel: a.label,
        personBPlanetLabel: b.label,
        type: aspect.type,
        typeLabel: aspectDefs[aspect.type].label,
        angle: aspectDefs[aspect.type].angle,
        orb: aspect.orb,
        maxOrb: aspect.maxOrb,
        strength: aspect.strength,
        dimension: rule.dimension,
        title: rule.title,
        interpretation: hard ? rule.hard : rule.soft,
      });
    }
  }
  return aspects.sort((a, b) => b.strength - a.strength).slice(0, 12);
}

function pairKey(a: AstrologyPlanetKey, b: AstrologyPlanetKey) {
  const set = new Set([`${a}-${b}`, `${b}-${a}`]);
  return [...set].find((key) => relevantPairs.has(key)) ?? `${a}-${b}`;
}

function findAspect(a: PlanetPosition, b: PlanetPosition) {
  const distance = angularDistance(a.longitude, b.longitude);
  for (const type of aspectOrder) {
    const def = aspectDefs[type];
    const orb = Math.abs(distance - def.angle);
    const boostedOrb = a.planet === "sun" || a.planet === "moon" || b.planet === "sun" || b.planet === "moon" ? def.maxOrb + 1 : def.maxOrb;
    if (orb <= boostedOrb) {
      const rawStrength = 1 - orb / boostedOrb;
      return {
        type,
        orb: round(orb, 2),
        maxOrb: boostedOrb,
        strength: Math.round(Math.max(0.25, rawStrength) * 100),
      };
    }
  }
  return null;
}

function angularDistance(a: number, b: number) {
  const diff = Math.abs(normalizeDegrees(a - b));
  return diff > 180 ? 360 - diff : diff;
}

function calculateScores(aspects: SynastryAspect[], fullTimeKnown: boolean): AstrologyScores {
  const scores: AstrologyScores = {
    overall: 48,
    chemistry: 42,
    emotional: 42,
    communication: 42,
    intimacy: 42,
    stability: fullTimeKnown ? 42 : 38,
    conflictRisk: 34,
  };
  for (const aspect of aspects) {
    const rule = pairRules[pairKey(aspect.personAPlanet, aspect.personBPlanet)];
    if (!rule) continue;
    const deltas = rule.deltas[aspect.type];
    const weight = aspect.strength / 100;
    for (const [key, value] of Object.entries(deltas) as [keyof AstrologyScores, number][]) {
      scores[key] += value * weight;
    }
  }
  scores.overall += (scores.chemistry + scores.emotional + scores.communication + scores.intimacy + scores.stability) / 18;
  scores.overall -= Math.max(0, scores.conflictRisk - 54) * 0.22;
  return {
    overall: clampScore(Math.round(scores.overall), 50),
    chemistry: clampScore(Math.round(scores.chemistry), 45),
    emotional: clampScore(Math.round(scores.emotional), 45),
    communication: clampScore(Math.round(scores.communication), 45),
    intimacy: clampScore(Math.round(scores.intimacy), 45),
    stability: clampScore(Math.round(scores.stability), 42),
    conflictRisk: clampScore(Math.round(scores.conflictRisk), 35),
  };
}

function buildTags(scores: AstrologyScores, aspects: SynastryAspect[]) {
  const tags: string[] = [];
  if (scores.chemistry >= 64) tags.push("心动火花强");
  if (scores.emotional >= 62) tags.push("情绪共振");
  if (scores.communication >= 60) tags.push("聊天能对频");
  if (scores.stability >= 58) tags.push("适合慢慢沉淀");
  if (scores.conflictRisk >= 58) tags.push("强吸引也强拉扯");
  if (aspects.some((item) => item.type === "square" || item.type === "opposition")) tags.push("需要翻译彼此需求");
  if (!tags.length) tags.push("需要更多相处验证");
  return tags.slice(0, 5);
}

function buildOneLineSummary(scores: AstrologyScores, tags: string[]) {
  if (scores.overall >= 72) return `这段合盘最明显的信号是「${tags[0]}」，有吸引、有互动张力，也需要稳定沟通来接住。`;
  if (scores.overall >= 58) return `这是一组有可发展空间的关系配置，亮点不算少，但节奏和边界需要慢慢确认。`;
  return `这组配置更适合先观察真实相处，不急着用心动感替代关系确定性。`;
}

function buildBasicAdvice(scores: AstrologyScores) {
  if (scores.conflictRisk >= 62) return "建议不要用试探推进关系，先把需求讲清楚，把容易误会的点放到台面上。";
  if (scores.communication >= 62) return "你们适合通过一次坦诚但不压迫的沟通推进关系，把暧昧感落到具体相处节奏里。";
  if (scores.chemistry >= 64) return "吸引力是优势，但不要只靠心动续航，建议观察对方是否有稳定行动。";
  return "先把这份结果当成关系观察镜，不要急着下定论，多看现实里的回应和行动。";
}

function round(value: number, digits: number) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}
