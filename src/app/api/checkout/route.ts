import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createReportCheckout } from "@/lib/lemonsqueezy";
import { trackProductEvent } from "@/lib/product-metrics";
import { getReport } from "@/lib/reports";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { reportId?: string };
    const reportId = String(body.reportId ?? "").trim();
    if (!reportId) return NextResponse.json({ error: "Missing report." }, { status: 400 });

    const report = await getReport(reportId);
    if (!report) return NextResponse.json({ error: "Report not found or expired." }, { status: 404 });
    if (report.isPaid) return NextResponse.json({ alreadyPaid: true });

    const user = await getCurrentUser();
    const result = await createReportCheckout({ reportId, userId: user?.id, email: user?.email });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 503 });

    await trackProductEvent({ eventName: "checkout_started", reportId, locale: "en-US", userId: user?.id, request }).catch(
      () => undefined,
    );
    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("checkout failed:", error);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
