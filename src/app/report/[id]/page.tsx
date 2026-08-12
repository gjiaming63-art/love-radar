import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/radar/report-view";
import { getCurrentUser } from "@/lib/auth";
import { getReport, redactReport } from "@/lib/reports";

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = await fetchReport(id);
  if (!report) notFound();

  return <ReportView initialReport={report} />;
}

async function fetchReport(id: string) {
  await headers();
  const report = await getReport(id);
  if (!report) return null;
  const user = await getCurrentUser();
  const effectiveReport = user?.isTestAccount
    ? { ...report, isPaid: true, paidAt: report.paidAt ?? new Date().toISOString() }
    : report;
  const paywallEnabled = Boolean(process.env.NEXT_PUBLIC_MBD_BUY_URL);
  return paywallEnabled ? redactReport(effectiveReport) : effectiveReport;
}
