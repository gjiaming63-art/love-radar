"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Orbit, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AstrologyProfileInput } from "@/types/astrology";
import type { LoveReport } from "@/types/report";

type FormProfile = AstrologyProfileInput & {
  birthDate: string;
};

const defaultA: FormProfile = {
  name: "我",
  birthDate: "",
  birthTime: "",
  birthCityText: "北京",
  timeKnown: false,
};

const defaultB: FormProfile = {
  name: "对方",
  birthDate: "",
  birthTime: "",
  birthCityText: "上海",
  timeKnown: false,
};

export function ChatAstrologyLayerForm({ reportId, report }: { reportId: string; report: LoveReport }) {
  const router = useRouter();
  const [profileA, setProfileA] = useState<FormProfile>(defaultA);
  const [profileB, setProfileB] = useState<FormProfile>(defaultB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/reports/${reportId}/astrology-layer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileA: stripProfile(profileA),
          profileB: stripProfile(profileB),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "生成失败，请稍后重试。");
      router.push(`/report/${reportId}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-50" />
      <AstrologyBackdrop />
      <div className="relative mx-auto w-full max-w-5xl">
        <Link href={`/report/${reportId}`} prefetch={false} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          返回聊天报告
        </Link>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-5">
            <Card className="border-primary/30 bg-primary/10">
              <CardContent className="relative overflow-hidden p-5">
                <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <Badge className="border-primary/25 bg-primary/10 text-primary">星盘辅助解读</Badge>
                    <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-normal">用星盘解释真实聊天里的关系模式</h1>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      聊天记录仍是主判断依据。这里会把双方出生信息计算成关系星盘，再和当前报告里的现实证据交叉验证。
                    </p>
                  </div>
                  <MiniAstroChart />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-accent" />
                  现实证据优先
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                <p>本功能不会因为某个相位直接判断 TA 喜不喜欢你，也不会做“注定在一起/注定分开”的结论。</p>
                <p className="rounded-md border border-border bg-background/45 p-3">当前聊天报告：{report.summary}</p>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <ProfileCard title="你的信息" profile={profileA} onChange={setProfileA} />
              <ProfileCard title="对方的信息" profile={profileB} onChange={setProfileB} />
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/35 bg-destructive/10 p-4 text-sm leading-6 text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="button" size="lg" className="w-full" onClick={submit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Orbit className="h-4 w-4" />}
              {loading ? "正在交叉验证聊天证据和关系星盘..." : "生成星盘辅助解读"}
            </Button>
          </section>
        </div>
      </div>
    </main>
  );
}

function AstrologyBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-16 h-[520px] w-[520px] -translate-x-1/2 rounded-full border border-accent/10" />
      <div className="absolute left-1/2 top-28 h-[360px] w-[360px] -translate-x-1/2 rounded-full border border-primary/10" />
      <div className="absolute left-[18%] top-28 h-1.5 w-1.5 animate-pulse rounded-full bg-accent/70 shadow-[0_0_18px_rgb(45_212_191/0.8)]" />
      <div className="absolute right-[22%] top-20 h-1 w-1 animate-pulse rounded-full bg-primary/80 shadow-[0_0_18px_rgb(244_63_94/0.8)]" />
      <div className="absolute right-[14%] top-72 h-1.5 w-1.5 animate-pulse rounded-full bg-accent/60 shadow-[0_0_16px_rgb(45_212_191/0.7)]" />
      <div className="absolute bottom-24 left-[28%] h-1 w-1 animate-pulse rounded-full bg-primary/70 shadow-[0_0_14px_rgb(244_63_94/0.75)]" />
      <div className="absolute left-1/2 top-16 h-[520px] w-px -translate-x-1/2 rotate-45 bg-gradient-to-b from-transparent via-accent/20 to-transparent" />
      <div className="absolute left-1/2 top-20 h-[480px] w-px -translate-x-1/2 -rotate-45 bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
    </div>
  );
}

function MiniAstroChart() {
  return (
    <div className="relative mx-auto hidden h-40 w-40 shrink-0 sm:block">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.22),rgba(20,184,166,0.08)_42%,transparent_68%)] blur-sm" />
      <div className="absolute inset-3 animate-spin rounded-full border border-primary/35 [animation-duration:18s]" />
      <div className="absolute inset-8 animate-spin rounded-full border border-accent/35 [animation-duration:12s] [animation-direction:reverse]" />
      <div className="absolute inset-14 rounded-full border border-white/15" />
      <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full overflow-visible">
        <line x1="80" y1="12" x2="80" y2="148" stroke="rgb(255 255 255 / 0.12)" />
        <line x1="12" y1="80" x2="148" y2="80" stroke="rgb(255 255 255 / 0.12)" />
        <line x1="32" y1="32" x2="128" y2="128" stroke="rgb(255 255 255 / 0.1)" />
        <line x1="128" y1="32" x2="32" y2="128" stroke="rgb(255 255 255 / 0.1)" />
        <path d="M80 80 L118 44 L132 80 Z" fill="rgb(244 63 94 / 0.18)" stroke="rgb(251 113 133 / 0.65)" />
        <path d="M80 80 L44 112 L28 80 Z" fill="rgb(20 184 166 / 0.16)" stroke="rgb(45 212 191 / 0.65)" />
        {[
          [80, 14, "♀"],
          [128, 36, "☽"],
          [142, 86, "♂"],
          [104, 132, "♄"],
          [48, 126, "☿"],
          [18, 76, "♇"],
        ].map(([x, y, label]) => (
          <g key={label}>
            <circle cx={x} cy={y} r="10" fill="rgb(8 13 28 / 0.92)" stroke="rgb(255 255 255 / 0.18)" />
            <text x={x} y={Number(y) + 4} textAnchor="middle" className="fill-primary text-[14px] font-semibold">
              {label}
            </text>
          </g>
        ))}
        <circle cx="118" cy="44" r="4" className="animate-pulse fill-accent" />
        <circle cx="44" cy="112" r="3" className="animate-pulse fill-primary" />
        <circle cx="80" cy="80" r="5" fill="rgb(255 255 255 / 0.72)" />
      </svg>
    </div>
  );
}

function ProfileCard({
  title,
  profile,
  onChange,
}: {
  title: string;
  profile: FormProfile;
  onChange: (profile: FormProfile) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block text-sm">
          <span className="text-muted-foreground">昵称</span>
          <input
            value={profile.name}
            onChange={(event) => onChange({ ...profile, name: event.target.value })}
            className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">出生日期</span>
          <input
            type="date"
            value={profile.birthDate}
            onChange={(event) => onChange({ ...profile, birthDate: event.target.value })}
            className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">出生城市</span>
          <input
            value={profile.birthCityText || ""}
            onChange={(event) => onChange({ ...profile, birthCityText: event.target.value })}
            placeholder="如 北京 / Paris, France"
            className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary"
          />
        </label>
        <label className="flex items-start gap-3 rounded-md border border-border bg-background/45 p-3 text-sm">
          <input
            type="checkbox"
            checked={profile.timeKnown}
            onChange={(event) => onChange({ ...profile, timeKnown: event.target.checked })}
            className="mt-1 h-4 w-4"
          />
          <span>
            <span className="font-medium">我知道出生时间</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">不知道也可以继续，系统会自动降级。</span>
          </span>
        </label>
        {profile.timeKnown ? (
          <label className="block text-sm">
            <span className="text-muted-foreground">出生时间</span>
            <input
              type="time"
              value={profile.birthTime || ""}
              onChange={(event) => onChange({ ...profile, birthTime: event.target.value })}
              className="mt-2 min-h-11 w-full rounded-md border border-border bg-background px-3 outline-none focus:border-primary"
            />
          </label>
        ) : null}
      </CardContent>
    </Card>
  );
}

function stripProfile(profile: FormProfile): AstrologyProfileInput {
  return {
    name: profile.name,
    birthDate: profile.birthDate,
    birthTime: profile.timeKnown ? profile.birthTime : "",
    birthCityText: profile.birthCityText,
    timeKnown: profile.timeKnown,
  };
}
