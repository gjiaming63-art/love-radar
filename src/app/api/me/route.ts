import { NextResponse } from "next/server";
import { getCurrentUser, getMeOverview } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  const overview = await getMeOverview(user.id);
  return NextResponse.json({ user, overview });
}
