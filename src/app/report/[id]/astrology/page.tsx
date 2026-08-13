import { notFound } from "next/navigation";

import { ChatAstrologyLayerForm } from "@/components/radar/chat-astrology-layer-form";
import { getReport } from "@/lib/reports";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatAstrologyLayerPage({ params }: PageProps) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();

  return <ChatAstrologyLayerForm reportId={id} report={report} />;
}
