"use client";

import { Download, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type PersonalityShareCardProps = {
  name: string;
  englishName: string;
  symbol: string;
  representative: string;
  keywords: string[];
  coreLine: string;
  onGenerate?: () => void;
  onSave?: () => void;
};

export function PersonalityShareCard({
  name,
  englishName,
  symbol,
  representative,
  keywords,
  coreLine,
  onGenerate,
  onSave,
}: PersonalityShareCardProps) {
  const [status, setStatus] = useState("");

  async function saveCard() {
    onGenerate?.();
    setStatus("正在生成恋爱人格卡…");

    try {
      const blob = await renderCardAsPng({ name, englishName, symbol, representative, keywords, coreLine });
      const file = new File([blob], "love-radar-personality.png", { type: "image/png" });

      if (canShareFile(file)) {
        await navigator.share({
          files: [file],
          title: `我的恋爱人格｜${name}`,
          text: "测测你的恋爱人格｜Love Radar",
        });
        setStatus("已生成，可以分享给朋友了");
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "love-radar-personality.png";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus("已保存到设备");
      }

      onSave?.();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("已取消分享，你仍可以再次生成");
        return;
      }
      setStatus("生成失败，请稍后再试");
    }
  }

  return (
    <section className="rounded-xl border border-primary/25 bg-card/80 p-4 shadow-[0_0_34px_rgb(244_63_94_/_0.08)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Shareable snapshot</p>
          <h2 className="mt-2 text-lg font-semibold">把你的恋爱人格发给朋友</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">一张 3:4 结果卡，适合保存到手机或发到社交平台。</p>
        </div>
        <span className="rounded-full border border-border bg-background/40 px-2.5 py-1 text-xs text-muted-foreground">3:4</span>
      </div>

      <div className="mx-auto mt-5 aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#15101f] p-5 shadow-[0_20px_60px_rgb(0_0_0_/_0.25)] sm:max-w-[320px]">
        <div className="flex h-full flex-col justify-between rounded-xl border border-primary/20 bg-[radial-gradient(circle_at_80%_12%,rgb(244_63_94_/_0.22),transparent_30%),radial-gradient(circle_at_12%_82%,rgb(45_212_191_/_0.12),transparent_34%),linear-gradient(160deg,rgb(35_22_42),rgb(15_13_24))] p-5">
          <div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/55">
              <span>Love Radar</span>
              <span>恋爱人格</span>
            </div>
            <div className="mt-10 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-3xl shadow-[0_0_30px_rgb(244_63_94_/_0.18)]">
              {symbol}
            </div>
            <p className="mt-8 text-xs text-primary">我的恋爱人格</p>
            <h3 className="mt-2 text-2xl font-semibold leading-tight text-white">{name}</h3>
            <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/45">{englishName}</p>
            <p className="mt-5 text-xs text-white/65">代表形象 · {representative}</p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {keywords.slice(0, 5).map((keyword) => (
                <span key={keyword} className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-white/75">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-4 h-px bg-gradient-to-r from-primary/50 via-white/10 to-transparent" />
            <p className="text-sm leading-7 text-white/90">{coreLine}</p>
            <p className="mt-7 text-[10px] tracking-[0.14em] text-white/40">LOVE RADAR · 测测你的恋爱人格</p>
          </div>
        </div>
      </div>

      <Button type="button" size="lg" className="mt-5 w-full" onClick={saveCard}>
        {navigatorHasShareSupport() ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        {status || "生成我的恋爱人格卡"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">高清 PNG · 1080 × 1440</p>
    </section>
  );
}

function navigatorHasShareSupport() {
  return typeof navigator !== "undefined" && navigator.maxTouchPoints > 0 && typeof navigator.share === "function";
}

function canShareFile(file: File) {
  return navigatorHasShareSupport() && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
}

async function renderCardAsPng({
  name,
  englishName,
  symbol,
  representative,
  keywords,
  coreLine,
}: Omit<PersonalityShareCardProps, "onGenerate" | "onSave">) {
  const svg = createCardSvg({ name, englishName, symbol, representative, keywords, coreLine });
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not supported");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 1));
    if (!result) throw new Error("Unable to export image");
    return result;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to render image"));
    image.src = url;
  });
}

function createCardSvg({
  name,
  englishName,
  symbol,
  representative,
  keywords,
  coreLine,
}: Omit<PersonalityShareCardProps, "onGenerate" | "onSave">) {
  const title = escapeXml(name);
  const quoteLines = wrapText(coreLine, 18).map((line, index) => `<tspan x="120" dy="${index === 0 ? 0 : 58}">${escapeXml(line)}</tspan>`).join("");
  const keywordMarkup = keywords
    .slice(0, 5)
    .map((keyword, index) => `<rect x="${120 + (index % 3) * 170}" y="${760 + Math.floor(index / 3) * 62}" width="145" height="40" rx="20" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.16"/><text x="${192 + (index % 3) * 170}" y="${786 + Math.floor(index / 3) * 62}" text-anchor="middle" fill="#f8f4f6" fill-opacity="0.78" font-size="21">${escapeXml(keyword)}</text>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
    <defs>
      <radialGradient id="pink" cx="82%" cy="9%" r="45%"><stop offset="0" stop-color="#f43f5e" stop-opacity="0.35"/><stop offset="1" stop-color="#f43f5e" stop-opacity="0"/></radialGradient>
      <radialGradient id="teal" cx="8%" cy="90%" r="50%"><stop offset="0" stop-color="#2dd4bf" stop-opacity="0.2"/><stop offset="1" stop-color="#2dd4bf" stop-opacity="0"/></radialGradient>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#24162c"/><stop offset="1" stop-color="#0f0d18"/></linearGradient>
    </defs>
    <rect width="1080" height="1440" rx="56" fill="url(#bg)"/>
    <rect width="1080" height="1440" rx="56" fill="url(#pink)"/>
    <rect width="1080" height="1440" rx="56" fill="url(#teal)"/>
    <rect x="46" y="46" width="988" height="1348" rx="42" fill="none" stroke="#f43f5e" stroke-opacity="0.3"/>
    <text x="120" y="138" fill="#ffffff" fill-opacity="0.58" font-size="22" letter-spacing="6">LOVE RADAR</text>
    <text x="960" y="138" text-anchor="end" fill="#ffffff" fill-opacity="0.48" font-size="20" letter-spacing="4">恋爱人格</text>
    <circle cx="190" cy="300" r="76" fill="#f43f5e" fill-opacity="0.12" stroke="#f43f5e" stroke-opacity="0.45"/>
    <text x="190" y="322" text-anchor="middle" font-size="66">${escapeXml(symbol)}</text>
    <text x="120" y="480" fill="#fb7185" font-size="24">我的恋爱人格</text>
    <text x="120" y="548" fill="#ffffff" font-size="54" font-weight="700">${title}</text>
    <text x="120" y="596" fill="#ffffff" fill-opacity="0.42" font-size="20" letter-spacing="3">${escapeXml(englishName.toUpperCase())}</text>
    <text x="120" y="672" fill="#ffffff" fill-opacity="0.68" font-size="24">代表形象 · ${escapeXml(representative)}</text>
    ${keywordMarkup}
    <line x1="120" y1="936" x2="960" y2="936" stroke="#ffffff" stroke-opacity="0.14"/>
    <text x="120" y="1010" fill="#ffffff" font-size="34" font-weight="600">${quoteLines}</text>
    <text x="120" y="1302" fill="#ffffff" fill-opacity="0.38" font-size="18" letter-spacing="3">LOVE RADAR · 测测你的恋爱人格</text>
  </svg>`;
}

function wrapText(text: string, maxChars: number) {
  const lines: string[] = [];
  for (let index = 0; index < text.length; index += maxChars) lines.push(text.slice(index, index + maxChars));
  return lines.slice(0, 4);
}

function escapeXml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&apos;",
    '"': "&quot;",
  })[character] || character);
}
