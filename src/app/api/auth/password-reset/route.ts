import { NextResponse } from "next/server";
import { completePasswordReset, setAuthSessionCookie, startPasswordReset } from "@/lib/auth";

type PasswordResetBody = {
  stage?: "start" | "complete";
  email?: string;
  code?: string;
  password?: string;
  confirmPassword?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as PasswordResetBody;
    if (body.stage === "complete") {
      const result = await completePasswordReset(
        String(body.email ?? ""),
        String(body.code ?? ""),
        String(body.password ?? ""),
        String(body.confirmPassword ?? ""),
      );
      if (!result.success || !result.session) return NextResponse.json(result, { status: 400 });
      await setAuthSessionCookie(result.session);
      return NextResponse.json({ success: true, user: result.user });
    }

    const result = await startPasswordReset(String(body.email ?? ""), request);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("password reset route failed:", error);
    return NextResponse.json({ success: false, error: "Could not reset the password. Please try again." }, { status: 500 });
  }
}
