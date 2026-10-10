import { describe, expect, it } from "vitest";
import { calculateHealth } from "../src/lib/health";
import type { Analysis } from "../src/types";
const now = Date.UTC(2025, 0, 15);
const baseline: Analysis = {
  repo: {
    id: 1,
    name: "project",
    full_name: "owner/project",
    description: null,
    owner: {
      login: "owner",
      avatar_url: "",
      html_url: "https://github.com/owner",
    },
    html_url: "https://github.com/owner/project",
    homepage: null,
    stargazers_count: 0,
    forks_count: 0,
    subscribers_count: 0,
    open_issues_count: 0,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
    pushed_at: new Date(now).toISOString(),
    default_branch: "main",
    license: { name: "MIT", spdx_id: "MIT" },
    topics: [],
    private: false,
    archived: false,
    size: 1,
  },
  readme: {
    status: "ready",
    data: { content: "# Docs", path: "README.md", html_url: "" },
  },
  languages: { status: "ready", data: { TypeScript: 100 } },
  analyzedAt: new Date(now).toISOString(),
  issues: { status: "ready", data: { open: 0, closed: 10 } },
  activity: {
    status: "ready",
    data: Array.from({ length: 12 }, (_, index) => ({
      week: index,
      total: 2,
      days: [],
    })),
  },
};
describe("health score", () => {
  it("scores all healthy signals at 100", () =>
    expect(calculateHealth(baseline, now)).toMatchObject({
      score: 100,
      coverage: 100,
    }));
  it("excludes unavailable data instead of treating it as zero", () => {
    const result = calculateHealth(
      {
        ...baseline,
        activity: { status: "pending", message: "202" },
        issues: { status: "error", message: "403" },
      },
      now,
    );
    expect(result.score).toBe(100);
    expect(result.coverage).toBe(60);
  });
  it("treats confirmed missing README as zero", () =>
    expect(
      calculateHealth(
        { ...baseline, readme: { status: "ready", data: null } },
        now,
      ).score,
    ).toBe(80));
  it("does not reward or punish repositories with no issues", () =>
    expect(
      calculateHealth(
        {
          ...baseline,
          issues: { status: "ready", data: { open: 0, closed: 0 } },
        },
        now,
      ).coverage,
    ).toBe(80));
  it("measures actual active weeks, not commit volume", () => {
    const result = calculateHealth(
      {
        ...baseline,
        activity: {
          status: "ready",
          data:
            baseline.activity.status === "ready"
              ? baseline.activity.data.map((week, i) => ({
                  ...week,
                  total: i < 6 ? 0 : 10,
                }))
              : [],
        },
      },
      now,
    );
    expect(result.score).toBe(90);
  });
  it("degrades stale code and absent license while keeping scores bounded", () => {
    const result = calculateHealth(
      {
        ...baseline,
        repo: {
          ...baseline.repo,
          pushed_at: new Date(now - 400 * 86400000).toISOString(),
          license: null,
        },
      },
      now,
    );
    expect(result.score).toBe(63);
  });
});
