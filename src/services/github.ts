import type {
  Analysis,
  IssueCounts,
  PersonalRepo,
  Profile,
  Readme,
  Repository,
  Resource,
  Week,
} from "../types";
import { decodeBase64Utf8 } from "../lib/transform";
const API = import.meta.env.VITE_GITHUB_API_URL || "https://api.github.com";
export const authEnabled = import.meta.env.VITE_ENABLE_AUTH === "true";
export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryAt?: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}
export function apiError(status: number, headers: Headers): GitHubError {
  const reset = headers.get("x-ratelimit-reset");
  const retryAfter = headers.get("retry-after");
  if (
    status === 429 ||
    (status === 403 &&
      (headers.get("x-ratelimit-remaining") === "0" || retryAfter))
  ) {
    const date = reset
      ? new Date(Number(reset) * 1000)
      : retryAfter && /^\d+$/.test(retryAfter)
        ? new Date(Date.now() + Number(retryAfter) * 1000)
        : null;
    return new GitHubError(
      "GitHub API 请求已限流，请稍后重试。登录通常可提高额度。",
      status,
      date && Number.isFinite(date.getTime())
        ? date.toLocaleTimeString("zh-CN")
        : undefined,
    );
  }
  const messages: Record<number, string> = {
    401: "登录已过期，请重新登录 GitHub。",
    403: "GitHub 拒绝访问，可能需要组织授权、额外权限或稍后重试。",
    404: "未找到仓库，或当前账号无权访问该私有仓库。",
    409: "仓库为空，尚无可分析的提交。",
    422: "GitHub 无法处理这次请求。",
    503: "服务暂不可用，请稍后重试或检查登录服务配置。",
  };
  return new GitHubError(
    messages[status] || `GitHub 请求失败（${status}），请稍后重试。`,
    status,
  );
}
async function request<T>(
  path: string,
  signal: AbortSignal,
  authenticated: boolean,
): Promise<{ data: T; status: number }> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const url = authenticated
      ? `/api/github?path=${encodeURIComponent(path)}`
      : `${API}${path}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
      credentials: authenticated ? "same-origin" : "omit",
    });
    if (!response.ok) throw apiError(response.status, response.headers);
    if (response.status === 202 || response.status === 204)
      return { data: undefined as T, status: response.status };
    return { data: (await response.json()) as T, status: response.status };
  } catch (error) {
    if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
    if (error instanceof GitHubError) throw error;
    throw new GitHubError(
      controller.signal.aborted
        ? "请求超时，请重试。"
        : "网络连接失败，请检查网络后重试。",
      0,
    );
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}
function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Cancelled", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
async function resource<T>(
  load: () => Promise<Resource<T>>,
  signal: AbortSignal,
): Promise<Resource<T>> {
  try {
    return await load();
  } catch (error) {
    if (signal.aborted) throw error;
    return {
      status:
        error instanceof GitHubError && [404, 409].includes(error.status)
          ? "unavailable"
          : "error",
      message: error instanceof Error ? error.message : "数据暂不可用",
    };
  }
}
export async function analyzeRepository(
  owner: string,
  name: string,
  signal: AbortSignal,
  authenticated: boolean,
): Promise<Analysis> {
  const fullName = `${owner}/${name}`;
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const get = <T>(path: string) => request<T>(path, signal, authenticated);
  const { data: repo } = await get<Repository>(base);
  if (
    !repo?.full_name ||
    typeof repo.name !== "string" ||
    typeof repo.owner?.login !== "string" ||
    ![
      repo.stargazers_count,
      repo.forks_count,
      repo.subscribers_count,
      repo.open_issues_count,
    ].every((value) => Number.isFinite(value) && value >= 0) ||
    (repo.topics !== undefined &&
      (!Array.isArray(repo.topics) ||
        !repo.topics.every((topic) => typeof topic === "string")))
  )
    throw new GitHubError("GitHub 返回了无法识别的仓库数据。", 0);
  const [languages, activity, readme, issues] = await Promise.all([
    resource<Record<string, number>>(async () => {
      const { data } = await get<Record<string, number>>(`${base}/languages`);
      if (
        !data ||
        Array.isArray(data) ||
        typeof data !== "object" ||
        !Object.values(data).every(
          (value) =>
            typeof value === "number" && Number.isFinite(value) && value >= 0,
        )
      )
        throw new GitHubError("GitHub 返回了无法识别的语言数据。", 0);
      return { status: "ready", data };
    }, signal),
    resource<Week[]>(async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await get<Week[]>(`${base}/stats/commit_activity`);
        if (result.status === 200 && Array.isArray(result.data)) {
          if (
            !result.data.every(
              (week) =>
                week &&
                Number.isFinite(week.week) &&
                Number.isInteger(week.total) &&
                week.total >= 0,
            )
          )
            throw new GitHubError("GitHub 返回了无法识别的提交数据。", 0);
          return { status: "ready", data: result.data };
        }
        if (result.status !== 202)
          return {
            status: "unavailable",
            message:
              "GitHub 未提供提交统计；空仓库或大型仓库可能不支持此数据。",
          };
        if (attempt < 2) await delay(2000 * (attempt + 1), signal);
      }
      return {
        status: "pending",
        message:
          "GitHub 正在计算提交统计（202）。请稍后点击刷新，暂无可绘制的数据。",
      };
    }, signal),
    resource<Readme | null>(async () => {
      try {
        const { data } = await get<Readme & { encoding: string }>(
          `${base}/readme`,
        );
        if (data.encoding !== "base64" || !data.content)
          return {
            status: "unavailable",
            message: "README 过大或编码不受支持，请在 GitHub 查看。",
          };
        const content = decodeBase64Utf8(data.content);
        if (content.length > 500000)
          return {
            status: "unavailable",
            message: "README 超过预览大小限制，请在 GitHub 查看。",
          };
        return {
          status: "ready",
          data: { content, path: data.path, html_url: data.html_url },
        };
      } catch (error) {
        if (error instanceof GitHubError && error.status === 404)
          return { status: "ready", data: null };
        throw error;
      }
    }, signal),
    resource<IssueCounts>(async () => {
      const results = [];
      for (const state of ["open", "closed"]) {
        const { data } = await get<{
          total_count: number;
          incomplete_results: boolean;
        }>(
          `/search/issues?q=${encodeURIComponent(`repo:${fullName} is:issue state:${state}`)}&per_page=1`,
        );
        if (
          !data ||
          data.incomplete_results ||
          !Number.isInteger(data.total_count) ||
          data.total_count < 0
        )
          return {
            status: "unavailable",
            message: "GitHub Issue 搜索统计不完整，评分将排除此项。",
          };
        results.push(data.total_count);
      }
      return {
        status: "ready",
        data: { open: results[0], closed: results[1] },
      };
    }, signal),
  ]);
  return {
    repo,
    languages,
    activity,
    readme,
    issues,
    analyzedAt: new Date().toISOString(),
  };
}
export async function getProfile(signal: AbortSignal): Promise<Profile | null> {
  const response = await fetch("/api/auth?action=me", {
    signal,
    credentials: "same-origin",
  });
  if (response.status === 401) return null;
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error(
      "登录服务未配置，请使用公开仓库分析，或在 Vercel 配置 OAuth。",
    );
  return response.json() as Promise<Profile>;
}
export async function getPersonalRepos(
  page: number,
  signal: AbortSignal,
): Promise<PersonalRepo[]> {
  const data = (
    await request<PersonalRepo[]>(
      `/user/repos?sort=updated&per_page=30&page=${page}&affiliation=owner,collaborator,organization_member`,
      signal,
      true,
    )
  ).data;
  if (
    !Array.isArray(data) ||
    !data.every(
      (repo) =>
        repo &&
        typeof repo.full_name === "string" &&
        Number.isFinite(repo.id) &&
        typeof repo.private === "boolean" &&
        (repo.description === null || typeof repo.description === "string"),
    )
  )
    throw new GitHubError("GitHub 返回了无法识别的个人仓库列表。", 0);
  return data;
}
