"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BrainCircuit, Check, LockKeyhole, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateEnglishPersonality,
  englishPersonalityMeta,
  englishPersonalityQuestions,
  pickEnglishRepresentative,
  type EnglishPersonalityGender,
} from "@/lib/personality-en";

type Stage = "gender" | "quiz" | "result";

export function EnglishPersonalityQuiz() {
  const [stage, setStage] = useState<Stage>("gender");
  const [gender, setGender] = useState<EnglishPersonalityGender | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [representative, setRepresentative] = useState("");

  const result = useMemo(
    () => (answers.length === englishPersonalityQuestions.length ? calculateEnglishPersonality(answers) : null),
    [answers],
  );
  const meta = result ? englishPersonalityMeta[result.type] : null;

  function chooseGender(value: EnglishPersonalityGender) {
    setGender(value);
    setStage("quiz");
  }

  function chooseAnswer(label: string) {
    const nextAnswers = [...answers];
    nextAnswers[current] = label;
    setAnswers(nextAnswers);
    if (current === englishPersonalityQuestions.length - 1) {
      const nextResult = calculateEnglishPersonality(nextAnswers);
      setRepresentative(pickEnglishRepresentative(nextResult.type, gender || "private"));
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
    <main className="relative min-h-svh overflow-hidden px-4 py-5 text-white sm:px-6">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="relative mx-auto flex min-h-[calc(100svh-2.5rem)] w-full max-w-xl flex-col">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/en" prefetch={false} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Love Radar AI
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
              <BrainCircuit className="h-4 w-4" />
            </span>
            Love Type Quiz
          </div>
        </header>

        {stage === "gender" ? <GenderStep onChoose={chooseGender} /> : null}
        {stage === "quiz" ? (
          <QuestionStep
            current={current}
            answers={answers}
            onChoose={chooseAnswer}
            onBack={() => setCurrent((value) => Math.max(0, value - 1))}
          />
        ) : null}
        {stage === "result" && result && meta ? (
          <ResultStep meta={meta} representative={representative} scores={result.scores} onRestart={restart} />
        ) : null}
      </div>
    </main>
  );
}

function GenderStep({ onChoose }: { onChoose: (gender: EnglishPersonalityGender) => void }) {
  return (
    <Card className="mt-8 border-primary/25 bg-card/90">
      <CardHeader className="space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-2xl">♡</div>
        <CardTitle className="text-2xl">First, choose how you want your result framed.</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          This only changes the representative character shown on your result. It does not affect your score and is not saved.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {[
          ["male", "Male character"],
          ["female", "Female character"],
          ["private", "Surprise me"],
        ].map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant="secondary"
            className="h-14 justify-between text-base"
            onClick={() => onChoose(value as EnglishPersonalityGender)}
          >
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
  const question = englishPersonalityQuestions[current];
  return (
    <section className="mt-4 flex flex-1 flex-col">
      <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Question {current + 1} / {englishPersonalityQuestions.length}
        </span>
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((current + 1) / englishPersonalityQuestions.length) * 100}%` }} />
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
        Previous question
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
  meta: (typeof englishPersonalityMeta)[keyof typeof englishPersonalityMeta];
  representative: string;
  scores: Record<string, number>;
  onRestart: () => void;
}) {
  const buyUrl = process.env.NEXT_PUBLIC_MBD_BUY_URL;
  const [message, setMessage] = useState("");

  function interest() {
    setMessage("Premium depth analysis is coming soon. For now, use this result as your shareable snapshot.");
  }

  return (
    <section className="space-y-4">
      <div className="text-center">
        <p className="text-sm text-primary">Your Love Type</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight">{meta.name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">Representative character: {representative}</p>
      </div>
      <Card className="border-primary/35 bg-primary/10">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            {meta.keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs text-primary">
                {keyword}
              </span>
            ))}
          </div>
          <p className="text-base leading-8 text-foreground">{meta.summary}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-accent/25 bg-accent/10 p-3">
              <p className="text-xs text-accent">Your strength</p>
              <p className="mt-2 text-sm leading-6">{meta.strength}</p>
            </div>
            <div className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">A gentle warning</p>
              <p className="mt-2 text-sm leading-6">{meta.caution}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Your hidden pattern
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-7 text-muted-foreground">
            This is not a fixed label. It is the emotional mode you are most likely to enter when you care about someone.
          </p>
          <div className="space-y-2">
            {Object.entries(scores)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([key, value]) => (
                <div key={key} className="flex items-center gap-3 text-xs">
                  <span className="w-32 shrink-0 text-muted-foreground">{englishPersonalityMeta[key as keyof typeof englishPersonalityMeta].name}</span>
                  <div className="h-2 flex-1 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, value * 8)}%` }} />
                  </div>
                  <span className="w-6 text-right font-mono text-primary">{value}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
      <Card className="border-accent/30 bg-accent/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-accent" />
            Want the deeper read?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            Premium can expand this into emotional triggers, best match dynamics, risky patterns, texting style, and smart replies.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {buyUrl ? (
              <a href={buyUrl} target="_blank" rel="noreferrer">
                <Button className="w-full">Unlock code</Button>
              </a>
            ) : null}
            <Button type="button" variant="secondary" className="w-full" onClick={interest}>
              Premium coming soon
            </Button>
          </div>
          {message ? <p className="text-xs leading-5 text-muted-foreground">{message}</p> : null}
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/en/analyze" prefetch={false}>
          <Button className="w-full">
            <Check className="h-4 w-4" />
            Analyze a real chat
          </Button>
        </Link>
        <Button type="button" variant="secondary" onClick={onRestart} className="w-full">
          <RotateCcw className="h-4 w-4" />
          Retake quiz
        </Button>
      </div>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        For entertainment and self-reflection only. Not psychological advice.
      </p>
    </section>
  );
}
