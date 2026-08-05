export type PersonalityGender = "male" | "female" | "private";

export type PersonalityType =
  | "slow-observer"
  | "empathy-investor"
  | "romantic-doer"
  | "boundary-keeper"
  | "ambiguity-radar";

export type PersonalityScores = Record<PersonalityType, number>;

export type PersonalityQuestion = {
  title: string;
  options: { label: string; text: string }[];
};

export const personalityQuestions: PersonalityQuestion[] = [
  {
    title: "喜欢的人突然给你发：‘在吗？’你的第一反应是？",
    options: [
      { label: "A", text: "终于找我了！TA 是不是想我了？马上放下手里的事回复。" },
      { label: "B", text: "怎么突然问这个？是不是发生什么事了？开始分析语气。" },
      { label: "C", text: "等一下，我不能秒回，要保持神秘感。调整一下回复时间。" },
      { label: "D", text: "在，怎么了？简单直接，不猜剧情。" },
    ],
  },
  {
    title: "对方说：‘你对我真好。’你觉得这句话的隐藏含义是？",
    options: [
      { label: "A", text: "TA 感受到我的爱，我要继续努力。" },
      { label: "B", text: "等等，TA 为什么突然这么说？是不是有别的意思？" },
      { label: "C", text: "机会来了，马上安排一个惊喜。" },
      { label: "D", text: "感谢可以，但我更想知道我们是什么关系。" },
    ],
  },
  {
    title: "恋爱中的你，更像：",
    options: [
      { label: "A", text: "嘴上说‘随便’，心里想‘你怎么还不懂我？’" },
      { label: "B", text: "手机里保存了对方每一句特别的话。" },
      { label: "C", text: "每个节日提前一个月准备礼物。" },
      { label: "D", text: "喜欢一个人，但也会保留自己的生活。" },
    ],
  },
  {
    title: "看到对象朋友圈：‘有点累。’你的操作是？",
    options: [
      { label: "A", text: "马上私聊：‘怎么啦？发生什么了？’" },
      { label: "B", text: "开始分析：‘发这个朋友圈是不是在暗示什么？’" },
      { label: "C", text: "直接点外卖送过去。" },
      { label: "D", text: "点赞，然后等对方愿意主动说。" },
    ],
  },
  {
    title: "如果暧昧对象一天没回复：",
    options: [
      { label: "A", text: "告诉自己：TA 可能真的忙。" },
      { label: "B", text: "打开聊天框 50 次：TA 是不是不喜欢我了？" },
      { label: "C", text: "发一句：‘是不是想我了？’" },
      { label: "D", text: "也忙自己的，晚上再看看情况。" },
    ],
  },
  {
    title: "朋友问：‘你为什么喜欢 TA？’你的答案更接近：",
    options: [
      { label: "A", text: "因为 TA 让我感觉很特别。" },
      { label: "B", text: "因为 TA 很多小细节和别人不一样。" },
      { label: "C", text: "因为我想给 TA 最好的。" },
      { label: "D", text: "因为 TA 适合和我一起成长。" },
    ],
  },
  {
    title: "你们吵架后，你通常：",
    options: [
      { label: "A", text: "冷静几天，再认真解释自己的想法。" },
      { label: "B", text: "回想吵架全过程，分析每一句话。" },
      { label: "C", text: "想办法制造一个浪漫和好的机会。" },
      { label: "D", text: "先解决问题，不接受无限冷战。" },
    ],
  },
  {
    title: "如果爱情是一部电影，你希望自己的剧情是：",
    options: [
      { label: "A", text: "两个孤独的人慢慢靠近，最后发现彼此重要。" },
      { label: "B", text: "两个灵魂互相理解，别人都无法替代。" },
      { label: "C", text: "轰轰烈烈，全世界都知道我们相爱。" },
      { label: "D", text: "两个独立的人并肩走很远。" },
    ],
  },
  {
    title: "对方突然问：‘如果有一天我不喜欢你了怎么办？’你的回答：",
    options: [
      { label: "A", text: "那我会努力让 TA 重新喜欢我。" },
      { label: "B", text: "为什么突然这么问？发生什么了吗？" },
      { label: "C", text: "不会有那一天，因为我会一直爱你。" },
      { label: "D", text: "如果真的发生，我们都尊重彼此选择。" },
    ],
  },
  {
    title: "朋友评价你的恋爱状态：",
    options: [
      { label: "A", text: "你平时挺冷静，一恋爱突然变温柔。" },
      { label: "B", text: "你谈恋爱像开侦探模式。" },
      { label: "C", text: "你谈恋爱像准备一个大型项目。" },
      { label: "D", text: "你很爱别人，但不会忘记自己。" },
    ],
  },
];

const scoreByAnswer: Record<string, Partial<PersonalityScores>> = {
  "0-A": { "slow-observer": 3, "ambiguity-radar": 1 },
  "0-B": { "empathy-investor": 2, "ambiguity-radar": 3 },
  "0-C": { "romantic-doer": 2 },
  "0-D": { "slow-observer": 2, "boundary-keeper": 1 },
  "1-A": { "slow-observer": 2, "empathy-investor": 1 },
  "1-B": { "empathy-investor": 3, "ambiguity-radar": 2 },
  "1-C": { "romantic-doer": 3 },
  "1-D": { "boundary-keeper": 3 },
  "2-A": { "slow-observer": 2 },
  "2-B": { "empathy-investor": 3 },
  "2-C": { "romantic-doer": 3 },
  "2-D": { "boundary-keeper": 3, "slow-observer": 1 },
  "3-A": { "empathy-investor": 2, "ambiguity-radar": 2 },
  "3-B": { "empathy-investor": 2, "ambiguity-radar": 3 },
  "3-C": { "romantic-doer": 3 },
  "3-D": { "boundary-keeper": 2, "slow-observer": 1 },
  "4-A": { "slow-observer": 2, "ambiguity-radar": 2 },
  "4-B": { "empathy-investor": 2, "ambiguity-radar": 3 },
  "4-C": { "romantic-doer": 3 },
  "4-D": { "boundary-keeper": 2, "slow-observer": 1 },
  "5-A": { "slow-observer": 3 },
  "5-B": { "empathy-investor": 2, "ambiguity-radar": 2 },
  "5-C": { "romantic-doer": 3 },
  "5-D": { "boundary-keeper": 3 },
  "6-A": { "slow-observer": 2, "ambiguity-radar": 1 },
  "6-B": { "empathy-investor": 2, "ambiguity-radar": 2 },
  "6-C": { "romantic-doer": 3 },
  "6-D": { "boundary-keeper": 3 },
  "7-A": { "slow-observer": 3 },
  "7-B": { "empathy-investor": 3, "ambiguity-radar": 2 },
  "7-C": { "romantic-doer": 4 },
  "7-D": { "boundary-keeper": 3 },
  "8-A": { "slow-observer": 2, "ambiguity-radar": 1 },
  "8-B": { "empathy-investor": 2, "ambiguity-radar": 2 },
  "8-C": { "romantic-doer": 3 },
  "8-D": { "boundary-keeper": 3 },
  "9-A": { "slow-observer": 2, "empathy-investor": 1 },
  "9-B": { "empathy-investor": 2, "ambiguity-radar": 3 },
  "9-C": { "romantic-doer": 3 },
  "9-D": { "boundary-keeper": 3 },
};

export const personalityMeta: Record<
  PersonalityType,
  { name: string; keywords: string[]; summary: string; strength: string; caution: string; male: string[]; female: string[] }
> = {
  "slow-observer": {
    name: "🕷️慢热观察员",
    keywords: ["慢热", "守护", "后知后觉"],
    summary: "你不是没有感觉，只是习惯先观察，再确认自己的心意。",
    strength: "一旦认定，你的在意通常很稳定，也愿意默默守护。",
    caution: "别把所有心事都留给对方猜，偶尔直接表达会让关系轻松很多。",
    male: ["彼得帕克"],
    female: ["紫霞仙子"],
  },
  "empathy-investor": {
    name: "🌙高共情投入者",
    keywords: ["敏感", "细腻", "容易感受到情绪"],
    summary: "你很容易捕捉到关系里的细小变化，也愿意认真接住对方的情绪。",
    strength: "共情力强，能让喜欢的人感到被理解、被重视。",
    caution: "感受到情绪不等于确认了事实，别让猜测替你做决定。",
    male: ["Jack"],
    female: ["林黛玉"],
  },
  "romantic-doer": {
    name: "❤️浪漫行动派",
    keywords: ["表达", "付出", "仪式感"],
    summary: "喜欢一个人时，你更愿意用具体行动把心意送到对方面前。",
    strength: "热烈、主动，能把平淡的相处变成有记忆点的时刻。",
    caution: "付出之前也看看对方有没有回应，浪漫不该只由一个人完成。",
    male: ["灰太狼", "罗密欧", "程蝶衣"],
    female: [],
  },
  "boundary-keeper": {
    name: "🛡️边界感守门人",
    keywords: ["清醒", "自我", "需要确定关系"],
    summary: "你可以很爱一个人，但不会轻易放弃自己的节奏和边界。",
    strength: "清醒且有分寸，遇到问题更愿意推动关系回到现实。",
    caution: "保持边界不等于拒绝靠近，适当暴露真实感受会让对方更懂你。",
    male: ["尼克狐尼克"],
    female: ["甄嬛"],
  },
  "ambiguity-radar": {
    name: "📡暧昧雷达型",
    keywords: ["观察", "捕捉信号", "容易脑补"],
    summary: "一句话、一个停顿、一次已读，都可能被你捕捉成关系信号。",
    strength: "观察敏锐，常常能比别人更早发现关系里的变化。",
    caution: "雷达很灵，但也需要事实校准，别让脑内剧情跑在现实前面。",
    male: ["沸羊羊"],
    female: ["黄蓉"],
  },
};

export function calculatePersonality(answers: string[]) {
  const scores: PersonalityScores = {
    "slow-observer": 0,
    "empathy-investor": 0,
    "romantic-doer": 0,
    "boundary-keeper": 0,
    "ambiguity-radar": 0,
  };

  answers.forEach((answer, index) => {
    const contribution = scoreByAnswer[`${index}-${answer}`];
    if (!contribution) return;
    Object.entries(contribution).forEach(([type, value]) => {
      scores[type as PersonalityType] += value || 0;
    });
  });

  const order: PersonalityType[] = [
    "romantic-doer",
    "ambiguity-radar",
    "empathy-investor",
    "boundary-keeper",
    "slow-observer",
  ];
  const topScore = Math.max(...Object.values(scores));
  const winner = order.find((type) => scores[type] === topScore) || "slow-observer";
  return { type: winner, scores };
}

export function pickRepresentative(type: PersonalityType, gender: PersonalityGender) {
  const meta = personalityMeta[type];
  const candidates = type === "romantic-doer" || gender === "private" ? [...meta.male, ...meta.female] : gender === "female" ? meta.female : meta.male;
  const list = candidates.length ? candidates : meta.male;
  return list[Math.floor(Math.random() * list.length)];
}
