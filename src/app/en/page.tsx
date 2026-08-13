import Link from "next/link";
import { ArrowRight, BrainCircuit, LogIn, Radar, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { enUS } from "@/lib/i18n/en-US";
import { getCurrentUser } from "@/lib/auth";

export default async function EnglishHome() {
  const user = await getCurrentUser();
  const accountHref = user ? "/en/me" : "/en/login?redirect=/en/me";
  const accountLabel = user ? "My account" : "Sign in";
  const AccountIcon = user ? UserRound : LogIn;

  return (
    <main className="relative min-h-svh overflow-hidden px-5 py-6 text-white">
      <div className="signal-grid pointer-events-none absolute inset-0 opacity-70" />
      <section className="relative mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-5xl flex-col justify-between">
        <header className="flex items-center justify-between pr-24 sm:pr-0">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary">
              <Radar className="h-4 w-4" />
            </span>
            <span className="truncate">{enUS.brand}</span>
          </div>
        </header>

        <div className="grid gap-10 pb-8 pt-12 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <Badge className="border-primary/25 bg-primary/10 text-primary">Emotional signals</Badge>
              <Badge className="border-primary/25 bg-primary/10 text-primary">Conversation patterns</Badge>
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-[0.95] sm:text-7xl">Love Radar AI</h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
              {enUS.tagline}
              <br />
              {enUS.subline}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/en/analyze" prefetch={false}>
                <Button size="lg" className="w-full sm:w-auto">
                  {enUS.start}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/en/personality" prefetch={false}>
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <BrainCircuit className="h-4 w-4 text-accent" />
                  Take the quiz
                </Button>
              </Link>
              <Link href={accountHref} prefetch={false}>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 sm:w-auto"
                >
                  <AccountIcon className="h-4 w-4" />
                  {accountLabel}
                </Button>
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" />
              Chat content is not saved as original text.
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-sm">
            <div className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5" />
            <div className="absolute inset-10 rounded-full border border-accent/20" />
            <div className="absolute inset-20 rounded-full border border-white/10" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">See what the chat is really saying.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
