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

export type PersonalityReportSection = {
  title: string;
  body: string;
};

export type PersonalityMeta = {
  name: string;
  displayName: string;
  englishName: string;
  symbol: string;
  keywords: string[];
  summary: string;
  coreLine: string;
  strength: string;
  caution: string;
  male: string[];
  female: string[];
  sections: PersonalityReportSection[];
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
  PersonalityMeta
> = {
  "slow-observer": {
    name: "🕷️慢热观察员",
    displayName: "慢热观察员",
    englishName: "Slow-Burn Observer",
    symbol: "🕷️",
    keywords: ["慢热", "守护", "后知后觉"],
    summary: "你不是没有感觉，只是习惯先观察，再确认自己的心意。",
    coreLine: "你看起来比谁都独立，其实只是希望有人能坚定地选择你。",
    strength: "一旦认定，你的在意通常很稳定，也愿意默默守护。",
    caution: "别把所有心事都留给对方猜，偶尔直接表达会让关系轻松很多。",
    male: ["彼得帕克"],
    female: ["MJ", "紫霞仙子"],
    sections: [
      { title: "你的恋爱底色", body: "你需要先确认安全感，再把更柔软的一面交出去。慢一点不是冷淡，而是你对认真关系的保护。" },
      { title: "心动时的你", body: "你会记住很多小细节，却不一定马上承认自己已经心动。你的喜欢通常藏在稳定的回应和默默的照顾里。" },
      { title: "暧昧期的你", body: "你会观察对方是否持续、是否真诚，再决定要不要靠近。面对忽冷忽热，你容易把耐心用成等待。" },
      { title: "恋爱后的你", body: "一旦确认关系，你会比想象中更温柔、更有责任感。你不爱高调证明，但会在关键时刻出现。" },
      { title: "吵架时的你", body: "你需要一点时间整理情绪，之后才愿意把真正的想法说清楚。沉默可以是缓冲，但别让它变成让对方猜的考题。" },
      { title: "你的隐藏需求", body: "你想要的不是被追得多热烈，而是被坚定、稳定地选择。明确的回应会让你更敢表达自己。" },
      { title: "你的恋爱雷区", body: "长期暧昧、承诺落空和情绪失联，会让你慢慢收回投入。你最容易受伤的时刻，是把对方的犹豫解释成自己的不够好。" },
      { title: "别人为什么会喜欢你", body: "你让人觉得可靠、安静而有分量。和你相处不需要一直表演，细水长流反而会越来越有安全感。" },
      { title: "最适合你的恋爱人格", body: "愿意主动表达、情绪稳定、把承诺落实到日常的人，会让你不必一直猜测关系的方向。" },
      { title: "容易让你受伤的人格", body: "只享受你的耐心，却不愿意给出明确回应的人，会把你的慢热变成漫长的自我怀疑。" },
      { title: "Love Radar 给你的恋爱建议", body: "不要等到完全确定才表达。把‘我其实有点在意’说出来，往往比默默观察更接近你真正想要的关系。" },
    ],
  },
  "empathy-investor": {
    name: "🌙高共情投入者",
    displayName: "高共情投入者",
    englishName: "Empathetic Investor",
    symbol: "🌙",
    keywords: ["敏感", "细腻", "容易感受到情绪"],
    summary: "你很容易捕捉到关系里的细小变化，也愿意认真接住对方的情绪。",
    coreLine: "你不是想太多，你只是比别人更早感觉到关系里的温度变化。",
    strength: "共情力强，能让喜欢的人感到被理解、被重视。",
    caution: "感受到情绪不等于确认了事实，别让猜测替你做决定。",
    male: ["Jack"],
    female: ["林黛玉"],
    sections: [
      { title: "你的恋爱底色", body: "你会自然地感受关系的温度，也很愿意把自己的注意力放在对方身上。你的投入不是盲目，而是因为你真的在乎。" },
      { title: "心动时的你", body: "一句话的语气、一个停顿、一个只有你们懂的细节，都可能让你记很久。你容易先被情绪连接打动。" },
      { title: "暧昧期的你", body: "你擅长读懂暗示，也容易把不确定的信号反复放大。对方一旦变得冷淡，你会先检查是不是自己做错了什么。" },
      { title: "恋爱后的你", body: "你会主动照顾关系里的情绪，让对方感到被理解。你希望亲密不只是陪伴，更是对彼此内心的认真回应。" },
      { title: "吵架时的你", body: "你会回放对话里的每个细节，努力找到情绪变化的原因。与其让你独自猜，不如直接、温柔地把事实说清楚。" },
      { title: "你的隐藏需求", body: "你需要的是可验证的在乎：稳定的联系、坦诚的说明，以及对方愿意和你一起面对问题。" },
      { title: "你的恋爱雷区", body: "冷处理、模糊承诺和把你的敏感当成负担，会快速消耗你的信任。你不需要完美的恋人，只需要真实的回应。" },
      { title: "别人为什么会喜欢你", body: "你能让人感到自己被看见。你的共情和细腻，会把普通的相处变成很有温度的记忆。" },
      { title: "最适合你的恋爱人格", body: "愿意沟通、情绪诚实、不会用沉默制造悬念的人，会让你的敏锐变成理解，而不是焦虑。" },
      { title: "容易让你受伤的人格", body: "习惯让别人猜、享受暧昧却回避确认的人，会让你不断消耗自己的解释力。" },
      { title: "Love Radar 给你的恋爱建议", body: "先问清楚，再下结论。你的感受值得被认真对待，但它不必一个人承担整段关系的证据责任。" },
    ],
  },
  "romantic-doer": {
    name: "❤️浪漫行动派",
    displayName: "浪漫行动派",
    englishName: "Romantic Doer",
    symbol: "❤️",
    keywords: ["表达", "付出", "仪式感"],
    summary: "喜欢一个人时，你更愿意用具体行动把心意送到对方面前。",
    coreLine: "你愿意把喜欢变成行动，但也值得被同样认真地回应。",
    strength: "热烈、主动，能把平淡的相处变成有记忆点的时刻。",
    caution: "付出之前也看看对方有没有回应，浪漫不该只由一个人完成。",
    male: ["灰太狼", "罗密欧", "程蝶衣"],
    female: [],
    sections: [
      { title: "你的恋爱底色", body: "你相信喜欢应该被看见，也愿意用行动让对方感受到。对你来说，爱不是想法，而是愿意花时间完成的事。" },
      { title: "心动时的你", body: "你很快就会从‘有点喜欢’进入‘我想为 TA 做点什么’。惊喜、礼物和认真安排，都是你的表达方式。" },
      { title: "暧昧期的你", body: "你会主动把气氛推向更靠近的位置，也喜欢看对方因为你的用心而开心。只是主动不等于要独自推进关系。" },
      { title: "恋爱后的你", body: "你会把平凡日子过出仪式感，愿意制造值得记住的时刻。你希望自己的热烈能被接住，而不是被当成理所当然。" },
      { title: "吵架时的你", body: "你倾向于尽快修复关系，甚至用一次大动作替代漫长沟通。真正的和好，除了浪漫，也需要双方把问题讲明白。" },
      { title: "你的隐藏需求", body: "你想确认自己的付出没有落空。一个主动的回应、一句具体的感谢，就能让你知道这份热烈值得继续。" },
      { title: "你的恋爱雷区", body: "单向付出、敷衍接受和只在需要时靠近，会让你的热情慢慢变成疲惫。不要用更多努力证明自己值得被爱。" },
      { title: "别人为什么会喜欢你", body: "你有把快乐带进关系里的能力。和你相处的人很容易感受到你的真诚、热烈和‘我真的有在用心’。" },
      { title: "最适合你的恋爱人格", body: "愿意回应、懂得欣赏细节、也会主动制造共同回忆的人，能和你把浪漫变成双向的日常。" },
      { title: "容易让你受伤的人格", body: "把你的主动当成无限供给，却很少表达感谢或投入的人，会让你在热闹里感到孤单。" },
      { title: "Love Radar 给你的恋爱建议", body: "在送出下一份心意前，先看看对方有没有把上一份接稳。真正好的浪漫，一定有来有往。" },
    ],
  },
  "boundary-keeper": {
    name: "🛡️边界感守门人",
    displayName: "边界感守门人",
    englishName: "Boundary Keeper",
    symbol: "🛡️",
    keywords: ["清醒", "自我", "需要确定关系"],
    summary: "你可以很爱一个人，但不会轻易放弃自己的节奏和边界。",
    coreLine: "你不是不需要爱，你只是希望爱不会让你失去自己。",
    strength: "清醒且有分寸，遇到问题更愿意推动关系回到现实。",
    caution: "保持边界不等于拒绝靠近，适当暴露真实感受会让对方更懂你。",
    male: ["尼克狐尼克"],
    female: ["甄嬛"],
    sections: [
      { title: "你的恋爱底色", body: "你重视亲密，也重视自己的完整。你愿意进入关系，但不会把自我感、生活和判断力一起交出去。" },
      { title: "心动时的你", body: "你会先看对方是否值得信任，再决定要不要让关系更近。你的喜欢不一定高调，但通常很有分寸。" },
      { title: "暧昧期的你", body: "你可以享受心动，却不太愿意长期停在没有定义的位置。持续的模糊，会让你开始重新评估这段关系。" },
      { title: "恋爱后的你", body: "你希望两个人并肩，而不是互相吞没。只要对方尊重你的节奏，你会比表面上更稳定、更愿意付出。" },
      { title: "吵架时的你", body: "你倾向于把问题拉回现实：到底发生了什么、接下来怎么解决。你不喜欢用冷战或情绪勒索代替沟通。" },
      { title: "你的隐藏需求", body: "你需要确定关系里的规则和尊重。知道自己的边界被看见，反而会让你更安心地交付柔软。" },
      { title: "你的恋爱雷区", body: "越界、失信和反复试探，会让你迅速关上门。你最容易错过的，是把防御维持得比真实需要还久。" },
      { title: "别人为什么会喜欢你", body: "你给人的感觉是可靠、清醒、不会轻易失控。和你相处，很多人会觉得自己的生活被尊重了。" },
      { title: "最适合你的恋爱人格", body: "有责任感、说到做到、愿意直接沟通的人，会让你知道亲密和自由可以同时存在。" },
      { title: "容易让你受伤的人格", body: "习惯模糊边界、把控制包装成在乎的人，会让你在关系里越来越不想做自己。" },
      { title: "Love Radar 给你的恋爱建议", body: "边界不是一堵墙，也可以是一扇门。把‘我需要什么’说出来，让真正适合的人有机会靠近。" },
    ],
  },
  "ambiguity-radar": {
    name: "📡暧昧雷达型",
    displayName: "暧昧雷达型",
    englishName: "Ambiguity Radar",
    symbol: "📡",
    keywords: ["观察", "捕捉信号", "容易脑补"],
    summary: "一句话、一个停顿、一次已读，都可能被你捕捉成关系信号。",
    coreLine: "你总能读懂空气，只是别忘了，真正的答案也需要对方说出口。",
    strength: "观察敏锐，常常能比别人更早发现关系里的变化。",
    caution: "雷达很灵，但也需要事实校准，别让脑内剧情跑在现实前面。",
    male: ["沸羊羊"],
    female: ["黄蓉"],
    sections: [
      { title: "你的恋爱底色", body: "你对关系里的变化非常敏锐，很多人还没察觉的信号，你已经捕捉到了。你的雷达让你聪明，也让你很难完全放松。" },
      { title: "心动时的你", body: "你会在语气、称呼和回应速度里寻找特别之处。越在乎的人，越容易被你放进放大镜里观察。" },
      { title: "暧昧期的你", body: "暧昧对你既有吸引力又有消耗感。你享受心照不宣，也会在每一次停顿里追问它到底意味着什么。" },
      { title: "恋爱后的你", body: "你会持续关注关系的温度，及时发现不对劲的地方。稳定而坦诚的回应，能让你的雷达从警报模式回到陪伴模式。" },
      { title: "吵架时的你", body: "你会把每句话拆开分析，试图找到真正的问题。请记住，很多关系问题需要对话解决，不是靠一个人推理完成。" },
      { title: "你的隐藏需求", body: "你需要清晰、连续、可验证的信号。你不是要对方随时报备，而是想知道自己不用靠猜来获得安心。" },
      { title: "你的恋爱雷区", body: "忽冷忽热、话说一半和用沉默吊着你，会让你的想象力变成压力。你容易把‘可能’当成需要马上解决的问题。" },
      { title: "别人为什么会喜欢你", body: "你很会读空气，也很会发现别人没说出口的情绪。和你相处的人往往会觉得自己被认真观察、认真记住。" },
      { title: "最适合你的恋爱人格", body: "愿意把话说完整、行动有连续性、不会故意制造悬念的人，能让你的敏锐成为亲密感。" },
      { title: "容易让你受伤的人格", body: "享受被关注却不愿意给答案的人，会让你一直在关系门口找线索，却进不去也走不远。" },
      { title: "Love Radar 给你的恋爱建议", body: "在脑内剧情写到第三集之前，先向对方问一个简单的问题。事实通常比猜测更省力，也更靠近真相。" },
    ],
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
  const candidates = type === "romantic-doer" || gender === "private"
    ? [...meta.male, ...meta.female]
    : gender === "female"
      ? meta.female
      : meta.male;
  const list = candidates.length ? candidates : meta.male;
  return list[Math.floor(Math.random() * list.length)];
}
