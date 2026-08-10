import { NextResponse } from "next/server";
import { getCurrentUser, getMeOverview, updateUserProfile } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const overview = await getMeOverview(user.id);
  return NextResponse.json({ user, overview });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "请先登录。" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { displayName?: string };
  const result = await updateUserProfile(user.id, String(body.displayName ?? ""));
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
