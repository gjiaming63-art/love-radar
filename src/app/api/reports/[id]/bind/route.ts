import { NextResponse } from "next/server";
import { bindReportToUser, getCurrentUser } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "请先登录。" }, { status: 401 });
  const { id } = await context.params;
  const ok = await bindReportToUser(id, user.id);
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 404 });
}
