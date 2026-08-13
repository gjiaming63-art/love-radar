import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { calculateAstrologyReport } from "@/lib/astrology/calculator";
import { resolveBirthCity } from "@/lib/astrology/city-resolver";
import { getChatAstrologyLayer, redactChatAstrologyLayer, saveChatAstrologyLayer } from "@/lib/chat-astrology/layers";
import { synthesizeChatAstrologyLayer } from "@/lib/chat-astrology/deepseek";
import { getReport } from "@/lib/reports";
import type { AstrologyProfileInput } from "@/types/astrology";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RequestBody = {
  profileA?: Partial<AstrologyProfileInput>;
  profileB?: Partial<AstrologyProfileInput>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const report = await getReport(id);
  if (!report) return NextResponse.json({ error: "报告不存在或已过期。" }, { status: 404 });
  const layer = await getChatAstrologyLayer(id);
  if (!layer) return NextResponse.json({ layer: null });
  const user = await getCurrentUser();
  const unlocked = Boolean(user?.isTestAccount || report.isPaid || !process.env.NEXT_PUBLIC_MBD_BUY_URL);
  return NextResponse.json({ layer: redactChatAstrologyLayer(layer, unlocked) });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const report = await getReport(id);
    if (!report) return NextResponse.json({ error: "报告不存在或已过期。" }, { status: 404 });

    const existing = await getChatAstrologyLayer(id);
    if (existing) {
      const user = await getCurrentUser();
      const unlocked = Boolean(user?.isTestAccount || report.isPaid || !process.env.NEXT_PUBLIC_MBD_BUY_URL);
      return NextResponse.json({ layer: redactChatAstrologyLayer(existing, unlocked) });
    }

    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const profileA = normalizeProfile(body.profileA, "你");
    const profileB = normalizeProfile(body.profileB, "对方");
    const [cityA, cityB] = await Promise.all([resolveBirthCity(profileA), resolveBirthCity(profileB)]);
    const astrology = calculateAstrologyReport({ ...profileA, city: cityA }, { ...profileB, city: cityB });
    const layer = await synthesizeChatAstrologyLayer(report, astrology);
    const saved = await saveChatAstrologyLayer(layer);
    const user = await getCurrentUser();
    const unlocked = Boolean(user?.isTestAccount || report.isPaid || !process.env.NEXT_PUBLIC_MBD_BUY_URL);

    return NextResponse.json({ layer: redactChatAstrologyLayer(saved, unlocked) });
  } catch (error) {
    console.error("chat astrology layer failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成星盘辅助解读失败，请稍后重试。" },
      { status: 400 },
    );
  }
}

function normalizeProfile(value: Partial<AstrologyProfileInput> | undefined, fallbackName: string): AstrologyProfileInput {
  const name = String(value?.name ?? fallbackName).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 16) || fallbackName;
  const birthDate = String(value?.birthDate ?? "");
  const birthCityId = String(value?.birthCityId ?? "");
  const birthCityText = String(value?.birthCityText ?? "");
  const timeKnown = Boolean(value?.timeKnown);
  const birthTime = timeKnown ? String(value?.birthTime ?? "") : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) throw new Error(`${name} 的出生日期格式不正确。`);
  if (!birthCityId && !birthCityText.trim()) throw new Error(`请填写 ${name} 的出生城市。`);
  if (timeKnown && !/^\d{2}:\d{2}$/.test(birthTime)) throw new Error(`${name} 的出生时间格式不正确。`);
  return { name, birthDate, birthCityId, birthCityText, timeKnown, birthTime };
}
