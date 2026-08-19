import Link from "next/link";
import { AccountSummary } from "@/components/radar/account-summary";
import { LoginForm } from "@/components/radar/login-form";
import { getCurrentUser, getMeOverview } from "@/lib/auth";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("我的 Love Radar");

export default async function MePage() {
  const user = await getCurrentUser();
  const overview = user ? await getMeOverview(user.id) : null;

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#07070d] px-4 py-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,69,132,0.2),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_22%)]" />
      <div className="relative mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" prefetch={false} className="text-sm text-muted-foreground transition hover:text-white">
            恋爱雷达 Love Radar
          </Link>
          <Link href="/analyze" prefetch={false} className="text-sm text-primary transition hover:text-white">
            去分析
          </Link>
        </div>

        {user && overview ? (
          <AccountSummary
            email={user.email}
            displayName={user.displayName}
            screenshotRemaining={overview.screenshotRemaining}
            redeemedCodes={overview.redeemedCodes}
            reportCount={overview.reportCount}
            paidReportCount={overview.paidReportCount}
            newUserGiftCode={overview.newUserGiftCode}
            newUserGiftClaimed={overview.newUserGiftClaimed}
            reports={overview.reports}
          />
        ) : (
          <LoginForm redirectTo="/me" title="登录后查看我的报告" />
        )}
      </div>
    </main>
  );
}
