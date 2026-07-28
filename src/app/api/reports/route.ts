import { NextResponse } from "next/server";
import { saveReport } from "@/lib/reports";
import type { LoveReport } from "@/types/report";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { report?: LoveReport };
    if (
      typeof body.report?.overallScore !== "number" ||
      !body.report.summary ||
      !body.report.scores
    ) {
      return NextResponse.json({ error: "报告数据不完整" }, { status: 400 });
    }

    const saved = await saveReport(body.report);
    return NextResponse.json({ report: saved });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "保存报告失败" }, { status: 500 });
  }
}
