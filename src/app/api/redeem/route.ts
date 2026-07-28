import { NextResponse } from "next/server";
import { redeemUnlockCode } from "@/lib/unlock-codes";
import { getReport } from "@/lib/reports";
import { getClientKey } from "@/lib/screenshot-usage";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: string;
      reportId?: string;
    };
    const code = String(body.code ?? "");
    const reportId = String(body.reportId ?? "");

    if (!code.trim() || !reportId.trim()) {
      return NextResponse.json({ success: false, error: "请填写兑换码和报告 ID。" }, { status: 400 });
    }

    const result = await redeemUnlockCode(code, reportId, getClientKey(request));
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const report = await getReport(reportId);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "兑换失败，请稍后重试。" }, { status: 500 });
  }
}
