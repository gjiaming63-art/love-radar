import Link from "next/link";
import { EnglishAccountSummary } from "@/components/radar/en/account-summary";
import { LoginForm } from "@/components/radar/login-form";
import { getCurrentUser, getMeOverview } from "@/lib/auth";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("My Love Radar account");

export default async function EnglishMePage() { const user = await getCurrentUser(); const overview = user ? await getMeOverview(user.id) : null; return <main className="min-h-svh bg-[#07070d] px-4 py-6 text-white"><div className="mx-auto w-full max-w-md"><div className="mb-6 flex items-center justify-between"><Link href="/en" prefetch={false} className="text-sm text-muted-foreground">Love Radar AI</Link><Link href="/en/analyze" prefetch={false} className="text-sm text-primary">Analyze a chat</Link></div>{user && overview ? <EnglishAccountSummary email={user.email} displayName={user.displayName} reports={overview.reports} /> : <LoginForm redirectTo="/en/me" title="Sign in to view your reports" locale="en-US" />}</div></main>; }
