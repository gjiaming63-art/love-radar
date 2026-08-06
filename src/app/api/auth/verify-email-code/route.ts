import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionCookieName, verifyEmailLoginCode } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string; code?: string };
    const result = await verifyEmailLoginCode(String(body.email ?? ""), String(body.code ?? ""));
    if (!result.success || !result.session) return NextResponse.json(result, { status: 400 });
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieName, result.session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: result.session.expiresAt,
    });
    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error("verify email code route failed:", error);
    return NextResponse.json({ success: false, error: "登录失败，请稍后再试。" }, { status: 500 });
  }
}
