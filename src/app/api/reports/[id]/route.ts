import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteReport, getReport, redactReport } from "@/lib/reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const report = await getReport(id);
  if (!report) {
    return NextResponse.json({ error: "报告不存在或已过期" }, { status: 404 });
  }
  const user = await getCurrentUser();
  const effectiveReport = user?.isTestAccount
    ? { ...report, isPaid: true, paidAt: report.paidAt ?? new Date().toISOString() }
    : report;
  const paywallEnabled = Boolean(process.env.NEXT_PUBLIC_MBD_BUY_URL);
  return NextResponse.json({ report: paywallEnabled ? redactReport(effectiveReport) : effectiveReport });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { deleteToken?: string };
  if (!body.deleteToken) {
    return NextResponse.json({ error: "缺少删除凭证" }, { status: 400 });
  }
  const deleted = await deleteReport(id, body.deleteToken);
  if (!deleted) {
    return NextResponse.json({ error: "删除凭证不正确" }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
