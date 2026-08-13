import { findAstrologyCityByText, formatCityLabel, getAstrologyCity } from "@/lib/astrology/cities";
import type { AstrologyCity, AstrologyProfileInput } from "@/types/astrology";

type CityResolvePayload = {
  name?: string;
  country?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  utcOffsetMinutes?: number;
  confidence?: number;
};

let cachedApiKey: string | null = null;

function getDeepSeekConfig() {
  cachedApiKey = cachedApiKey ?? process.env.DEEPSEEK_API_KEY ?? "";
  return {
    apiKey: cachedApiKey,
    baseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, ""),
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  };
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("City resolver did not return JSON.");
  return text.slice(start, end + 1);
}

export async function resolveBirthCity(profile: AstrologyProfileInput): Promise<AstrologyCity> {
  if (profile.birthCityId) {
    const city = getAstrologyCity(profile.birthCityId);
    if (city) return city;
  }
  const cityText = String(profile.birthCityText || "").trim();
  const local = findAstrologyCityByText(cityText);
  if (local) return local;
  if (!cityText) throw new Error("请填写出生城市。");

  const aiCity = await resolveCityWithAi(cityText);
  if (aiCity) return aiCity;
  throw new Error(`暂时无法识别“${cityText}”，请补充国家或省州，例如“Paris, France”或“北京，中国”。`);
}

async function resolveCityWithAi(cityText: string): Promise<AstrologyCity | null> {
  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  if (!apiKey) return null;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You resolve a user-provided birth city into approximate coordinates and timezone for an astrology entertainment app. Return strict JSON only. If ambiguous, choose the most globally common city but lower confidence. Do not invent exact street-level precision.",
        },
        {
          role: "user",
          content: `Resolve this birth city: "${cityText}".

Return exactly:
{
  "name": "city name",
  "country": "country or region",
  "region": "province/state if known, otherwise empty string",
  "latitude": 0,
  "longitude": 0,
  "timezone": "IANA timezone such as Asia/Shanghai",
  "utcOffsetMinutes": 480,
  "confidence": 0.85
}

Rules:
- latitude must be between -90 and 90.
- longitude must be between -180 and 180.
- timezone must be a valid-looking IANA timezone.
- confidence should be below 0.7 if the city name is ambiguous.`,
        },
      ],
    }),
  });
  if (!response.ok) return null;
  const data = (await response.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content || "";
  if (!content) return null;
  const parsed = JSON.parse(extractJson(content)) as CityResolvePayload;
  if (!isValidCityPayload(parsed)) return null;
  const city: AstrologyCity = {
    id: `ai-${slug(parsed.name)}-${slug(parsed.country)}`,
    name: String(parsed.name).trim(),
    country: String(parsed.country).trim(),
    region: String(parsed.region || "").trim() || undefined,
    latitude: Number(parsed.latitude),
    longitude: Number(parsed.longitude),
    timezone: String(parsed.timezone).trim(),
    utcOffsetMinutes: Math.round(Number(parsed.utcOffsetMinutes)),
  };
  if (Number(parsed.confidence ?? 0) < 0.62) {
    throw new Error(`“${cityText}”可能有多个同名城市，请补充国家或省州，例如 ${formatCityLabel(city)}。`);
  }
  return city;
}

function isValidCityPayload(value: CityResolvePayload) {
  const lat = Number(value.latitude);
  const lon = Number(value.longitude);
  const offset = Number(value.utcOffsetMinutes);
  const timezone = String(value.timezone || "");
  return (
    Boolean(String(value.name || "").trim()) &&
    Boolean(String(value.country || "").trim()) &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    Number.isFinite(lon) &&
    lon >= -180 &&
    lon <= 180 &&
    Number.isFinite(offset) &&
    /^[-A-Za-z_]+\/[-A-Za-z_]+(?:\/[-A-Za-z_]+)?$/.test(timezone)
  );
}

function slug(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
