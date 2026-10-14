import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "gjiaming63@gmail.com";
export const policyUpdated = "October 13, 2026";

export function PolicyPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-svh px-5 py-6 text-white">
      <article className="mx-auto w-full max-w-2xl space-y-5">
        <Link href="/en" prefetch={false} className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />Love Radar AI
        </Link>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-xs text-muted-foreground">Last updated: {policyUpdated}</p>
        <div className="space-y-4 text-sm leading-7 text-muted-foreground [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-white [&_a]:text-primary [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </main>
  );
}

export function PolicyFooter() {
  return (
    <footer className="px-5 pb-8 pt-4 text-xs text-muted-foreground">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap justify-center gap-x-5 gap-y-2">
        <Link href="/en#pricing" prefetch={false}>Pricing</Link>
        <Link href="/en/terms" prefetch={false}>Terms</Link>
        <Link href="/en/privacy" prefetch={false}>Privacy</Link>
        <Link href="/en/refund" prefetch={false}>Refunds</Link>
        <Link href="/en/contact" prefetch={false}>Contact</Link>
      </nav>
      <p className="mt-3 text-center">For entertainment and self-reflection only. 18+.</p>
    </footer>
  );
}
