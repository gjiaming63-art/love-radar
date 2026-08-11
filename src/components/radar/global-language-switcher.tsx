"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function GlobalLanguageSwitcher() {
  const pathname = usePathname() || "/";
  const isEnglish = pathname === "/en" || pathname.startsWith("/en/");
  const chinesePath = isEnglish ? pathname.replace(/^\/en(?=\/|$)/, "") || "/" : pathname;
  const englishPath = isEnglish ? pathname : pathname === "/" ? "/en" : `/en${pathname}`;

  return (
    <div className="fixed right-4 top-4 z-50 inline-flex items-center rounded-full border border-white/10 bg-black/60 p-1 text-xs shadow-lg backdrop-blur">
      <Link href={chinesePath} className={`rounded-full px-2.5 py-1 transition ${!isEnglish ? "bg-white/10 text-white" : "text-white/55 hover:text-white"}`} aria-current={!isEnglish ? "page" : undefined}>中</Link>
      <span className="text-white/25">/</span>
      <Link href={englishPath} className={`rounded-full px-2.5 py-1 transition ${isEnglish ? "bg-white/10 text-white" : "text-white/55 hover:text-white"}`} aria-current={isEnglish ? "page" : undefined}>EN</Link>
    </div>
  );
}
