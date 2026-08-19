import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const publicPages = [
  { path: "/", priority: 1 },
  { path: "/analyze", priority: 0.9 },
  { path: "/personality", priority: 0.75 },
  { path: "/astrology", priority: 0.75 },
  { path: "/en", priority: 0.9 },
  { path: "/en/analyze", priority: 0.85 },
  { path: "/en/personality", priority: 0.7 },
  { path: "/en/astrology", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicPages.map(({ path, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}

