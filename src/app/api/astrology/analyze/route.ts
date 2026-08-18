import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { calculateAstrologyReport } from "@/lib/astrology/calculator";
import { resolveBirthCity } from "@/lib/astrology/city-resolver";
import { interpretAstrologyWithDeepSeek } from "@/lib/astrology/deepseek";
import { localizeAstrologyReport } from "@/lib/astrology/localize";
import { saveAstrologyReport } from "@/lib/astrology/reports";
import type { AstrologyLocale, AstrologyProfileInput } from "@/types/astrology";

type RequestBody = {
  profileA?: Partial<AstrologyProfileInput>;
  profileB?: Partial<AstrologyProfileInput>;
  locale?: AstrologyLocale;
};

export async function POST(request: Request) {
  let locale: AstrologyLocale = "zh-CN";
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    locale = body.locale === "en-US" ? "en-US" : "zh-CN";
    const profileA = normalizeProfile(body.profileA, locale === "en-US" ? "Person A" : "你", locale);
    const profileB = normalizeProfile(body.profileB, locale === "en-US" ? "Person B" : "对方", locale);
    const [cityA, cityB] = await Promise.all([resolveBirthCity(profileA), resolveBirthCity(profileB)]);
    const calculatedReport = calculateAstrologyReport({ ...profileA, city: cityA }, { ...profileB, city: cityB });
    const report = localizeAstrologyReport(calculatedReport, locale);
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
      { error: formatAstrologyError(error, locale) },
      { status: 400 },
    );
  }
}

function formatAstrologyError(error: unknown, locale: AstrologyLocale) {
  if (locale !== "en-US") {
    return error instanceof Error ? error.message : "生成占星报告失败，请稍后重试。";
  }
  const message = error instanceof Error ? error.message : "";
  if (message && /^[\x00-\x7F]+$/.test(message)) return message;
  return "We could not recognize one of the birth cities. Please add a country or state, like Paris, France or Springfield, Illinois.";
}

function normalizeProfile(
  value: Partial<AstrologyProfileInput> | undefined,
  fallbackName: string,
  locale: AstrologyLocale,
): AstrologyProfileInput {
  const name = String(value?.name ?? fallbackName).replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 16) || fallbackName;
  const birthDate = String(value?.birthDate ?? "");
  const birthCityId = String(value?.birthCityId ?? "");
  const birthCityText = String(value?.birthCityText ?? "");
  const timeKnown = Boolean(value?.timeKnown);
  const birthTime = timeKnown ? String(value?.birthTime ?? "") : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    throw new Error(locale === "en-US" ? `Please enter a valid birth date for ${name}.` : `${name} 的出生日期格式不正确。`);
  }
  if (!birthCityId && !birthCityText.trim()) {
    throw new Error(locale === "en-US" ? `Please enter a birth city for ${name}.` : `请填写 ${name} 的出生城市。`);
  }
  if (timeKnown && !/^\d{2}:\d{2}$/.test(birthTime)) {
    throw new Error(locale === "en-US" ? `Please enter a valid birth time for ${name}.` : `${name} 的出生时间格式不正确。`);
  }
  return { name, birthDate, birthCityId, birthCityText, timeKnown, birthTime };
}
