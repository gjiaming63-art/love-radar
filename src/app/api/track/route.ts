import { NextResponse } from "next/server";
import { trackProductEvent } from "@/lib/product-metrics";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await readTrackingBody(request)) as {
      eventName?: string;
      reportId?: string;
      source?: string;
      locale?: "zh-CN" | "en-US";
    };

    const allowed = ["visit", "premium_click", "premium_interest", "english_report_generated", "english_share_clicked"];
    if (!allowed.includes(String(body.eventName))) {
      return NextResponse.json({ error: "Unsupported event." }, { status: 400 });
    }

    const user = await getCurrentUser();
    await trackProductEvent({
      eventName: body.eventName as never,
      reportId: body.reportId,
      source: body.source,
      locale: body.locale,
      userId: user?.id,
      request,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("track event failed:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function readTrackingBody(request: Request) {
  const text = await request.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
