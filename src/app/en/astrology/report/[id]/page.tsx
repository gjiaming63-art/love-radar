import { notFound } from "next/navigation";
import { EnglishAstrologyReportView } from "@/components/radar/en/astrology-report-view";
import { getAstrologyReport } from "@/lib/astrology/reports";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Love astrology report");

type ReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EnglishAstrologyReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const report = await getAstrologyReport(id);
  if (!report || report.locale !== "en-US") notFound();
  return <EnglishAstrologyReportView initialReport={report} />;
}
