import { NextResponse } from "next/server";
import { sendLoginCode } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { phone?: string };
    const result = await sendLoginCode(String(body.phone ?? ""), request);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "验证码发送失败，请稍后再试。" }, { status: 500 });
  }
}
