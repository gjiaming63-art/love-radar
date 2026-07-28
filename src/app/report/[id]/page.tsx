import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/radar/report-view";
import type { LoveReport } from "@/types/report";

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
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) return null;
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const response = await fetch(`${protocol}://${host}/api/reports/${id}`, { cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as { report?: LoveReport & { id: string } };
  return payload.report ?? null;
}
