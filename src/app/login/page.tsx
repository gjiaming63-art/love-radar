import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/radar/login-form";
import { getCurrentUser } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{ redirect?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const redirectTo = normalizeRedirect(params.redirect);
  if (user) redirect(redirectTo);

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#07070d] px-4 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,69,132,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_22%)]" />
      <div className="relative mx-auto flex min-h-[calc(100svh-48px)] w-full max-w-md flex-col justify-center">
        <Link href="/" prefetch={false} className="mb-6 text-sm text-muted-foreground transition hover:text-white">
          恋爱雷达 Love Radar
        </Link>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}

function normalizeRedirect(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/me";
  return value;
}
