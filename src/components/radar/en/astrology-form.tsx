"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, Loader2, Sparkles, Stars } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    birthCityText: "",
    timeKnown: false,
  };
}

export function EnglishAstrologyForm() {
  const router = useRouter();
  const [profileA, setProfileA] = useState<FormProfile>(defaultProfile("Person A"));
  const [profileB, setProfileB] = useState<FormProfile>(defaultProfile("Person B"));
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
          locale: "en-US",
          profileA: stripProfile(profileA),
          profileB: stripProfile(profileB),
        }),
      });
      const payload = (await response.json()) as { report?: AstrologyReport & { id: string }; error?: string };
      if (!response.ok || !payload.report?.id) {
        throw new Error(payload.error || "Could not create the astrology report. Please try again.");
      }
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventName: "english_report_generated", reportId: payload.report.id, locale: "en-US" }),
      });
      router.push(`/en/astrology/report/${payload.report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the astrology report. Please try again.");
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
            <p className="font-semibold text-foreground">Birth time is optional</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Don&apos;t know the birth time? You can still continue. Rising signs and houses will be skipped.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <ProfileEditor title="Person A" profile={profileA} onChange={setProfileA} />
        <button
          type="button"
          onClick={swapProfiles}
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted-foreground transition hover:border-primary/50 hover:text-primary lg:mt-32"
          aria-label="Swap people"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <ProfileEditor title="Person B" profile={profileB} onChange={setProfileB} />
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="border-primary/25 bg-primary/10 text-primary">Synastry</Badge>
          <Badge className="border-accent/25 bg-accent/10 text-accent">AI interpretation</Badge>
          <Badge>For reflection</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Love Radar looks at Sun, Moon, Mercury, Venus, and Mars patterns to reflect chemistry, emotional needs,
          communication style, and relationship timing.
        </p>
      </section>

      {error ? (
        <div className="rounded-lg border border-primary/35 bg-primary/10 p-4 text-sm leading-6 text-primary">{error}</div>
      ) : null}

      <Button type="button" size="lg" className="w-full" onClick={submit} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Reading your relationship chart..." : "Generate Love Astrology Report"}
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
        <Field label="Name or nickname">
          <input
            value={profile.name}
            onChange={(event) => onChange({ ...profile, name: event.target.value.slice(0, 16) })}
            className="field-input"
            placeholder="e.g. Alex / Luna"
          />
        </Field>
        <Field label="Birth date">
          <BirthDateSelect value={profile.birthDate} onChange={(birthDate) => onChange({ ...profile, birthDate })} />
        </Field>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={profile.timeKnown}
              onChange={(event) => onChange({ ...profile, timeKnown: event.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            I know the birth time
          </label>
          {profile.timeKnown ? (
            <input
              type="time"
              value={profile.birthTime}
              onChange={(event) => onChange({ ...profile, birthTime: event.target.value })}
              className="field-input mt-3"
            />
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">You can continue without it. The report will be simplified.</p>
          )}
        </div>
        <Field label="Birth city">
          <input
            value={profile.birthCityText}
            onChange={(event) => onChange({ ...profile, birthCityText: event.target.value, birthCityId: undefined })}
            className="field-input"
            placeholder="Enter a city, e.g. New York / London / Paris / Beijing"
          />
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            If the city name is common, add a country or state, like Paris, France or Springfield, Illinois.
          </p>
        </Field>
      </div>
    </section>
  );
}

function BirthDateSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const parsedValue = parseBirthDate(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (parsedValue) return new Date(parsedValue.year, parsedValue.month - 1, 1);
    const date = new Date();
    date.setFullYear(date.getFullYear() - 24, 0, 1);
    return date;
  });

  const displayValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.replaceAll("-", " / ") : "YYYY / MM / DD";
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const years = Array.from({ length: 91 }, (_, index) => new Date().getFullYear() - index);
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const dayCount = new Date(viewYear, viewMonth + 1, 0).getDate();

  function changeMonth(offset: number) {
    setViewDate(new Date(viewYear, viewMonth + offset, 1));
  }

  function selectDay(day: number) {
    onChange(`${viewYear}-${padDatePart(viewMonth + 1)}-${padDatePart(day)}`);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="field-input flex items-center justify-between pr-4 text-left"
        aria-label="Birth date"
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>{displayValue}</span>
        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-lg border border-primary/25 bg-[#080912] p-3 shadow-2xl shadow-primary/15">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-muted-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <select
              value={viewMonth}
              onChange={(event) => setViewDate(new Date(viewYear, Number(event.target.value), 1))}
              className="field-input h-9 min-h-0 flex-1 py-0 text-sm"
              aria-label="Month"
            >
              {monthNames.map((month, index) => (
                <option key={month} value={index}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={viewYear}
              onChange={(event) => setViewDate(new Date(Number(event.target.value), viewMonth, 1))}
              className="field-input h-9 min-h-0 w-24 py-0 text-sm"
              aria-label="Year"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-muted-foreground"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
            {weekdayNames.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => {
              const selected =
                parsedValue?.year === viewYear && parsedValue.month === viewMonth + 1 && parsedValue.day === day;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`flex aspect-square items-center justify-center rounded-md text-sm transition ${
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/[0.04] text-foreground hover:bg-primary/20 hover:text-primary"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </div>
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
