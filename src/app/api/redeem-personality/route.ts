import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClientKey } from "@/lib/screenshot-usage";
import { redeemPersonalityCode } from "@/lib/unlock-codes";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const code = String(body.code ?? "");
    if (!code.trim()) {
      return NextResponse.json({ success: false, error: "请输入兑换码。" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const result = await redeemPersonalityCode(code, getClientKey(request), user?.id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "兑换失败，请稍后重试。" }, { status: 500 });
  }
}
