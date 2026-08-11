import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { EnglishReportView } from "@/components/radar/en/report-view";
import type { LoveReport } from "@/types/report";

export default async function EnglishReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) notFound();
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const response = await fetch(`${protocol}://${host}/api/reports/${id}`, {
    cache: "no-store",
    headers: { cookie: headerStore.get("cookie") ?? "" },
  });
  if (!response.ok) notFound();
  const payload = (await response.json()) as { report?: LoveReport & { id: string } };
  if (!payload.report) notFound();
  return <EnglishReportView report={payload.report} />;
}
