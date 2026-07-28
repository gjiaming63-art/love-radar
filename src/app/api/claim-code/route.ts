import { NextResponse } from "next/server";
import { claimUnlockCode } from "@/lib/code-claims";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      orderNo?: string;
      source?: string;
    };
    const orderNo = String(body.orderNo ?? "");
    if (!orderNo.trim()) {
      return NextResponse.json({ success: false, error: "请填写面包多订单号。" }, { status: 400 });
    }

    const result = await claimUnlockCode({
      orderNo,
      request,
      source: body.source || "mianbaoduo",
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "领取失败，请稍后重试。" }, { status: 500 });
  }
}
