// Isolated browser fixtures exercise UI behavior; production never imports these data.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "playwright";
const port = 5183;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  "npm",
  ["run", "dev", "--", "--port", String(port), "--strictPort"],
  {
    stdio: "pipe",
    detached: process.platform !== "win32",
    env: { ...process.env, VITE_ENABLE_AUTH: "true" },
  },
);
let browser;
const errors = [];
function repo(name) {
  return {
    id: 1,
    name,
    full_name: `fixture-owner/${name}`,
    description: "Browser test fixture — not live GitHub data.",
    owner: {
      login: "fixture-owner",
      avatar_url: "",
      html_url: "https://github.com/fixture-owner",
    },
    html_url: `https://github.com/fixture-owner/${name}`,
    homepage: "https://example.com",
    stargazers_count: 1234,
    forks_count: 123,
    subscribers_count: 12,
    open_issues_count: 3,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: new Date().toISOString(),
    pushed_at: new Date().toISOString(),
    default_branch: "main",
    license: { name: "MIT", spdx_id: "MIT" },
    topics: ["testing", "typescript"],
    private: name === "private",
    archived: false,
    size: 100,
  };
}
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(origin)).ok) break;
    } catch {
      /* Wait for Vite. */
    }
    if (i === 59) throw new Error("Vite did not start");
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1040 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => errors.push(error.message));
  let signedIn = false;
  let listFailure = true;
  await page.route("**/api/auth?*", (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    if (action === "logout") {
      signedIn = false;
      return route.fulfill({ json: { ok: true } });
    }
    if (action === "me")
      return route.fulfill({
        status: signedIn ? 200 : 401,
        json: signedIn
          ? {
              login: "fixture-user",
              avatar_url: "",
              html_url: "https://github.com/fixture-user",
            }
          : { error: "Not signed in" },
      });
    return route.fulfill({
      status: 503,
      json: { error: "Unconfigured fixture service" },
    });
  });
  const handleGithub = async (route) => {
    const requestUrl = new URL(route.request().url());
    const url =
      requestUrl.pathname === "/api/github"
        ? new URL(requestUrl.searchParams.get("path"), "https://api.github.com")
        : requestUrl;
    const name = url.pathname.split("/")[3];
    let data;
    if (url.pathname === "/user/repos") {
      if (listFailure)
        return route.fulfill({
          status: 403,
          json: { error: "Fixture permission error" },
        });
      return route.fulfill({
        json: [
          {
            id: 7,
            full_name: "fixture-owner/private",
            private: true,
            description: "Private browser fixture",
          },
        ],
      });
    }
    if (name === "first" && url.pathname === "/repos/fixture-owner/first")
      await new Promise((resolve) => setTimeout(resolve, 700));
    if (name === "missing")
      return route.fulfill({ status: 404, json: { message: "Not Found" } });
    if (name === "limited")
      return route.fulfill({
        status: 403,
        headers: {
          "access-control-expose-headers":
            "x-ratelimit-remaining,x-ratelimit-reset",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": String(Math.floor(Date.now() / 1000) + 3600),
        },
        json: { message: "API rate limit exceeded" },
      });
    if (url.pathname.endsWith("/languages"))
      data = { TypeScript: 7500, CSS: 2500 };
    else if (url.pathname.endsWith("/stats/commit_activity")) {
      if (name === "pending") return route.fulfill({ status: 202, json: {} });
      data = Array.from({ length: 52 }, (_, i) => ({
        week: Math.floor(Date.now() / 1000) - (52 - i) * 604800,
        total: i % 7,
        days: [1, 0, 0, 0, 0, 0, 0],
      }));
    } else if (url.pathname.endsWith("/readme"))
      data = {
        encoding: "base64",
        path: "README.md",
        html_url: `https://github.com/fixture-owner/${name}/blob/main/README.md`,
        content: Buffer.from(
          '# Browser fixture documentation\n\n你好，RepoLens。\n\n```ts\nconst result = true;\n```\n\n[safe relative](./docs/start.md)\n\n[unsafe](javascript:alert(1))\n\n<script>window.__xss = true</script>\n<img src=x onerror="window.__xss=true">',
        ).toString("base64"),
      };
    else if (url.pathname === "/search/issues")
      data = {
        total_count: url.searchParams.get("q").includes("state:closed")
          ? 20
          : 4,
        incomplete_results: false,
      };
    else data = repo(name);
    return route.fulfill({ status: 200, json: data });
  };
  await page.route("https://api.github.com/**", handleGithub);
  await page.route("**/api/github?*", handleGithub);
  await page.goto(origin);
  await page.getByRole("heading", { name: "你的仓库洞察，即将展开" }).waitFor();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/home-dark.png", fullPage: true });
  await page.getByRole("button", { name: "切换浅色主题" }).click();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "light",
  );
  await page.screenshot({
    path: "test-results/home-light.png",
    fullPage: true,
  });
  await page.reload();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "light",
  );
  await page.getByRole("button", { name: "切换深色主题" }).click();
  const search = async (name) => {
    await page.getByLabel("GitHub 仓库地址").fill(name);
    await page.getByRole("button", { name: "分析仓库" }).click();
  };
  await search("not-a-repository");
  await page
    .getByRole("alert")
    .filter({ hasText: "请输入 owner/repo" })
    .waitFor();
  await search("fixture-owner/example");
  await page
    .getByRole("heading", { name: "fixture-owner / example", exact: true })
    .waitFor();
  await page
    .getByRole("heading", { name: "Browser fixture documentation" })
    .waitFor();
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(
    await page
      .getByRole("link", { name: "safe relative" })
      .getAttribute("href"),
    "https://github.com/fixture-owner/example/blob/main/docs/start.md",
  );
  assert.equal(
    await page
      .locator(".markdown a")
      .filter({ hasText: "unsafe" })
      .getAttribute("href"),
    null,
  );
  await page.getByText("75.0%", { exact: true }).waitFor();
  assert.match(
    await page.evaluate(() => localStorage.getItem("repolens:history:v1")),
    /fixture-owner\/example/,
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG" }).click();
  const download = await downloadEvent;
  await download.saveAs("test-results/report.png");
  const png = await readFile("test-results/report.png");
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(png.length > 20000, "PNG must contain a rendered report");
  console.log(
    "PASS: report, Markdown security, theme persistence, local history, PNG export",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "test-results/mobile-report.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "切换浅色主题" }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.getByRole("button", { name: "切换深色主题" }).click();
  await search("fixture-owner/first");
  await search("fixture-owner/second");
  await page
    .getByRole("heading", { name: "fixture-owner / second", exact: true })
    .waitFor();
  await page.waitForTimeout(900);
  assert.equal(
    await page
      .getByRole("heading", { name: "fixture-owner / first", exact: true })
      .count(),
    0,
  );
  await search("fixture-owner/private");
  await page
    .getByRole("heading", { name: "fixture-owner / private", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(() =>
      localStorage
        .getItem("repolens:history:v1")
        .includes("fixture-owner/private"),
    ),
    false,
  );
  assert.equal(
    await page.evaluate(() =>
      localStorage
        .getItem("repolens:cache:v1")
        .includes("fixture-owner/private"),
    ),
    false,
  );
  await search("fixture-owner/pending");
  await page
    .getByText(
      "GitHub 正在计算提交统计（202）。请稍后点击刷新，暂无可绘制的数据。",
    )
    .waitFor({ timeout: 15000 });
  await search("fixture-owner/missing");
  await page.getByRole("alert").filter({ hasText: "未找到仓库" }).waitFor();
  await search("fixture-owner/limited");
  await page.getByRole("alert").filter({ hasText: "限流" }).waitFor();
  await page
    .getByRole("button", { name: "删除 fixture-owner/example 的记录" })
    .click();
  assert.equal(
    await page.evaluate(() =>
      localStorage
        .getItem("repolens:history:v1")
        .includes("fixture-owner/example"),
    ),
    false,
  );
  await page.getByRole("button", { name: "清空历史记录" }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("repolens:history:v1")),
    "[]",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: mobile themes, request races, private data isolation, 202/404/rate limits, history deletion",
  );
  signedIn = true;
  await page.reload();
  await page.getByRole("button", { name: "fixture-user" }).click();
  await page.getByRole("dialog").getByRole("alert").waitFor();
  listFailure = false;
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /fixture-owner\/private/ })
    .click();
  await page
    .getByRole("heading", { name: "fixture-owner / private", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("repolens:history:v1")),
    "[]",
  );
  await page.getByRole("button", { name: "退出 GitHub 登录" }).click();
  await page.getByRole("heading", { name: "你的仓库洞察，即将展开" }).waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("repolens:cache:v1")),
    null,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: authenticated repository picker, retry, private proxy analysis and logout (isolated fixtures)",
  );
} finally {
  await browser?.close();
  if (process.platform === "win32") server.kill();
  else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      /* Already stopped. */
    }
  }
}
