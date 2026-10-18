import { NextResponse } from "next/server";
import { setAuthSessionCookie, verifyEmailLoginCode } from "@/lib/auth";

export async function POST(request: Request) {
  let locale: "zh-CN" | "en-US" = "zh-CN";
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string; code?: string; locale?: "zh-CN" | "en-US" };
    locale = body.locale === "en-US" ? "en-US" : "zh-CN";
    const result = await verifyEmailLoginCode(String(body.email ?? ""), String(body.code ?? ""), locale);
    if (!result.success || !result.session) return NextResponse.json(result, { status: 400 });
    await setAuthSessionCookie(result.session);
    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error("verify email code route failed:", error);
    return NextResponse.json(
      { success: false, error: locale === "en-US" ? "Sign-in failed. Please try again." : "登录失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
