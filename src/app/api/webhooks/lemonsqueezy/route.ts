import { NextResponse } from "next/server";
import { handleLemonSqueezyEvent, verifyLemonSqueezySignature } from "@/lib/lemonsqueezy";
import { trackProductEvent } from "@/lib/product-metrics";

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyLemonSqueezySignature(rawBody, request.headers.get("x-signature"))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: Parameters<typeof handleLemonSqueezyEvent>[0];
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const result = await handleLemonSqueezyEvent(payload);
    if (result.handled && payload.meta?.event_name === "order_created") {
      await trackProductEvent({
        eventName: "payment_completed",
        reportId: String(payload.meta?.custom_data?.report_id ?? ""),
        locale: "en-US",
        source: "lemonsqueezy",
        request,
      }).catch(() => undefined);
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("lemonsqueezy webhook failed:", error);
    // Non-2xx makes Lemon Squeezy retry the delivery.
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
