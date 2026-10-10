import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeRepository,
  apiError,
  GitHubError,
} from "../src/services/github";
afterEach(() => vi.unstubAllGlobals());
describe("GitHub service failures", () => {
  it("distinguishes limit responses and permissions", () => {
    expect(
      apiError(
        403,
        new Headers({
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1740000000",
        }),
      ).message,
    ).toContain("限流");
    expect(apiError(403, new Headers()).message).toContain("拒绝访问");
    expect(apiError(404, new Headers()).message).toContain("未找到");
  });
  it("fails a missing repository with a typed error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 404 })),
    );
    await expect(
      analyzeRepository("a", "b", new AbortController().signal, false),
    ).rejects.toBeInstanceOf(GitHubError);
  });
  it("surfaces network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    await expect(
      analyzeRepository("a", "b", new AbortController().signal, false),
    ).rejects.toThrow("网络连接失败");
  });
  it("preserves cancellation rather than presenting it as a network error", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );
    await expect(
      analyzeRepository("a", "b", controller.signal, false),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
  it("keeps optional API failures separate from a successful repository", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("/repos/a/b"))
          return new Response(
            JSON.stringify({
              full_name: "a/b",
              name: "b",
              owner: { login: "a" },
              stargazers_count: 1,
              forks_count: 0,
              subscribers_count: 0,
              open_issues_count: 0,
            }),
          );
        if (url.endsWith("/readme")) return new Response("{}", { status: 404 });
        if (url.endsWith("/languages")) return new Response("{}");
        return new Response("{}", { status: 403 });
      }),
    );
    const result = await analyzeRepository(
      "a",
      "b",
      new AbortController().signal,
      false,
    );
    expect(result.repo.full_name).toBe("a/b");
    expect(result.activity.status).toBe("error");
    expect(result.readme).toEqual({ status: "ready", data: null });
    expect(result.issues.status).toBe("error");
  });
  it("rejects malformed successful repository payloads without rendering a broken report", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              full_name: "a/b",
              owner: {},
              stargazers_count: 1,
            }),
          ),
        ),
    );
    await expect(
      analyzeRepository("a", "b", new AbortController().signal, false),
    ).rejects.toThrow("无法识别");
  });
});
