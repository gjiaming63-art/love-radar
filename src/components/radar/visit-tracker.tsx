"use client";

import { useEffect } from "react";

export function VisitTracker() {
  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get("utm_source") || document.referrer || "direct";
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName: "visit", source }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
