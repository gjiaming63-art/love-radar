import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDodoPayment } from "@/lib/dodo";
import { markReportPaid } from "@/lib/purchases";

// Fallback for when the user returns before the webhook arrives:
// confirm the payment directly with Dodo and unlock only if it belongs to this report.
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { reportId?: string; paymentId?: string };
    const reportId = String(body.reportId ?? "").trim();
    const paymentId = String(body.paymentId ?? "").trim();
    if (!reportId || !paymentId) return NextResponse.json({ unlocked: false }, { status: 400 });

    const payment = await getDodoPayment(paymentId);
    const productId = process.env.DODO_PRODUCT_ID;
    const paidForThisReport =
      payment?.status === "succeeded" &&
      String(payment.metadata?.report_id ?? "") === reportId &&
      (!payment.product_cart?.length || payment.product_cart.some((item) => item.product_id === productId));
    if (!paidForThisReport) return NextResponse.json({ unlocked: false });

    const user = await getCurrentUser();
    const result = await markReportPaid({
      provider: "dodo",
      orderId: paymentId,
      reportId,
      userId: user?.id ?? (String(payment.metadata?.user_id ?? "") || null),
      amountCents: payment.total_amount ?? null,
      currency: payment.currency ?? null,
    });
    return NextResponse.json({ unlocked: result.unlocked });
  } catch (error) {
    console.error("checkout verify failed:", error);
    return NextResponse.json({ unlocked: false }, { status: 500 });
  }
}
