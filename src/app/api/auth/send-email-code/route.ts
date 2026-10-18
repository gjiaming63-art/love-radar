import { NextResponse } from "next/server";
import { sendEmailLoginCode } from "@/lib/auth";

export async function POST(request: Request) {
  let locale: "zh-CN" | "en-US" = "zh-CN";
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: string; locale?: "zh-CN" | "en-US" };
    locale = body.locale === "en-US" ? "en-US" : "zh-CN";
    const result = await sendEmailLoginCode(String(body.email ?? ""), request, locale);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("send email code route failed:", error);
    return NextResponse.json(
      { success: false, error: locale === "en-US" ? "Could not send the code. Please try again." : "验证码发送失败，请稍后再试。" },
      { status: 500 },
    );
  }
}
