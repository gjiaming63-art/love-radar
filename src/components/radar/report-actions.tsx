"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ImageDown, Loader2, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getChatSpotlights, getRelationshipMeters, getReportInsight } from "@/lib/report-insights";
import type { LoveReport } from "@/types/report";

export function ReportActions({ report }: { report: LoveReport & { id: string } }) {
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const shareSvg = useMemo(() => buildShareSvg(report), [report]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function downloadCard() {
    setSaving(true);
    setMessage("");

    try {
      const blob = await renderSharePng(shareSvg);
      if (!blob) {
        setMessage("图片生成失败，请稍后重试。");
        return;
      }

      const fileName = `love-radar-${report.id}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "恋爱雷达报告",
          text: report.shareCardText || report.summary,
        });
        setMessage("已打开系统分享面板，可保存到相册或发送给朋友。");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      setPreviewUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return objectUrl;
      });

      const link = document.createElement("a");
      link.download = fileName;
      link.href = objectUrl;
      link.rel = "noopener";
      link.click();
      setMessage("如果手机没有自动下载，请长按下方图片保存到相册。");
    } catch {
      setMessage("当前浏览器限制了保存动作，请长按下方预览图保存。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const deleteToken = localStorage.getItem(`love-radar-delete:${report.id}`) ?? "";
    if (!deleteToken) {
      setMessage("只有生成报告的这台设备拥有删除凭证。");
      return;
    }
    setDeleting(true);
    setMessage("");
    const response = await fetch(`/api/reports/${report.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteToken }),
    });
    if (response.ok) {
      localStorage.removeItem(`love-radar-delete:${report.id}`);
      setMessage("报告已删除。");
      window.location.href = "/analyze";
      return;
    }
    setMessage("删除失败，凭证可能不匹配。");
    setDeleting(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>分享卡片</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="overflow-hidden rounded-lg border border-border bg-background"
          dangerouslySetInnerHTML={{ __html: shareSvg }}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={downloadCard} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            保存/分享图片
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            删除报告
          </Button>
        </div>

        <div className="rounded-md border border-accent/25 bg-accent/10 p-3 text-xs leading-6 text-muted-foreground">
          <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
            <Share2 className="h-4 w-4 text-accent" />
            手机保存提示
          </div>
          微信、Safari 等移动浏览器经常会拦截自动下载。点“保存/分享图片”后，如果没有弹出保存面板，请长按下方生成的图片保存到相册。
        </div>

        {previewUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <ImageDown className="h-4 w-4 text-primary" />
              长按这张图片保存
            </div>
            <img
              src={previewUrl}
              alt="恋爱雷达分享卡片"
              className="w-full rounded-lg border border-border bg-background"
            />
          </div>
        ) : null}

        {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

function renderSharePng(svg: string) {
  return new Promise<Blob | null>((resolve) => {
    const image = new Image();
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1440;
      const context = canvas.getContext("2d");
      if (!context) {
        resolve(null);
        return;
      }
      context.drawImage(image, 0, 0);
      canvas.toBlob((blob) => resolve(blob), "image/png", 0.95);
    };
    image.onerror = () => resolve(null);
    image.src = svgUrl;
  });
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, max = 18) {
  const chars = Array.from(text);
  const lines: string[] = [];
  for (let index = 0; index < chars.length; index += max) {
    lines.push(chars.slice(index, index + max).join(""));
  }
  return lines.slice(0, 4);
}

function buildShareSvg(report: LoveReport & { id: string }) {
  const insight = getReportInsight(report);
  const meters = getRelationshipMeters(report).slice(0, 3);
  const spotlight = getChatSpotlights(report)[0];
  const tags = [insight.type, ...report.riskTags].slice(0, 4);
  const verdictLines = wrapText(insight.verdict, 16);
  const spotlightLines = wrapText(spotlight.quote, 17).slice(0, 2);
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1440" width="100%" height="100%" role="img" aria-label="恋爱雷达分享卡片">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#180b1f"/>
      <stop offset="0.52" stop-color="#100b18"/>
      <stop offset="1" stop-color="#161326"/>
    </linearGradient>
    <radialGradient id="glow" cx="30%" cy="12%" r="70%">
      <stop offset="0" stop-color="#fb7185" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#fb7185" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1440" fill="url(#bg)"/>
  <rect width="1080" height="1440" fill="url(#glow)"/>
  <g opacity="0.14">
    ${Array.from({ length: 22 }, (_, i) => `<line x1="${i * 52}" y1="0" x2="${i * 52}" y2="1440" stroke="#fff"/>`).join("")}
    ${Array.from({ length: 29 }, (_, i) => `<line x1="0" y1="${i * 52}" x2="1080" y2="${i * 52}" stroke="#fff"/>`).join("")}
  </g>
  <circle cx="540" cy="500" r="235" fill="none" stroke="#fb7185" stroke-width="2" opacity="0.38"/>
  <circle cx="540" cy="500" r="160" fill="none" stroke="#2dd4bf" stroke-width="2" opacity="0.22"/>
  <text x="80" y="108" fill="#fda4af" font-size="34" font-family="Arial, sans-serif" font-weight="700">LOVE RADAR</text>
  <text x="80" y="174" fill="#fff" font-size="62" font-family="Arial, sans-serif" font-weight="800">${escapeXml(insight.title)}</text>
  <text x="80" y="240" fill="#a1a1aa" font-size="30" font-family="Arial, sans-serif">${escapeXml(report.riskLevel)} · ${escapeXml(report.relationshipStage)}</text>
  <text x="540" y="520" fill="#fb7185" font-size="198" font-family="Arial, sans-serif" font-weight="900" text-anchor="middle">${report.overallScore}</text>
  <text x="540" y="580" fill="#fff" font-size="34" font-family="Arial, sans-serif" text-anchor="middle">综合评分</text>
  ${tags
    .map((tag, index) => {
      const x = 80 + (index % 2) * 470;
      const y = 705 + Math.floor(index / 2) * 86;
      return `<rect x="${x}" y="${y}" width="410" height="56" rx="28" fill="#fb7185" opacity="0.16" stroke="#fb7185" stroke-opacity="0.45"/>
<text x="${x + 205}" y="${y + 37}" fill="#fecdd3" font-size="27" font-family="Arial, sans-serif" text-anchor="middle">${escapeXml(tag)}</text>`;
    })
    .join("")}
  <rect x="80" y="895" width="920" height="210" rx="28" fill="#ffffff" opacity="0.07" stroke="#ffffff" stroke-opacity="0.12"/>
  <text x="122" y="958" fill="#fff" font-size="34" font-family="Arial, sans-serif" font-weight="700">核心判词</text>
  ${verdictLines
    .slice(0, 3)
    .map(
      (line, index) =>
        `<text x="122" y="${1018 + index * 42}" fill="#fff" font-size="30" font-family="Arial, sans-serif">${escapeXml(line)}</text>`,
    )
    .join("")}
  <text x="80" y="1160" fill="#fda4af" font-size="30" font-family="Arial, sans-serif" font-weight="700">关系进度</text>
  ${meters
    .map((meter, index) => {
      const y = 1205 + index * 58;
      return `<text x="80" y="${y}" fill="#d4d4d8" font-size="25" font-family="Arial, sans-serif">${escapeXml(meter.label)}</text>
<rect x="235" y="${y - 22}" width="560" height="22" rx="11" fill="#ffffff" opacity="0.12"/>
<rect x="235" y="${y - 22}" width="${Math.round(560 * (meter.value / 100))}" height="22" rx="11" fill="${meter.tone === "safe" ? "#2dd4bf" : "#fb7185"}" opacity="0.86"/>
<text x="830" y="${y}" fill="#fda4af" font-size="25" font-family="Arial, sans-serif" font-weight="700">${meter.value}%</text>`;
    })
    .join("")}
  <text x="80" y="1360" fill="#a1a1aa" font-size="24" font-family="Arial, sans-serif">名场面：${escapeXml(spotlightLines.join(""))}</text>
  <text x="80" y="1400" fill="#52525b" font-size="22" font-family="Arial, sans-serif">AI 生成，仅供娱乐和沟通参考 · 请先打码敏感隐私再分享</text>
</svg>`;
}
