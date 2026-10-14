import { NextResponse } from "next/server";
import { verifyDodoWebhook } from "@/lib/dodo";
import { trackProductEvent } from "@/lib/product-metrics";
import { markPurchaseRefunded, markReportPaid } from "@/lib/purchases";

type DodoEvent = {
  type?: string;
  data?: {
    payment_id?: string;
    status?: string | null;
    total_amount?: number;
    currency?: string;
    metadata?: Record<string, unknown> | null;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyDodoWebhook(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: DodoEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const data = event.data ?? {};
    const paymentId = String(data.payment_id ?? "");

    if (event.type === "payment.succeeded") {
      const reportId = String(data.metadata?.report_id ?? "").trim();
      const userId = String(data.metadata?.user_id ?? "").trim() || null;
      if (!reportId || !paymentId) return NextResponse.json({ ok: true, handled: false });
      const result = await markReportPaid({
        provider: "dodo",
        orderId: paymentId,
        reportId,
        userId,
        amountCents: data.total_amount ?? null,
        currency: data.currency ?? null,
      });
      if (result.firstTime) {
        await trackProductEvent({ eventName: "payment_completed", reportId, locale: "en-US", source: "dodo", request }).catch(
          () => undefined,
        );
      }
      return NextResponse.json({ ok: true, handled: true });
    }

    if (event.type?.startsWith("refund.") && event.type !== "refund.failed" && paymentId) {
      await markPurchaseRefunded("dodo", paymentId);
      return NextResponse.json({ ok: true, handled: true });
    }

    return NextResponse.json({ ok: true, handled: false });
  } catch (error) {
    console.error("dodo webhook failed:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
