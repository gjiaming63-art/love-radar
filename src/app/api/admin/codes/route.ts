import { NextResponse } from "next/server";
import { getProductStats } from "@/lib/product-metrics";
import { createUnlockCodes, exportUnusedCodesCsv, getUnlockCodeStats } from "@/lib/unlock-codes";

function isAuthorized(request: Request, password?: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const provided = password || request.headers.get("x-admin-password") || "";
  return provided === expected;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const password = url.searchParams.get("password") || undefined;
    if (!isAuthorized(request, password)) {
      return NextResponse.json({ error: "管理员密码不正确。" }, { status: 401 });
    }

    if (url.searchParams.get("format") === "csv") {
      const csv = await exportUnusedCodesCsv();
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="love-radar-unlock-codes.csv"`,
        },
      });
    }

    const [stats, productStats] = await Promise.all([getUnlockCodeStats(), getProductStats()]);
    return NextResponse.json({ stats, productStats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "读取兑换码数据失败。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      password?: string;
      count?: number;
      type?: string;
      expiresAt?: string;
    };
    if (!isAuthorized(request, body.password)) {
      return NextResponse.json({ error: "管理员密码不正确。" }, { status: 401 });
    }

    const count = Number(body.count ?? 100);
    if (!Number.isFinite(count) || count < 1 || count > 1000) {
      return NextResponse.json({ error: "生成数量必须在 1-1000 之间。" }, { status: 400 });
    }

    const codes = await createUnlockCodes({
      count,
      type: body.type || "single_report",
      expiresAt: body.expiresAt || null,
    });
    const [stats, productStats] = await Promise.all([getUnlockCodeStats(), getProductStats()]);
    return NextResponse.json({ codes, stats, productStats });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "生成兑换码失败。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
