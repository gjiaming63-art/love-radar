import { notFound } from "next/navigation";
import { EnglishAstrologyReportView } from "@/components/radar/en/astrology-report-view";
import { getAstrologyReport } from "@/lib/astrology/reports";

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EnglishAstrologyReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = await getAstrologyReport(id);
  if (!report || report.locale !== "en-US") notFound();
  return <EnglishAstrologyReportView initialReport={report} />;
}
