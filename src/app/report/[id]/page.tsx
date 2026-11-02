import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/radar/report-view";
import { getCurrentUser } from "@/lib/auth";
import { getLockedCounts, getReport, redactReport } from "@/lib/reports";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("恋爱分析报告");

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  await headers();
  const report = await getReport(id);
  if (!report) notFound();
  const user = await getCurrentUser();
  const effectiveReport = user?.isTestAccount
    ? { ...report, isPaid: true, paidAt: report.paidAt ?? new Date().toISOString() }
    : report;
  // 中文付费墙始终开启：未兑换的报告只下发免费部分（服务器端裁剪）。
  return <ReportView initialReport={redactReport(effectiveReport)} lockedCounts={getLockedCounts(effectiveReport)} />;
}
