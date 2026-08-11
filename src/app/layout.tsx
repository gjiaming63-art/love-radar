import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { VisitTracker } from "@/components/radar/visit-tracker";
import { GlobalLanguageSwitcher } from "@/components/radar/global-language-switcher";
import "./globals.css";

export const metadata: Metadata = {
  title: "恋爱雷达 Love Radar",
  description: "上传聊天截图，生成可分享的 AI 恋爱风险报告。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#100b18",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        {children}
        <GlobalLanguageSwitcher />
        <VisitTracker />
        <Analytics />
      </body>
    </html>
  );
}
