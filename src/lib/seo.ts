import type { Metadata } from "next";

export const siteUrl = "https://www.lovescannerai.com";
export const siteName = "Love Radar AI";
export const defaultOgImage = "/icon.png";

type Locale = "zh_CN" | "en_US";

type PageSeo = {
  title: string;
  description: string;
  path: string;
  locale?: Locale;
  keywords?: string[];
  languages?: Record<string, string>;
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
  locale = "zh_CN",
  keywords,
  languages,
}: PageSeo): Metadata {
  const url = absoluteUrl(path);

  return {
    title: {
      absolute: title,
    },
    description,
    keywords,
    alternates: {
      canonical: url,
      languages,
    },
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      url,
      locale,
      images: [
        {
          url: defaultOgImage,
          width: 1024,
          height: 1024,
          alt: "Love Radar AI",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultOgImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
  };
}

export function createNoIndexMetadata(title: string, description = "Private Love Radar AI page."): Metadata {
  return {
    title: {
      absolute: title,
    },
    description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}
