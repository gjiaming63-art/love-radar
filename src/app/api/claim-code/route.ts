import { NextResponse } from "next/server";
import { claimUnlockCode } from "@/lib/code-claims";

export async function POST(request: Request) {
  // 面包多订单领码已停用：只校验格式、无法验证订单真实性。需要时设置 ENABLE_ORDER_CODE_CLAIM=true 恢复。
  if (process.env.ENABLE_ORDER_CODE_CLAIM !== "true") {
    return NextResponse.json({ success: false, error: "领取入口已停用，请联系卖家获取兑换码。" }, { status: 410 });
  }
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
