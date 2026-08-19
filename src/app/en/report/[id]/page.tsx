import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { EnglishReportView } from "@/components/radar/en/report-view";
import { getCurrentUser } from "@/lib/auth";
import { getReport, redactReport } from "@/lib/reports";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Relationship analysis report");

export default async function EnglishReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await headers();
  const report = await getReport(id);
  if (!report) notFound();
  const user = await getCurrentUser();
  const effectiveReport = user?.isTestAccount
    ? { ...report, isPaid: true, paidAt: report.paidAt ?? new Date().toISOString() }
    : report;
  const paywallEnabled = Boolean(process.env.NEXT_PUBLIC_MBD_BUY_URL);
  return <EnglishReportView report={paywallEnabled ? redactReport(effectiveReport) : effectiveReport} />;
}
