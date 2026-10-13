"use client";

import { ArrowLeft, ArrowRight, BrainCircuit, Check, CircleDashed, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PersonalityShareCard } from "@/components/radar/personality-share-card";
import {
  calculatePersonality,
  personalityMeta,
  personalityQuestions,
  pickRepresentative,
  type PersonalityGender,
  type PersonalityMeta,
} from "@/lib/personality";

type Stage = "gender" | "quiz" | "generating" | "result";
type PersonalityEventName =
  | "personality_page_view"
  | "personality_test_start"
  | "personality_test_complete"
  | "personality_result_view"
  | "personality_card_generate"
  | "personality_card_save";

const generationLines = [
  "正在读取你的恋爱信号……",
  "正在分析你的亲密关系模式……",
  "正在生成你的恋爱人格……",
];

function trackPersonalityEvent(eventName: PersonalityEventName) {
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, locale: "zh-CN", source: "personality" }),
    keepalive: true,
  }).catch(() => undefined);
}

export function PersonalityQuiz() {
  const [stage, setStage] = useState<Stage>("gender");
  const [gender, setGender] = useState<PersonalityGender | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [representative, setRepresentative] = useState("");
  const [choicePending, setChoicePending] = useState(false);
  const [generationLine, setGenerationLine] = useState(0);
  const startedRef = useRef(false);
  const resultViewTrackedRef = useRef(false);

  const result = useMemo(() => (answers.length === personalityQuestions.length ? calculatePersonality(answers) : null), [answers]);
  const meta = result ? personalityMeta[result.type] : null;

  useEffect(() => {
    trackPersonalityEvent("personality_page_view");
  }, []);

  useEffect(() => {
    if (stage !== "generating" || !result) return;
    const lineTimer = window.setInterval(() => setGenerationLine((value) => Math.min(value + 1, generationLines.length - 1)), 620);
    const resultTimer = window.setTimeout(() => setStage("result"), 1900);
    return () => {
      window.clearInterval(lineTimer);
      window.clearTimeout(resultTimer);
    };
  }, [stage, result]);

  useEffect(() => {
    if (stage === "result" && result && !resultViewTrackedRef.current) {
      resultViewTrackedRef.current = true;
      trackPersonalityEvent("personality_result_view");
    }
  }, [stage, result]);

  function chooseGender(value: PersonalityGender) {
    setGender(value);
    setStage("quiz");
    if (!startedRef.current) {
      startedRef.current = true;
      trackPersonalityEvent("personality_test_start");
    }
  }

  function chooseAnswer(label: string) {
    if (choicePending) return;
    const nextAnswers = [...answers];
    nextAnswers[current] = label;
    setAnswers(nextAnswers);
    setChoicePending(true);

    window.setTimeout(() => {
      if (current === personalityQuestions.length - 1) {
        const nextResult = calculatePersonality(nextAnswers);
        setRepresentative(pickRepresentative(nextResult.type, gender || "private"));
        setGenerationLine(0);
        setStage("generating");
        trackPersonalityEvent("personality_test_complete");
      } else {
        setCurrent((value) => value + 1);
        setChoicePending(false);
      }
    }, 170);
  }

  function restart() {
    setStage("gender");
    setGender(null);
    setCurrent(0);
    setAnswers([]);
    setRepresentative("");
    setChoicePending(false);
    setGenerationLine(0);
    startedRef.current = false;
    resultViewTrackedRef.current = false;
  }

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5 sm:px-6">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-primary/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-2xl flex-col">
        <header className="mb-8 flex items-center justify-between gap-3">
          <div className="min-w-0 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_rgb(244_63_94)]" />
            Love Radar · 独立恋爱人格测试
          </div>
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
              <BrainCircuit className="h-4 w-4" />
            </span>
            恋爱人格
          </div>
        </header>

        {stage === "gender" ? <GenderStep onChoose={chooseGender} /> : null}
        {stage === "quiz" ? (
          <QuestionStep
            current={current}
            answers={answers}
            choicePending={choicePending}
            onChoose={chooseAnswer}
            onBack={() => setCurrent((value) => Math.max(0, value - 1))}
          />
        ) : null}
        {stage === "generating" ? <GeneratingStep line={generationLines[generationLine]} /> : null}
        {stage === "result" && result && meta ? (
          <ResultStep meta={meta} representative={representative} scores={result.scores} onRestart={restart} />
        ) : null}
      </div>
    </main>
  );
}

function GenderStep({ onChoose }: { onChoose: (gender: PersonalityGender) => void }) {
  const [selectedGender, setSelectedGender] = useState<PersonalityGender | null>(null);
  const options: Array<[PersonalityGender, string]> = [
    ["male", "男"],
    ["female", "女"],
    ["private", "不透露"],
  ];

  return (
    <section className="flex flex-1 flex-col justify-center pb-8 pt-2 sm:pt-8">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary/80">
          <Sparkles className="h-3.5 w-3.5" />
          Love Radar / Personality Signal
        </div>
        <div>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">测测你的恋爱人格</h1>
          <p className="mt-4 text-xl text-primary">你天生是哪一种恋人？</p>
          <p className="mt-5 max-w-xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
            从心动、暧昧到真正进入一段关系，<br className="hidden sm:block" />
            你的每一次选择，都藏着独特的恋爱模式。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <InfoPill>10 道题 · 约 3 分钟</InfoPill>
          <InfoPill>恋爱人格分析</InfoPill>
          <InfoPill>专属结果报告</InfoPill>
        </div>
      </div>

      <Card className="mt-8 border-primary/25 bg-card/90 shadow-[0_0_45px_rgb(244_63_94_/_0.08)]">
        <CardHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-2xl">♡</div>
          <CardTitle className="text-2xl">先选一下你的性别</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">性别仅用于匹配结果中的代表形象，不影响测试评分，也不会保存。</p>
        </CardHeader>
        <CardContent className="grid gap-3">
          {options.map(([value, label]) => {
            const selected = selectedGender === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedGender(value)}
                className={`flex min-h-14 items-center justify-between rounded-md border px-4 text-left text-base transition ${selected ? "border-primary bg-primary/15 text-foreground" : "border-border bg-secondary text-secondary-foreground hover:border-primary/60 hover:bg-primary/10"}`}
              >
                <span>{label}</span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-white/20"}`}>
                  {selected ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            );
          })}
          <Button type="button" size="lg" className="mt-2 w-full" disabled={!selectedGender} onClick={() => selectedGender && onChoose(selectedGender)}>
            开始探索我的恋爱人格
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

function InfoPill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground">{children}</span>;
}

function QuestionStep({
  current,
  answers,
  choicePending,
  onChoose,
  onBack,
}: {
  current: number;
  answers: string[];
  choicePending: boolean;
  onChoose: (label: string) => void;
  onBack: () => void;
}) {
  const question = personalityQuestions[current];
  const progress = ((current + 1) / personalityQuestions.length) * 100;
  const phaseMessage = current === 2 ? "开始看见你的心动方式了……" : current === 4 ? "你的恋爱模式正在逐渐清晰" : current === 7 ? "快要找到你的恋爱人格了" : "";

  return (
    <section className="mt-2 flex flex-1 flex-col pb-8 sm:mt-4">
      <div className="mb-4 flex items-end justify-between gap-4 text-xs text-muted-foreground">
        <div>
          <span>第 {current + 1} / {personalityQuestions.length} 题</span>
          {phaseMessage ? <p className="mt-2 text-primary/80">{phaseMessage}</p> : null}
        </div>
        <div className="w-32 shrink-0">
          <div className="mb-2 text-right text-[10px] tracking-[0.12em] text-muted-foreground">{Math.round(progress)}%</div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`已完成 ${Math.round(progress)}%`}>
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <Card className="flex flex-1 flex-col border-primary/20 bg-card/90">
        <CardHeader>
          <CardTitle className="text-xl leading-8 sm:text-2xl">{question.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {question.options.map((option) => {
            const selected = answers[current] === option.label;
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={selected}
                disabled={choicePending}
                onClick={() => onChoose(option.label)}
                className={`min-h-16 rounded-md border p-4 text-left transition duration-200 ${selected ? "border-primary bg-primary/15 shadow-[0_0_22px_rgb(244_63_94_/_0.12)]" : "border-border bg-background/45 hover:border-primary/60 hover:bg-primary/10"} disabled:cursor-wait`}
              >
                <span className={`mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold ${selected ? "border-primary bg-primary text-primary-foreground" : "border-primary/35 text-primary"}`}>{option.label}</span>
                <span className="text-sm leading-6 text-foreground">{option.text}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>
      <button type="button" onClick={onBack} disabled={current === 0 || choicePending} className="mt-4 inline-flex items-center gap-2 self-start text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-30">
        <ArrowLeft className="h-3.5 w-3.5" />
        上一题
      </button>
    </section>
  );
}

function GeneratingStep({ line }: { line: string }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
      <div className="personality-signal-orbit relative flex h-28 w-28 items-center justify-center rounded-full border border-primary/35 bg-primary/10 shadow-[0_0_45px_rgb(244_63_94_/_0.16)]">
        <CircleDashed className="h-12 w-12 animate-spin text-primary" strokeWidth={1.2} />
        <Sparkles className="absolute h-5 w-5 text-accent" />
      </div>
      <p className="mt-8 text-lg font-medium" aria-live="polite">{line}</p>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">把刚才的选择，整理成一份只属于你的恋爱人格报告。</p>
      <div className="mt-7 flex gap-1.5" aria-hidden="true">
        {generationLines.map((item, index) => <span key={item} className={`h-1.5 w-1.5 rounded-full ${index <= generationLines.indexOf(line) ? "bg-primary" : "bg-muted"}`} />)}
      </div>
    </section>
  );
}

function ResultStep({
  meta,
  representative,
  scores,
  onRestart,
}: {
  meta: PersonalityMeta;
  representative: string;
  scores: Record<string, number>;
  onRestart: () => void;
}) {
  return (
    <section className="space-y-5 pb-8">
      <div className="text-center">
        <p className="text-sm text-primary">你的恋爱人格</p>
        <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-3xl shadow-[0_0_30px_rgb(244_63_94_/_0.15)]">{meta.symbol}</div>
        <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">{meta.displayName}</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">{meta.englishName}</p>
        <p className="mt-3 text-sm text-muted-foreground">代表形象：{representative}</p>
      </div>

      <Card className="border-primary/35 bg-primary/10 shadow-[0_0_42px_rgb(244_63_94_/_0.1)]">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {meta.keywords.map((keyword) => <span key={keyword} className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary">{keyword}</span>)}
          </div>
          <p className="text-xl font-medium leading-9 text-foreground sm:text-2xl">{meta.coreLine}</p>
          <p className="text-sm leading-7 text-muted-foreground">{meta.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-accent/25 bg-accent/10 p-3"><p className="text-xs text-accent">你的优势</p><p className="mt-2 text-sm leading-6">{meta.strength}</p></div>
            <div className="rounded-md border border-border bg-background/40 p-3"><p className="text-xs text-muted-foreground">提醒一下</p><p className="mt-2 text-sm leading-6">{meta.caution}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />你的隐藏模式</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-7 text-muted-foreground">这不是固定标签，而是你在亲密关系中更容易启动的一套反应方式。</p>
          <div className="space-y-3">
            {Object.entries(scores).sort(([, a], [, b]) => b - a).slice(0, 3).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 text-xs">
                <span className="w-28 shrink-0 text-muted-foreground">{personalityMeta[key as keyof typeof personalityMeta].displayName}</span>
                <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, value * 8)}%` }} /></div>
                <span className="w-6 text-right font-mono text-primary">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Your relationship map</p>
            <h2 className="mt-2 text-xl font-semibold">你的恋爱人格报告</h2>
          </div>
          <span className="text-xs text-muted-foreground">11 个观察角度</span>
        </div>
        {meta.sections.map((section, index) => (
          <Card key={section.title} className="border-white/8 bg-card/65">
            <CardContent className="p-4 sm:p-5">
              <div className="flex gap-4">
                <span className="shrink-0 pt-0.5 font-mono text-xs text-primary/70">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-medium">{section.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{section.body}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PersonalityShareCard
        name={meta.displayName}
        englishName={meta.englishName}
        symbol={meta.symbol}
        representative={representative}
        keywords={meta.keywords}
        coreLine={meta.coreLine}
        onGenerate={() => trackPersonalityEvent("personality_card_generate")}
        onSave={() => trackPersonalityEvent("personality_card_save")}
      />
      <p className="text-center text-xs text-accent">完整人格报告已免费开放，无需购买或兑换。</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="secondary" onClick={onRestart} className="w-full"><RotateCcw className="h-4 w-4" />重新测试</Button>
        <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-background/30 px-3 py-2 text-center text-xs leading-5 text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0 text-accent" />结果仅保存在当前页面，不保存聊天原文</div>
      </div>
      <p className="text-center text-xs leading-5 text-muted-foreground">本测试仅供娱乐和自我了解，不构成心理诊断或关系结论。</p>
    </section>
  );
}
