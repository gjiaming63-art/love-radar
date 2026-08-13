import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAstrologyReport, redactAstrologyReport } from "@/lib/astrology/reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const report = await getAstrologyReport(id);
  if (!report) return NextResponse.json({ error: "报告不存在或已过期" }, { status: 404 });
  const user = await getCurrentUser();
  const effectiveReport = user?.isTestAccount
    ? { ...report, isPaid: true, paidAt: report.paidAt ?? new Date().toISOString() }
    : report;
  const paywallEnabled = Boolean(process.env.NEXT_PUBLIC_MBD_BUY_URL);
  return NextResponse.json({ report: paywallEnabled ? redactAstrologyReport(effectiveReport) : effectiveReport });
}
