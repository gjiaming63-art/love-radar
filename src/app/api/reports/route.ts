import { NextResponse } from "next/server";
import { ensureAuthSchema, getCurrentUser } from "@/lib/auth";
import { saveReport } from "@/lib/reports";
import type { LoveReport } from "@/types/report";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { report?: LoveReport; locale?: "zh-CN" | "en-US"; inputType?: "text" | "image" };
    if (
      typeof body.report?.overallScore !== "number" ||
      !body.report.summary ||
      !body.report.scores
    ) {
      return NextResponse.json({ error: "报告数据不完整" }, { status: 400 });
    }

    await ensureAuthSchema();
    const user = await getCurrentUser();
    const isTestAccount = Boolean(user?.isTestAccount);
    const saved = await saveReport({
      ...body.report,
      isPaid: isTestAccount || Boolean(body.report.isPaid),
      paidAt: isTestAccount ? new Date().toISOString() : body.report.paidAt,
      locale: body.locale ?? body.report.locale ?? "zh-CN",
      inputType: body.inputType ?? body.report.inputType ?? "text",
      analysisLanguage: body.locale ?? body.report.analysisLanguage ?? "zh-CN",
    }, user?.id);
    return NextResponse.json({ report: saved });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "保存报告失败" }, { status: 500 });
  }
}
