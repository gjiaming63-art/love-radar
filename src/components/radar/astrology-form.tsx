"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2, Sparkles, Stars } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AstrologyProfileInput, AstrologyReport } from "@/types/astrology";

type FormProfile = AstrologyProfileInput & {
  birthCityText: string;
};

function defaultProfile(name: string): FormProfile {
  return {
    name,
    birthDate: "",
    birthTime: "",
    birthCityId: undefined,
    birthCityText: "北京",
    timeKnown: false,
  };
}

export function AstrologyForm() {
  const router = useRouter();
  const [profileA, setProfileA] = useState<FormProfile>(defaultProfile("我"));
  const [profileB, setProfileB] = useState<FormProfile>(defaultProfile("TA"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/astrology/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileA: stripProfile(profileA),
          profileB: stripProfile(profileB),
        }),
      });
      const payload = (await response.json()) as { report?: AstrologyReport & { id: string }; error?: string };
      if (!response.ok || !payload.report?.id) throw new Error(payload.error || "生成失败，请稍后重试。");
      router.push(`/astrology/report/${payload.report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  function swapProfiles() {
    setProfileA(profileB);
    setProfileB(profileA);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-primary/30 bg-primary/10 p-4">
        <div className="flex items-start gap-3">
          <Stars className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold text-foreground">出生时间不知道也可以测</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              系统会自动降级，不计算上升、下降和宫位。出生资料只用于本次计算，不会保存到数据库。
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <ProfileEditor title="你的出生信息" profile={profileA} onChange={setProfileA} />
        <button
          type="button"
          onClick={swapProfiles}
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:border-primary/50 hover:text-primary lg:mt-32"
          aria-label="交换两个人"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <ProfileEditor title="对方出生信息" profile={profileB} onChange={setProfileB} />
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="border-primary/25 bg-primary/10 text-primary">确定性合盘</Badge>
          <Badge className="border-accent/25 bg-accent/10 text-accent">AI 深度解释</Badge>
          <Badge>娱乐参考</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          首版会计算太阳、月亮、水星、金星、火星之间的关系信号。报告不代表命运，只适合用来观察关系里的吸引、沟通和拉扯模式。
        </p>
      </section>

      {error ? (
        <div className="rounded-lg border border-primary/35 bg-primary/10 p-4 text-sm leading-6 text-primary">{error}</div>
      ) : null}

      <Button type="button" size="lg" className="w-full" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "正在绘制你们的关系星图..." : "生成恋爱占星报告"}
      </Button>
    </div>
  );
}

function ProfileEditor({
  title,
  profile,
  onChange,
}: {
  title: string;
  profile: FormProfile;
  onChange: (profile: FormProfile) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">
        <Field label="昵称">
          <input
            value={profile.name}
            onChange={(event) => onChange({ ...profile, name: event.target.value.slice(0, 16) })}
            className="field-input"
            placeholder="比如 小明 / Luna"
          />
        </Field>
        <Field label="出生日期">
          <input
            type="date"
            value={profile.birthDate}
            onChange={(event) => onChange({ ...profile, birthDate: event.target.value })}
            className="field-input"
          />
        </Field>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={profile.timeKnown}
              onChange={(event) => onChange({ ...profile, timeKnown: event.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            我知道出生时间
          </label>
          {profile.timeKnown ? (
            <input
              type="time"
              value={profile.birthTime}
              onChange={(event) => onChange({ ...profile, birthTime: event.target.value })}
              className="field-input mt-3"
            />
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">不知道时间也能继续，系统会自动降级。</p>
          )}
        </div>
        <Field label="出生城市">
          <input
            value={profile.birthCityText}
            onChange={(event) => onChange({ ...profile, birthCityText: event.target.value, birthCityId: undefined })}
            className="field-input"
            placeholder="输入出生城市，如 北京 / Paris, France"
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            支持直接输入城市名。若城市重名，建议补充国家或省州，比如 Paris, France。
          </p>
        </Field>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function stripProfile(profile: FormProfile): AstrologyProfileInput {
  return {
    name: profile.name,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    birthCityId: profile.birthCityId,
    birthCityText: profile.birthCityText,
    timeKnown: profile.timeKnown,
  };
}
