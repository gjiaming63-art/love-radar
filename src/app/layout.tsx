import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { VisitTracker } from "@/components/radar/visit-tracker";
import { GlobalLanguageSwitcher } from "@/components/radar/global-language-switcher";
import { siteName, siteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "恋爱雷达 Love Radar | AI 恋爱聊天分析",
    template: "%s | Love Radar AI",
  },
  description:
    "恋爱雷达 Love Radar AI 可以分析聊天记录与聊天截图，识别关系信号、互动模式和恋爱风险，生成适合分享的 AI 恋爱分析报告。",
  alternates: {
    canonical: siteUrl,
    languages: {
      "zh-CN": "/",
      "en-US": "/en",
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? {
          "msvalidate.01": process.env.BING_SITE_VERIFICATION,
        }
      : undefined,
  },
  openGraph: {
    type: "website",
    siteName,
    title: "恋爱雷达 Love Radar | AI 恋爱聊天分析",
    description:
      "上传聊天记录或截图，让 AI 帮你看懂关系信号、回复模式、红旗证据和下一步建议。",
    url: siteUrl,
    locale: "zh_CN",
    alternateLocale: ["en_US"],
    images: [
      {
        url: "/icon.png",
        width: 1024,
        height: 1024,
        alt: "Love Radar AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "恋爱雷达 Love Radar | AI 恋爱聊天分析",
    description: "AI relationship and chat analysis for clearer relationship signals.",
    images: ["/icon.png"],
  },
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
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: siteUrl,
      inLanguage: ["zh-CN", "en-US"],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: siteName,
      url: siteUrl,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      description:
        "Love Radar AI analyzes relationship conversations, chat screenshots, love personality patterns, and relationship astrology for entertainment and communication reference.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ];

  return (
    <html lang="zh-CN" className="dark">
      <body>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        {children}
        <GlobalLanguageSwitcher />
        <VisitTracker />
        <Analytics />
      </body>
    </html>
  );
}
