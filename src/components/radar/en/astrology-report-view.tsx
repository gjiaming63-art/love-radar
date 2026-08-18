"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bell, LockKeyhole, Orbit, ShieldAlert, Sparkles, Stars } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { englishAstrologyScoreLabels } from "@/lib/astrology/localize";
import type { AstrologyReport } from "@/types/astrology";

export function EnglishAstrologyReportView({ initialReport }: { initialReport: AstrologyReport & { id: string } }) {
  const [notified, setNotified] = useState(false);
  const report = initialReport;
  const hero = buildHero(report);

  useEffect(() => {
    localStorage.setItem("love-radar-last-report-path", `/en/astrology/report/${initialReport.id}`);
  }, [initialReport.id]);

  function trackPremiumInterest() {
    setNotified(true);
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "premium_interest",
        reportId: report.id,
        locale: "en-US",
        source: "english_astrology",
      }),
    });
  }

  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-5 text-white">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-primary/10 blur-3xl" />
      <div className="relative mx-auto w-full max-w-5xl">
        <Link href="/en/astrology" prefetch={false} className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Try another chart
        </Link>

        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <section className="space-y-5">
            <Card className="overflow-hidden border-primary/30 bg-primary/10">
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-primary/30 bg-primary/10 text-primary">Love Astrology</Badge>
                  <Badge>{report.profileAName} × {report.profileBName}</Badge>
                  <Badge className="border-accent/25 bg-accent/10 text-accent">Free report</Badge>
                </div>
                <h1 className="mt-5 text-3xl font-semibold tracking-normal sm:text-4xl">{hero.title}</h1>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{hero.summary}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <HeroSignal label="Strongest signal" value={`${hero.strongest.label} ${hero.strongest.score}`} />
                  <HeroSignal label="Main friction" value={`${hero.blocker.label} ${hero.blocker.score}`} />
                  <HeroSignal label="Best pace" value={hero.nextStep} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {report.coreTags.map((tag) => (
                    <Badge key={tag} className="border-primary/25 bg-primary/10 text-primary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {report.dataQualityNotice ? (
              <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm leading-6 text-muted-foreground">
                {report.dataQualityNotice}
              </div>
            ) : null}

            <ScorePanel report={report} />
            <PlanetPanel report={report} />
            <ShareCard report={report} />
          </section>

          <section className="space-y-5">
            <AspectPanel report={report} />
            <InsightPanel report={report} />
            <PremiumComingSoon notified={notified} onNotify={trackPremiumInterest} />
            <div className="flex gap-2 rounded-md border border-border bg-card p-3 text-xs leading-6 text-muted-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Astrology is a symbolic reflection tool, not a scientific prediction. Use this as entertainment and
              self-reflection, not as a final relationship decision.
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function buildHero(report: AstrologyReport) {
  const strengths = [
    { label: "Chemistry", score: report.scores.chemistry },
    { label: "Emotional bond", score: report.scores.emotional },
    { label: "Communication", score: report.scores.communication },
    { label: "Intimacy", score: report.scores.intimacy },
    { label: "Stability", score: report.scores.stability },
  ].sort((a, b) => b.score - a.score);
  const strongest = strengths[0];
  const weakest = [...strengths].sort((a, b) => a.score - b.score)[0];
  const friction = { label: "Friction", score: report.scores.conflictRisk };
  const blocker = friction.score >= 56 ? friction : weakest;
  const title =
    report.scores.conflictRisk >= 65 && strongest.score >= 60
      ? "Magnetic, but not effortless"
      : report.scores.overall >= 72
        ? "Warm chemistry with real potential"
        : report.scores.overall >= 58
          ? "Promising, but still unfolding"
          : "A connection to observe slowly";
  const nextStep =
    blocker.label === "Friction"
      ? "slow it down"
      : blocker.label === "Stability"
        ? "look for consistency"
        : blocker.label === "Communication"
          ? "talk clearly"
          : "let it unfold";

  return {
    title,
    strongest,
    blocker,
    nextStep,
    summary: report.ai.overallConnection || report.oneLineSummary,
  };
}

function HeroSignal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/45 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5">{value}</p>
    </div>
  );
}

function ScorePanel({ report }: { report: AstrologyReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Orbit className="h-5 w-5 text-primary" />
          Chemistry Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {englishAstrologyScoreLabels.map((item) => (
          <div key={item.key}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono">{report.scores[item.key]}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted">
              <div
                className={item.highMeansRisk ? "h-2.5 rounded-full bg-primary" : "h-2.5 rounded-full bg-accent"}
                style={{ width: `${report.scores[item.key]}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function PlanetPanel({ report }: { report: AstrologyReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Core Planet Placements</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {[report.chartA, report.chartB].map((chart) => (
          <div key={chart.name} className="rounded-md border border-border bg-background/45 p-3">
            <p className="font-medium">{chart.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{chart.calculationNote}</p>
            <div className="mt-3 grid gap-2">
              {chart.positions.map((position) => (
                <div key={position.planet} className="flex justify-between rounded-md bg-black/20 px-3 py-2 text-sm">
                  <span>{position.label}</span>
                  <span className="text-muted-foreground">
                    {position.sign} {position.degree.toFixed(1)}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AspectPanel({ report }: { report: AstrologyReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stars className="h-5 w-5 text-primary" />
          Key Synastry Aspects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {report.aspects.length ? (
          report.aspects.map((aspect) => (
            <div key={aspect.id} className="rounded-md border border-border bg-background/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {aspect.personAPlanetLabel} × {aspect.personBPlanetLabel} · {aspect.typeLabel}
                </p>
                <Badge className="border-primary/25 bg-primary/10 text-primary">Strength {aspect.strength}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{aspect.title}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{aspect.interpretation}</p>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-border bg-background/45 p-3 text-sm leading-6 text-muted-foreground">
            The core planets do not form strong V1 synastry aspects. Treat real-life interaction as the main signal.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InsightPanel({ report }: { report: AstrologyReport }) {
  const sections = [
    ["Emotional Bond", report.ai.emotionalBond],
    ["Communication Pattern", report.ai.communicationPattern],
    ["Romantic Chemistry", report.ai.chemistryAndIntimacy],
    ["Long-term Potential", report.ai.longTermPotential],
    ["Main Challenge", report.ai.biggestChallenge],
    ["Best Way to Connect", report.ai.relationshipAdvice],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Relationship Reading</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-accent/35 bg-[linear-gradient(135deg,rgba(33,215,202,0.18),rgba(255,72,112,0.08))] p-4">
          <p className="text-xs font-semibold text-accent">Core takeaway</p>
          <p className="mt-3 text-base font-semibold leading-8">{report.basicAdvice}</p>
        </div>
        {sections.map(([title, content]) =>
          content ? (
            <div key={title} className="rounded-md border border-border bg-background/55 p-3">
              <p className="text-xs font-semibold text-accent">{title}</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{content}</p>
            </div>
          ) : null,
        )}
      </CardContent>
    </Card>
  );
}

function PremiumComingSoon({ notified, onNotify }: { notified: boolean; onNotify: () => void }) {
  return (
    <Card className="border-primary/30 bg-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyhole className="h-5 w-5 text-primary" />
          Premium analysis coming soon
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-7 text-muted-foreground">
          Premium will unlock deeper behavior patterns, hidden signals, smart replies, and an advanced share card.
        </p>
        <Button type="button" variant="secondary" className="w-full" onClick={onNotify} disabled={notified}>
          <Bell className="h-4 w-4" />
          {notified ? "You are on the list" : "Get notified when premium is available"}
        </Button>
      </CardContent>
    </Card>
  );
}

function ShareCard({ report }: { report: AstrologyReport }) {
  return (
    <Card className="overflow-hidden border-primary/30 bg-primary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Share Card
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-[radial-gradient(circle_at_top_left,rgba(255,72,112,0.22),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full border border-primary/25" />
          <div className="pointer-events-none absolute right-8 top-9 h-2 w-2 rounded-full bg-accent shadow-[0_0_24px_rgba(33,215,202,0.8)]" />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Love Astrology</span>
            <span>{report.profileAName} × {report.profileBName}</span>
          </div>
          <p className="mt-5 text-4xl font-serif leading-none text-primary/80">“</p>
          <p className="mt-1 text-xl font-semibold leading-9 tracking-normal text-foreground sm:text-2xl sm:leading-10">
            {report.ai.shareCardText || report.oneLineSummary}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {report.coreTags.slice(0, 3).map((tag) => (
              <Badge key={tag} className="border-primary/25 bg-primary/15 text-primary">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-primary/20 pt-3 text-xs text-muted-foreground">
            <span>Love Radar AI</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
