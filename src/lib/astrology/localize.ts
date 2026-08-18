import type {
  AspectType,
  AstrologyPlanetKey,
  AstrologyReport,
  AstrologyScores,
  SynastryAspect,
} from "@/types/astrology";

const signNames = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

const planetNames: Record<AstrologyPlanetKey, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
};

const aspectNames: Record<AspectType, string> = {
  conjunction: "Conjunction",
  sextile: "Sextile",
  square: "Square",
  trine: "Trine",
  opposition: "Opposition",
};

const aspectCopy: Record<string, { title: string; soft: string; hard: string }> = {
  "sun-moon": {
    title: "Core rhythm and emotional needs",
    soft: "Your basic life rhythm and emotional needs can recognize each other naturally. This can create a familiar, easy-to-return-to feeling.",
    hard: "There is attraction, but your emotional timing may not always land in the same place. The connection needs translation instead of assumptions.",
  },
  "moon-venus": {
    title: "Tenderness and emotional comfort",
    soft: "This pattern can make affection feel gentle and comforting. It supports small gestures, warmth, and emotional safety.",
    hard: "You may care in different languages. One person may offer comfort in a way the other does not immediately read as love.",
  },
  "venus-mars": {
    title: "Romantic spark and physical chemistry",
    soft: "This is one of the classic chemistry signatures. It can make attraction feel visible, playful, and easier to act on.",
    hard: "The spark is real, but the pace may feel uneven. If rushed, chemistry can turn into push-pull energy.",
  },
  "mercury-mercury": {
    title: "Conversation rhythm and mental style",
    soft: "Your thinking styles can meet each other with less friction. This supports honest conversations and clearer repair after misunderstandings.",
    hard: "You may process things differently. One person may want logic and detail while the other needs tone, reassurance, or emotional context.",
  },
  "sun-venus": {
    title: "Appreciation and feeling chosen",
    soft: "There is a natural sense of liking what the other person brings. It can feel easy to admire, compliment, and enjoy each other.",
    hard: "Attraction exists, but your way of showing appreciation may not always match what the other person expects.",
  },
  "moon-mars": {
    title: "Emotional triggers and action energy",
    soft: "Action can help emotions move. This can work well when affection is shown through concrete effort, not just words.",
    hard: "This can be magnetic and reactive at the same time. Small tone shifts may feel bigger than intended, so pacing matters.",
  },
};

export const englishAstrologyScoreLabels: { key: keyof AstrologyScores; label: string; highMeansRisk: boolean }[] = [
  { key: "overall", label: "Chemistry Score", highMeansRisk: false },
  { key: "chemistry", label: "Romantic Chemistry", highMeansRisk: false },
  { key: "emotional", label: "Emotional Bond", highMeansRisk: false },
  { key: "communication", label: "Communication Pattern", highMeansRisk: false },
  { key: "intimacy", label: "Intimacy Spark", highMeansRisk: false },
  { key: "stability", label: "Long-term Potential", highMeansRisk: false },
  { key: "conflictRisk", label: "Friction Risk", highMeansRisk: true },
];

export function localizeAstrologyReport(report: AstrologyReport, locale: AstrologyReport["locale"]) {
  if (locale !== "en-US") return report;

  const localized: AstrologyReport = {
    ...report,
    locale: "en-US",
    chartA: localizeChart(report.chartA),
    chartB: localizeChart(report.chartB),
    coreTags: buildEnglishTags(report.scores, report.aspects),
    oneLineSummary: buildEnglishSummary(report.scores),
    basicAdvice: buildEnglishAdvice(report.scores),
    dataQualityNotice:
      report.chartA.timeKnown && report.chartB.timeKnown
        ? null
        : "Birth time was not provided for at least one person, so rising signs, houses, and descendant points are not included. This reading focuses on planets and synastry aspects only.",
    calculationSource: "Love Radar Astrology V1 approximate planetary calculation. This is for entertainment and relationship reflection.",
  };

  localized.aspects = report.aspects.map(localizeAspect);
  localized.ai = buildEnglishFallbackAi(localized);
  return localized;
}

function localizeChart(chart: AstrologyReport["chartA"]): AstrologyReport["chartA"] {
  return {
    ...chart,
    calculationNote: chart.timeKnown
      ? "Calculated with birth date, birth time, and city timezone using Love Radar Astrology V1."
      : "Birth time was not used. Rising signs, houses, and descendant points are skipped in V1.",
    positions: chart.positions.map((position) => ({
      ...position,
      label: planetNames[position.planet],
      sign: signNames[position.signIndex] ?? position.sign,
    })),
  };
}

function localizeAspect(aspect: SynastryAspect): SynastryAspect {
  const pair = getPairKey(aspect.personAPlanet, aspect.personBPlanet);
  const copy = aspectCopy[pair];
  const hard = aspect.type === "square" || aspect.type === "opposition";
  return {
    ...aspect,
    personAPlanetLabel: planetNames[aspect.personAPlanet],
    personBPlanetLabel: planetNames[aspect.personBPlanet],
    typeLabel: aspectNames[aspect.type],
    title: copy?.title ?? "Relationship pattern",
    interpretation: copy ? (hard ? copy.hard : copy.soft) : "This aspect adds a visible tone to the way this connection may feel.",
  };
}

function getPairKey(a: AstrologyPlanetKey, b: AstrologyPlanetKey) {
  const direct = `${a}-${b}`;
  const reverse = `${b}-${a}`;
  if (aspectCopy[direct]) return direct;
  if (aspectCopy[reverse]) return reverse;
  return direct;
}

function buildEnglishTags(scores: AstrologyScores, aspects: SynastryAspect[]) {
  const tags: string[] = [];
  if (scores.chemistry >= 64) tags.push("Magnetic chemistry");
  if (scores.emotional >= 62) tags.push("Emotional resonance");
  if (scores.communication >= 60) tags.push("Easy conversation");
  if (scores.stability >= 58) tags.push("Slow-burn potential");
  if (scores.conflictRisk >= 58) tags.push("Attraction with friction");
  if (aspects.some((item) => item.type === "square" || item.type === "opposition")) tags.push("Needs emotional translation");
  if (!tags.length) tags.push("Still unfolding");
  return tags.slice(0, 5);
}

function buildEnglishSummary(scores: AstrologyScores) {
  if (scores.conflictRisk >= 65 && scores.chemistry >= 60) {
    return "There is chemistry here, but the emotional rhythm needs patience and clearer pacing.";
  }
  if (scores.overall >= 72) {
    return "This connection has real warmth and attraction, with enough grounding to keep exploring.";
  }
  if (scores.overall >= 58) {
    return "There are promising signals, but the relationship needs more time and real-life consistency.";
  }
  return "This connection is better treated as something to observe slowly rather than rush into a conclusion.";
}

function buildEnglishAdvice(scores: AstrologyScores) {
  if (scores.conflictRisk >= 62) {
    return "Avoid testing each other through silence or mixed signals. Name what you need clearly and watch whether actions become steadier.";
  }
  if (scores.communication >= 62) {
    return "A calm, honest conversation will do more than guessing. Try turning chemistry into a clearer rhythm of contact.";
  }
  if (scores.chemistry >= 64) {
    return "The spark is useful, but do not let attraction replace consistency. Look for steady effort, not just intensity.";
  }
  return "Use this reading as a relationship mirror, not a final answer. Let real-life behavior confirm what the chart suggests.";
}

function buildEnglishFallbackAi(report: AstrologyReport) {
  return {
    overallConnection: report.oneLineSummary,
    attractionReason: "The attraction comes from visible synastry signals between personal planets. It can feel interesting, but it still needs real-life consistency.",
    emotionalBond: "There is emotional potential here, especially if both people can express needs without guessing or testing each other.",
    communicationPattern: "The communication pattern may work best when both sides name what they mean instead of relying on hints.",
    chemistryAndIntimacy: "Chemistry may be present, but it should not be treated as proof of commitment. Watch whether warmth becomes steady action.",
    longTermPotential: "Long-term potential depends less on the chart and more on consistency, emotional pacing, and mutual respect.",
    biggestStrength: report.coreTags[0] || "There is still something worth observing in the connection.",
    biggestChallenge: "Do not turn astrology into a final verdict. Use it as context, then check the real behavior.",
    relationshipAdvice: report.basicAdvice,
    futureTrend: "Over the next few weeks, pay attention to whether communication becomes clearer and effort becomes more consistent.",
    smartReplies: [
      "I like talking to you, but I also need a clearer rhythm between us.",
      "I do not want to overread things. Can we be more direct about what we both want?",
      "I am open to seeing where this goes, as long as it feels mutual.",
    ],
    shareCardText: report.oneLineSummary,
  };
}
