import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/radar/login-form";
import { getCurrentUser } from "@/lib/auth";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Sign in to Love Radar AI");

export default async function EnglishLoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const redirectTo = params.redirect?.startsWith("/") && !params.redirect.startsWith("//") ? params.redirect : "/en/me";
  if (user) redirect(redirectTo);
  const bindReportId = redirectTo.match(/^\/en\/report\/([^/?#]+)/)?.[1];
  return <main className="relative min-h-svh overflow-hidden bg-[#07070d] px-4 py-6 text-white"><div className="relative mx-auto flex min-h-[calc(100svh-48px)] w-full max-w-md flex-col justify-center"><Link href="/en" prefetch={false} className="mb-6 text-sm text-muted-foreground">Love Radar AI</Link><LoginForm redirectTo={redirectTo} title="Sign in to Love Radar AI" locale="en-US" bindReportId={bindReportId} /></div></main>;
}
