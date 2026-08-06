import { NextResponse } from "next/server";
import { sendEmailLoginCode } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const result = await sendEmailLoginCode(String(body.email ?? ""), request);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("send email code route failed:", error);
    return NextResponse.json({ success: false, error: "验证码发送失败，请稍后再试。" }, { status: 500 });
  }
}
