import type { AstrologyCity } from "@/types/astrology";

export const astrologyCities: AstrologyCity[] = [
  { id: "cn-beijing", name: "北京", country: "中国", latitude: 39.9042, longitude: 116.4074, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-shanghai", name: "上海", country: "中国", latitude: 31.2304, longitude: 121.4737, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-guangzhou", name: "广州", country: "中国", latitude: 23.1291, longitude: 113.2644, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-shenzhen", name: "深圳", country: "中国", latitude: 22.5431, longitude: 114.0579, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-hangzhou", name: "杭州", country: "中国", latitude: 30.2741, longitude: 120.1551, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-chengdu", name: "成都", country: "中国", latitude: 30.5728, longitude: 104.0668, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-wuhan", name: "武汉", country: "中国", latitude: 30.5928, longitude: 114.3055, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-xian", name: "西安", country: "中国", latitude: 34.3416, longitude: 108.9398, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-chongqing", name: "重庆", country: "中国", latitude: 29.563, longitude: 106.5516, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-shenyang", name: "沈阳", country: "中国", region: "辽宁", latitude: 41.8057, longitude: 123.4315, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-nanjing", name: "南京", country: "中国", latitude: 32.0603, longitude: 118.7969, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-tianjin", name: "天津", country: "中国", latitude: 39.3434, longitude: 117.3616, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-qingdao", name: "青岛", country: "中国", latitude: 36.0671, longitude: 120.3826, timezone: "Asia/Shanghai", utcOffsetMinutes: 480 },
  { id: "cn-hongkong", name: "香港", country: "中国", latitude: 22.3193, longitude: 114.1694, timezone: "Asia/Hong_Kong", utcOffsetMinutes: 480 },
  { id: "cn-taipei", name: "台北", country: "中国", latitude: 25.033, longitude: 121.5654, timezone: "Asia/Taipei", utcOffsetMinutes: 480 },
  { id: "us-new-york", name: "New York", country: "United States", region: "NY", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", utcOffsetMinutes: -300 },
  { id: "us-los-angeles", name: "Los Angeles", country: "United States", region: "CA", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles", utcOffsetMinutes: -480 },
  { id: "us-chicago", name: "Chicago", country: "United States", region: "IL", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago", utcOffsetMinutes: -360 },
  { id: "uk-london", name: "London", country: "United Kingdom", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London", utcOffsetMinutes: 0 },
  { id: "fr-paris", name: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris", utcOffsetMinutes: 60 },
  { id: "jp-tokyo", name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo", utcOffsetMinutes: 540 },
  { id: "kr-seoul", name: "Seoul", country: "South Korea", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul", utcOffsetMinutes: 540 },
  { id: "sg-singapore", name: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore", utcOffsetMinutes: 480 },
  { id: "au-sydney", name: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney", utcOffsetMinutes: 600 },
  { id: "ca-toronto", name: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto", utcOffsetMinutes: -300 },
  { id: "de-berlin", name: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.405, timezone: "Europe/Berlin", utcOffsetMinutes: 60 },
];

export function getAstrologyCity(id: string) {
  return astrologyCities.find((city) => city.id === id) ?? null;
}

export function findAstrologyCityByText(text: string) {
  const query = text.trim().toLowerCase();
  if (!query) return null;
  return (
    astrologyCities.find((city) => city.id === query) ??
    astrologyCities.find((city) => city.name.toLowerCase() === query) ??
    astrologyCities.find((city) => `${city.name} ${city.country} ${city.region ?? ""}`.toLowerCase().includes(query)) ??
    null
  );
}

export function formatCityLabel(city: AstrologyCity) {
  return [city.name, city.region, city.country].filter(Boolean).join(" · ");
}
