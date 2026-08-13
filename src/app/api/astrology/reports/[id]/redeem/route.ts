import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAstrologyReport, redeemAstrologyReport } from "@/lib/astrology/reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = String(body.code ?? "");
    if (!code.trim()) return NextResponse.json({ success: false, error: "请输入兑换码。" }, { status: 400 });
    const user = await getCurrentUser();
    const result = await redeemAstrologyReport(code, id, user?.id);
    if (!result.success) return NextResponse.json(result, { status: 400 });
    const report = await getAstrologyReport(id);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("redeem astrology route failed:", error);
    return NextResponse.json({ success: false, error: "兑换失败，请稍后重试。" }, { status: 500 });
  }
}
