export type EnglishPersonalityGender = "male" | "female" | "private";

export type EnglishPersonalityType =
  | "slow-observer"
  | "deep-feeler"
  | "grand-romantic"
  | "boundary-keeper"
  | "signal-scanner";

export type EnglishPersonalityScores = Record<EnglishPersonalityType, number>;

export type EnglishPersonalityQuestion = {
  title: string;
  options: { label: string; text: string }[];
};

export const englishPersonalityQuestions: EnglishPersonalityQuestion[] = [
  {
    title: "Someone you like suddenly texts: 'hey, you up?' What is your first reaction?",
    options: [
      { label: "A", text: "They finally texted me. I answer, but try to sound normal." },
      { label: "B", text: "Why now? I immediately start reading between the lines." },
      { label: "C", text: "Perfect timing. I flirt back and make it a moment." },
      { label: "D", text: "I ask what they need and keep my expectations steady." },
    ],
  },
  {
    title: "They say: 'You're honestly so good to me.' What do you hear underneath it?",
    options: [
      { label: "A", text: "They noticed. Maybe my quiet effort actually matters." },
      { label: "B", text: "That sounds loaded. Are they grateful, guilty, or pulling away?" },
      { label: "C", text: "That's my cue to plan something sweet." },
      { label: "D", text: "Kind words are nice, but I still need clarity." },
    ],
  },
  {
    title: "In a relationship, you are most likely to:",
    options: [
      { label: "A", text: "Care deeply, but reveal it slowly." },
      { label: "B", text: "Remember tiny details they probably forgot saying." },
      { label: "C", text: "Turn normal days into movie scenes." },
      { label: "D", text: "Love hard without losing your own life." },
    ],
  },
  {
    title: "They post an Instagram story: 'I'm tired of everything.' You:",
    options: [
      { label: "A", text: "Check in quietly and make sure they are okay." },
      { label: "B", text: "Wonder if it is about you, them, or someone else." },
      { label: "C", text: "Send comfort immediately, maybe food, memes, or a voice note." },
      { label: "D", text: "React gently, but let them choose whether to open up." },
    ],
  },
  {
    title: "Your crush leaves you on read for a full day. Your inner monologue is:",
    options: [
      { label: "A", text: "They may be busy. I will not panic yet." },
      { label: "B", text: "The read receipt is now evidence in a very serious case." },
      { label: "C", text: "I might send one playful line to bring the energy back." },
      { label: "D", text: "I keep living my life. Consistency matters more than guessing." },
    ],
  },
  {
    title: "A friend asks why you like them. Your answer is closest to:",
    options: [
      { label: "A", text: "They make me feel seen, even when I do not say much." },
      { label: "B", text: "Their little habits and emotional details get to me." },
      { label: "C", text: "I want to give them the kind of love people write about." },
      { label: "D", text: "They feel like someone I could grow with." },
    ],
  },
  {
    title: "After an argument, you usually:",
    options: [
      { label: "A", text: "Need time, then come back with a carefully honest explanation." },
      { label: "B", text: "Replay every sentence until you find the emotional pattern." },
      { label: "C", text: "Try to repair it with a big sincere gesture." },
      { label: "D", text: "Want to solve the issue directly, not sit in endless silence." },
    ],
  },
  {
    title: "If your love life were a movie, you would want it to feel like:",
    options: [
      { label: "A", text: "Two guarded people slowly realizing they matter to each other." },
      { label: "B", text: "Two souls understanding each other in a way nobody else can." },
      { label: "C", text: "A dramatic romance with unforgettable scenes." },
      { label: "D", text: "Two independent people choosing each other again and again." },
    ],
  },
  {
    title: "They ask: 'What if one day I stop feeling this way?' You say:",
    options: [
      { label: "A", text: "Then I would want us to be honest before we hurt each other." },
      { label: "B", text: "Why are you asking that? Did something change?" },
      { label: "C", text: "I would fight for us." },
      { label: "D", text: "If that happens, we should respect the truth." },
    ],
  },
  {
    title: "Your friends would describe your love style as:",
    options: [
      { label: "A", text: "Quiet at first, but deeply loyal once you care." },
      { label: "B", text: "Emotionally observant, maybe a little too good at noticing shifts." },
      { label: "C", text: "Romantic like you are producing a feature film." },
      { label: "D", text: "Warm, but still clear about your standards." },
    ],
  },
];

const englishScoreByAnswer: Record<string, Partial<EnglishPersonalityScores>> = {
  "0-A": { "slow-observer": 3, "signal-scanner": 1 },
  "0-B": { "deep-feeler": 2, "signal-scanner": 3 },
  "0-C": { "grand-romantic": 3 },
  "0-D": { "boundary-keeper": 2, "slow-observer": 1 },
  "1-A": { "slow-observer": 3, "deep-feeler": 1 },
  "1-B": { "deep-feeler": 3, "signal-scanner": 2 },
  "1-C": { "grand-romantic": 3 },
  "1-D": { "boundary-keeper": 3 },
  "2-A": { "slow-observer": 3 },
  "2-B": { "deep-feeler": 3, "signal-scanner": 1 },
  "2-C": { "grand-romantic": 3 },
  "2-D": { "boundary-keeper": 3, "slow-observer": 1 },
  "3-A": { "slow-observer": 2, "deep-feeler": 1 },
  "3-B": { "signal-scanner": 3, "deep-feeler": 2 },
  "3-C": { "grand-romantic": 3 },
  "3-D": { "boundary-keeper": 3 },
  "4-A": { "slow-observer": 2, "boundary-keeper": 1 },
  "4-B": { "signal-scanner": 4, "deep-feeler": 1 },
  "4-C": { "grand-romantic": 3, "signal-scanner": 1 },
  "4-D": { "boundary-keeper": 3, "slow-observer": 1 },
  "5-A": { "slow-observer": 3, "deep-feeler": 1 },
  "5-B": { "deep-feeler": 3, "signal-scanner": 1 },
  "5-C": { "grand-romantic": 3 },
  "5-D": { "boundary-keeper": 3 },
  "6-A": { "slow-observer": 3 },
  "6-B": { "deep-feeler": 2, "signal-scanner": 2 },
  "6-C": { "grand-romantic": 3 },
  "6-D": { "boundary-keeper": 3 },
  "7-A": { "slow-observer": 4 },
  "7-B": { "deep-feeler": 3 },
  "7-C": { "grand-romantic": 4 },
  "7-D": { "boundary-keeper": 3 },
  "8-A": { "slow-observer": 2, "boundary-keeper": 2 },
  "8-B": { "signal-scanner": 3, "deep-feeler": 2 },
  "8-C": { "grand-romantic": 3 },
  "8-D": { "boundary-keeper": 3 },
  "9-A": { "slow-observer": 4 },
  "9-B": { "signal-scanner": 3, "deep-feeler": 2 },
  "9-C": { "grand-romantic": 3 },
  "9-D": { "boundary-keeper": 3 },
};

export const englishPersonalityMeta: Record<
  EnglishPersonalityType,
  {
    name: string;
    keywords: string[];
    summary: string;
    strength: string;
    caution: string;
    male: string[];
    female: string[];
  }
> = {
  "slow-observer": {
    name: "Slow-Burn Observer",
    keywords: ["guarded", "loyal", "quietly intense"],
    summary: "You notice more than you say. You do not rush into love, but once someone matters, your care becomes steady and hard to shake.",
    strength: "Your love feels safe because it is not performative. You protect, remember, and show up when it counts.",
    caution: "Do not make people guess every feeling. A little directness can turn quiet loyalty into real closeness.",
    male: ["Peter Parker"],
    female: ["Katniss Everdeen"],
  },
  "deep-feeler": {
    name: "Emotional Deep Feeler",
    keywords: ["sensitive", "intuitive", "emotionally invested"],
    summary: "You feel the temperature of a relationship quickly. A small shift in tone can stay with you longer than you want to admit.",
    strength: "You make people feel understood. Your emotional depth can make ordinary connection feel rare.",
    caution: "A feeling is important, but it is not always proof. Check the facts before letting the story in your head decide everything.",
    male: ["Jack Dawson"],
    female: ["Bella Swan"],
  },
  "grand-romantic": {
    name: "Grand Romantic",
    keywords: ["expressive", "devoted", "cinematic"],
    summary: "When you care, you want love to be felt. You believe romance should have effort, timing, and a little bit of drama.",
    strength: "You bring warmth and momentum. People with you rarely feel like love is boring or invisible.",
    caution: "Big gestures are beautiful, but they should not become a one-person performance. Watch whether the energy comes back to you.",
    male: ["Romeo Montague"],
    female: ["Rose DeWitt Bukater"],
  },
  "boundary-keeper": {
    name: "Boundary Keeper",
    keywords: ["clear", "self-possessed", "principled"],
    summary: "You can be affectionate without abandoning yourself. You want love, but not at the cost of your standards or peace.",
    strength: "You bring clarity to confusing dynamics. You are less likely to romanticize behavior that keeps hurting you.",
    caution: "Boundaries protect you, but vulnerability lets people meet you. Let the right person see the softer layer too.",
    male: ["Nick Wilde"],
    female: ["Hermione Granger"],
  },
  "signal-scanner": {
    name: "Signal Scanner",
    keywords: ["observant", "flirty", "pattern-aware"],
    summary: "You catch micro-signals fast: a delayed reply, a changed tone, a story view, a sudden nickname. Your radar is always on.",
    strength: "You rarely miss emotional shifts. That makes you quick at sensing chemistry and distance.",
    caution: "Your radar is powerful, but it still needs calibration. Not every pause is a plot twist.",
    male: ["Jim Halpert"],
    female: ["Blair Waldorf"],
  },
};

export function calculateEnglishPersonality(answers: string[]) {
  const scores: EnglishPersonalityScores = {
    "slow-observer": 0,
    "deep-feeler": 0,
    "grand-romantic": 0,
    "boundary-keeper": 0,
    "signal-scanner": 0,
  };

  answers.forEach((answer, index) => {
    const contribution = englishScoreByAnswer[`${index}-${answer}`];
    if (!contribution) return;
    Object.entries(contribution).forEach(([type, value]) => {
      scores[type as EnglishPersonalityType] += value || 0;
    });
  });

  const order: EnglishPersonalityType[] = [
    "slow-observer",
    "signal-scanner",
    "deep-feeler",
    "boundary-keeper",
    "grand-romantic",
  ];
  const topScore = Math.max(...Object.values(scores));
  const winner = order.find((type) => scores[type] === topScore) || "slow-observer";
  return { type: winner, scores };
}

export function pickEnglishRepresentative(type: EnglishPersonalityType, gender: EnglishPersonalityGender) {
  const meta = englishPersonalityMeta[type];
  const candidates = gender === "female" ? meta.female : gender === "male" ? meta.male : [...meta.male, ...meta.female];
  const list = candidates.length ? candidates : [...meta.male, ...meta.female];
  return list[Math.floor(Math.random() * list.length)];
}
