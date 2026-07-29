import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logoutCurrentSession, sessionCookieName } from "@/lib/auth";

export async function POST() {
  await logoutCurrentSession();
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
  return NextResponse.json({ success: true });
}
