import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { calculateAstrologyReport } from "@/lib/astrology/calculator";
import { resolveBirthCity } from "@/lib/astrology/city-resolver";
import { interpretAstrologyWithDeepSeek } from "@/lib/astrology/deepseek";
import { saveAstrologyReport } from "@/lib/astrology/reports";
import type { AstrologyProfileInput } from "@/types/astrology";

type RequestBody = {
  profileA?: Partial<AstrologyProfileInput>;
  profileB?: Partial<AstrologyProfileInput>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const profileA = normalizeProfile(body.profileA, "你");
    const profileB = normalizeProfile(body.profileB, "对方");
    const [cityA, cityB] = await Promise.all([resolveBirthCity(profileA), resolveBirthCity(profileB)]);
    const report = calculateAstrologyReport({ ...profileA, city: cityA }, { ...profileB, city: cityB });
    const ai = await interpretAstrologyWithDeepSeek(report);
    const user = await getCurrentUser();
    const saved = await saveAstrologyReport(
      {
        ...report,
        ai,
        isPaid: Boolean(user?.isTestAccount),
        paidAt: user?.isTestAccount ? new Date().toISOString() : null,
      },
      user?.id,
    );
    return NextResponse.json({ report: saved });
  } catch (error) {
    console.error("astrology analyze failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成占星报告失败，请稍后重试。" },
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
