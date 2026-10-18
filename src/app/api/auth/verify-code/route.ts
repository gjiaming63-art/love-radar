import { NextResponse } from "next/server";
import { setAuthSessionCookie, verifyLoginCode } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { phone?: string; code?: string };
    const result = await verifyLoginCode(String(body.phone ?? ""), String(body.code ?? ""));
    if (!result.success || !result.session) {
      return NextResponse.json(result, { status: 400 });
    }
    await setAuthSessionCookie(result.session);
    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "登录失败，请稍后再试。" }, { status: 500 });
  }
}
