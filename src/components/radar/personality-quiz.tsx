"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BrainCircuit, Check, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculatePersonality,
  personalityMeta,
  personalityQuestions,
  pickRepresentative,
  type PersonalityGender,
} from "@/lib/personality";

type Stage = "gender" | "quiz" | "result";

export function PersonalityQuiz() {
  const [stage, setStage] = useState<Stage>("gender");
  const [gender, setGender] = useState<PersonalityGender | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [representative, setRepresentative] = useState("");

  const result = useMemo(() => (answers.length === personalityQuestions.length ? calculatePersonality(answers) : null), [answers]);
  const meta = result ? personalityMeta[result.type] : null;

  function chooseGender(value: PersonalityGender) {
    setGender(value);
    setStage("quiz");
  }

  function chooseAnswer(label: string) {
    const nextAnswers = [...answers];
    nextAnswers[current] = label;
    setAnswers(nextAnswers);
    if (current === personalityQuestions.length - 1) {
      const nextResult = calculatePersonality(nextAnswers);
      setRepresentative(pickRepresentative(nextResult.type, gender || "private"));
      setStage("result");
      return;
    }
    setCurrent((value) => value + 1);
  }

  function restart() {
    setStage("gender");
    setGender(null);
    setCurrent(0);
    setAnswers([]);
    setRepresentative("");
  }

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5 sm:px-6">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="relative mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-xl flex-col">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
              <BrainCircuit className="h-4 w-4" />
            </span>
            恋爱人格
          </div>
        </header>

        {stage === "gender" ? <GenderStep onChoose={chooseGender} /> : null}
        {stage === "quiz" ? (
          <QuestionStep current={current} answers={answers} onChoose={chooseAnswer} onBack={() => setCurrent((value) => Math.max(0, value - 1))} />
        ) : null}
        {stage === "result" && result && meta ? (
          <ResultStep meta={meta} representative={representative} scores={result.scores} onRestart={restart} />
        ) : null}
      </div>
    </main>
  );
}

function GenderStep({ onChoose }: { onChoose: (gender: PersonalityGender) => void }) {
  return (
    <Card className="mt-8 border-primary/25 bg-card/90">
      <CardHeader className="space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-2xl">♡</div>
        <CardTitle className="text-2xl">先选一下你的性别</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">只用于匹配结果页的代表角色，不影响人格评分，也不会保存。</p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {[
          ["male", "男"],
          ["female", "女"],
          ["private", "不透露"],
        ].map(([value, label]) => (
          <Button key={value} type="button" variant="secondary" className="h-14 justify-between text-base" onClick={() => onChoose(value as PersonalityGender)}>
            {label}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function QuestionStep({
  current,
  answers,
  onChoose,
  onBack,
}: {
  current: number;
  answers: string[];
  onChoose: (label: string) => void;
  onBack: () => void;
}) {
  const question = personalityQuestions[current];
  return (
    <section className="mt-4 flex flex-1 flex-col">
      <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
        <span>第 {current + 1} / {personalityQuestions.length} 题</span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((current + 1) / personalityQuestions.length) * 100}%` }} />
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
                onClick={() => onChoose(option.label)}
                className={`min-h-16 rounded-md border p-4 text-left transition ${selected ? "border-primary bg-primary/15" : "border-border bg-background/45 hover:border-primary/60 hover:bg-primary/10"}`}
              >
                <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-primary/35 text-sm font-semibold text-primary">{option.label}</span>
                <span className="text-sm leading-6 text-foreground">{option.text}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>
      <button type="button" onClick={onBack} disabled={current === 0} className="mt-4 inline-flex items-center gap-2 self-start text-xs text-muted-foreground disabled:opacity-30">
        <ArrowLeft className="h-3.5 w-3.5" />
        上一题
      </button>
    </section>
  );
}

function ResultStep({
  meta,
  representative,
  scores,
  onRestart,
}: {
  meta: (typeof personalityMeta)[keyof typeof personalityMeta];
  representative: string;
  scores: Record<string, number>;
  onRestart: () => void;
}) {
  const buyUrl = process.env.NEXT_PUBLIC_MBD_BUY_URL;
  return (
    <section className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-primary">你的恋爱人格结果</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight">{meta.name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">代表角色：{representative}</p>
      </div>
      <Card className="border-primary/35 bg-primary/10">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">{meta.keywords.map((keyword) => <span key={keyword} className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary">{keyword}</span>)}</div>
          <p className="text-base leading-8 text-foreground">{meta.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-accent/25 bg-accent/10 p-3"><p className="text-xs text-accent">你的优势</p><p className="mt-2 text-sm leading-6">{meta.strength}</p></div>
            <div className="rounded-md border border-border bg-background/40 p-3"><p className="text-xs text-muted-foreground">提醒一下</p><p className="mt-2 text-sm leading-6">{meta.caution}</p></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />你的隐藏模式</CardTitle></CardHeader>
        <CardContent className="space-y-3"><p className="text-sm leading-7 text-muted-foreground">这不是固定标签，而是你在亲密关系中更容易启动的一套反应方式。</p><div className="space-y-2">{Object.entries(scores).sort(([, a], [, b]) => b - a).slice(0, 3).map(([key, value]) => <div key={key} className="flex items-center gap-3 text-xs"><span className="w-28 shrink-0 text-muted-foreground">{personalityMeta[key as keyof typeof personalityMeta].name.slice(2, 10)}</span><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value * 8)}%` }} /></div><span className="w-6 text-right font-mono text-primary">{value}</span></div>)}</div></CardContent>
      </Card>
      <Card className="border-accent/30 bg-accent/10">
        <CardHeader><CardTitle>想知道更深一层？</CardTitle></CardHeader>
        <CardContent className="space-y-3"><p className="text-sm leading-6 text-muted-foreground">高级版可以查看你的情感触发点、相处盲区、适配沟通方式和专属行动建议。</p>{buyUrl ? <a href={buyUrl} target="_blank" rel="noreferrer"><Button className="w-full">￥6.9 解锁深度人格分析 <ArrowRight className="h-4 w-4" /></Button></a> : <p className="text-xs text-muted-foreground">高级版入口即将开放。</p>}</CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2"><Link href="/analyze"><Button className="w-full"><Check className="h-4 w-4" />用聊天记录验证一下</Button></Link><Button type="button" variant="secondary" onClick={onRestart} className="w-full"><RotateCcw className="h-4 w-4" />重新测试</Button></div>
      <p className="text-center text-xs leading-5 text-muted-foreground">本测试仅供娱乐和自我了解，不构成心理诊断或关系结论。</p>
    </section>
  );
}
