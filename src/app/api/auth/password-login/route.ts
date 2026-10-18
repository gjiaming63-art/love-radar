import { NextResponse } from "next/server";
import { loginWithPassword, setAuthSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
    const result = await loginWithPassword(String(body.email ?? ""), String(body.password ?? ""), request);
    if (!result.success || !result.session) return NextResponse.json(result, { status: 400 });
    await setAuthSessionCookie(result.session);
    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error("password login route failed:", error);
    return NextResponse.json({ success: false, error: "Sign-in failed. Please try again." }, { status: 500 });
  }
}
