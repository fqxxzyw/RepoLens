import { describe, expect, it } from "vitest";
import {
  decodeBase64Utf8,
  languageColor,
  languagesToChart,
  safeLink,
  weeksToChart,
} from "../src/lib/transform";
describe("chart transformations", () => {
  it("sorts languages and calculates byte percentages", () => {
    const data = languagesToChart({
      CSS: 25,
      TypeScript: 75,
      Empty: 0,
      Invalid: -1,
    });
    expect(data.map((item) => [item.name, item.percent])).toEqual([
      ["TypeScript", 75],
      ["CSS", 25],
    ]);
    expect(data[0].color).toBe("#3178c6");
  });
  it("handles empty data without NaN", () =>
    expect(languagesToChart({})).toEqual([]));
  it("provides deterministic fallback colors", () =>
    expect(languageColor("Custom")).toBe(languageColor("Custom")));
  it("sorts UTC weeks and keeps the latest twelve", () => {
    const data = weeksToChart(
      Array.from({ length: 15 }, (_, i) => ({
        week: (15 - i) * 604800,
        total: i,
        days: [],
      })),
    );
    expect(data).toHaveLength(12);
    expect(data[0].timestamp).toBe(4 * 604800);
    expect(data[11].timestamp).toBe(15 * 604800);
  });
  it("decodes multilingual README content", () =>
    expect(
      decodeBase64Utf8(
        btoa(
          String.fromCharCode(...new TextEncoder().encode("你好 RepoLens 🚀")),
        ),
      ),
    ).toBe("你好 RepoLens 🚀"));
  it("resolves relative links", () =>
    expect(
      safeLink("./docs/start.md", "https://github.com/a/b/blob/main/README.md"),
    ).toBe("https://github.com/a/b/blob/main/docs/start.md"));
  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>1</script>",
    "file:///etc/passwd",
    "vbscript:x",
  ])("filters %s", (href) =>
    expect(safeLink(href, "https://github.com/a/b")).toBeUndefined(),
  );
});
