import { NextResponse } from "next/server";
import { trackProductEvent } from "@/lib/product-metrics";

export async function POST(request: Request) {
  try {
    const body = (await readTrackingBody(request)) as {
      eventName?: string;
      reportId?: string;
      source?: string;
    };

    if (body.eventName !== "visit" && body.eventName !== "premium_click") {
      return NextResponse.json({ error: "Unsupported event." }, { status: 400 });
    }

    await trackProductEvent({
      eventName: body.eventName,
      reportId: body.reportId,
      source: body.source,
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
