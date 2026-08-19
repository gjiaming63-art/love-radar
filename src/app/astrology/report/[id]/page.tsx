import { notFound } from "next/navigation";
import { AstrologyReportView } from "@/components/radar/astrology-report-view";
import { getCurrentUser } from "@/lib/auth";
import { getAstrologyReport, redactAstrologyReport } from "@/lib/astrology/reports";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("恋爱占星报告");

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AstrologyReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = await getAstrologyReport(id);
  if (!report) notFound();
  const user = await getCurrentUser();
  const effectiveReport = user?.isTestAccount
    ? { ...report, isPaid: true, paidAt: report.paidAt ?? new Date().toISOString() }
    : report;
  const paywallEnabled = Boolean(process.env.NEXT_PUBLIC_MBD_BUY_URL);
  return <AstrologyReportView initialReport={paywallEnabled ? redactAstrologyReport(effectiveReport) : effectiveReport} />;
}
