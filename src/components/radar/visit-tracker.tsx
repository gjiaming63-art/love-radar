"use client";

import { useEffect } from "react";

export function VisitTracker() {
  useEffect(() => {
    const path = window.location.pathname;
    const key = `love-radar-visit:${path}`;
    const lastTrackedAt = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - lastTrackedAt < 30 * 60 * 1000) return;
    sessionStorage.setItem(key, String(Date.now()));

    const source = new URLSearchParams(window.location.search).get("utm_source") || document.referrer || "direct";
    const payload = JSON.stringify({ eventName: "visit", source, path });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
