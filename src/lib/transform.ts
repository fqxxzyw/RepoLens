import type { Week } from "../types";
const colors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572a5",
  Go: "#00add8",
  Rust: "#dea584",
  Java: "#b07219",
  HTML: "#e34c26",
  CSS: "#a855f7",
  Vue: "#41b883",
  Shell: "#89e051",
  Ruby: "#701516",
  C: "#8d95a7",
  "C++": "#f34b7d",
  Swift: "#f05138",
  Kotlin: "#a97bff",
  PHP: "#4f5d95",
  Dart: "#00b4ab",
};
export function languageColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return colors[name] || `hsl(${hash % 360}, 60%, 60%)`;
}
export function languagesToChart(languages: Record<string, number>) {
  const entries = Object.entries(languages).filter(
    ([, bytes]) => Number.isFinite(bytes) && bytes > 0,
  );
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes]) => ({
      name,
      bytes,
      percent: (bytes / total) * 100,
      color: languageColor(name),
    }));
}
export function weeksToChart(weeks: Week[]) {
  return [...weeks]
    .sort((a, b) => a.week - b.week)
    .slice(-12)
    .map((item) => ({
      date: new Date(item.week * 1000).toISOString().slice(5, 10),
      commits: item.total,
      timestamp: item.week,
    }));
}
export function decodeBase64Utf8(content: string): string {
  const bytes = Uint8Array.from(atob(content.replace(/\s/g, "")), (char) =>
    char.charCodeAt(0),
  );
  return new TextDecoder().decode(bytes);
}
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
export function safeLink(
  href: string | undefined,
  base: string,
): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href, base);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
