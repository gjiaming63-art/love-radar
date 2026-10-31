import { NextResponse } from "next/server";
import { getEnglishFunnel } from "@/lib/product-metrics";

export async function GET(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || request.headers.get("x-admin-password") !== expected) {
    return NextResponse.json({ error: "管理员密码不正确。" }, { status: 401 });
  }
  try {
    const days = Math.min(90, Math.max(1, Number(new URL(request.url).searchParams.get("days")) || 7));
    return NextResponse.json({ funnel: await getEnglishFunnel(days) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "读取漏斗数据失败。" }, { status: 500 });
  }
}
