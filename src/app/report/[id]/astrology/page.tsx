import { notFound } from "next/navigation";

import { ChatAstrologyLayerForm } from "@/components/radar/chat-astrology-layer-form";
import { getReport } from "@/lib/reports";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("星盘辅助解读");

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatAstrologyLayerPage({ params }: PageProps) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();

  return <ChatAstrologyLayerForm reportId={id} report={report} />;
}
