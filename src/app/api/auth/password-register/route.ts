import { NextResponse } from "next/server";
import { completePasswordRegistration, setAuthSessionCookie, startPasswordRegistration } from "@/lib/auth";

type RegistrationBody = {
  stage?: "start" | "verify";
  email?: string;
  password?: string;
  confirmPassword?: string;
  code?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RegistrationBody;
    if (body.stage === "verify") {
      const result = await completePasswordRegistration(String(body.email ?? ""), String(body.code ?? ""));
      if (!result.success || !result.session) return NextResponse.json(result, { status: 400 });
      await setAuthSessionCookie(result.session);
      return NextResponse.json({ success: true, user: result.user });
    }

    const result = await startPasswordRegistration(
      String(body.email ?? ""),
      String(body.password ?? ""),
      String(body.confirmPassword ?? ""),
      request,
    );
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("password registration route failed:", error);
    return NextResponse.json({ success: false, error: "Could not create the account. Please try again." }, { status: 500 });
  }
}
