import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/radar/report-view";
import { getCurrentUser } from "@/lib/auth";
import { getChatAstrologyLayer, redactChatAstrologyLayer } from "@/lib/chat-astrology/layers";
import { getReport, redactReport } from "@/lib/reports";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("恋爱分析报告");

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const data = await fetchReportData(id);
  if (!data) notFound();

  return <ReportView initialReport={data.report} initialAstrologyLayer={data.astrologyLayer} />;
}

async function fetchReportData(id: string) {
  await headers();
  const report = await getReport(id);
  if (!report) return null;
  const user = await getCurrentUser();
  const effectiveReport = user?.isTestAccount
    ? { ...report, isPaid: true, paidAt: report.paidAt ?? new Date().toISOString() }
    : report;
  const paywallEnabled = Boolean(process.env.NEXT_PUBLIC_MBD_BUY_URL);
  const unlocked = Boolean(user?.isTestAccount || effectiveReport.isPaid || !paywallEnabled);
  const astrologyLayer = await getChatAstrologyLayer(id);
  return {
    report: paywallEnabled ? redactReport(effectiveReport) : effectiveReport,
    astrologyLayer: astrologyLayer ? redactChatAstrologyLayer(astrologyLayer, unlocked) : null,
  };
}
