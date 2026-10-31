export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function clampScore(value: unknown, fallback = 50) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

export function compactText(value: string, maxLength = 160) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  // For space-separated languages, end on a sentence or word boundary instead of mid-word.
  const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (sentenceEnd >= maxLength * 0.6) return cut.slice(0, sentenceEnd + 1);
  const space = cut.lastIndexOf(" ");
  if (space >= maxLength * 0.8) return `${cut.slice(0, space).replace(/[,;:\-–—]+$/, "")}...`;
  return `${cut}...`;
}
