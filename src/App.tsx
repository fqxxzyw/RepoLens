import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Github,
  Sun,
  Moon,
  ScanSearch,
  Terminal,
  Download,
  RefreshCw,
  LogOut,
  FolderGit2,
  Check,
  CircleAlert,
  Sparkles,
  GitBranch,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { SearchBar } from "./components/SearchBar";
import { RepositoryOverview } from "./components/RepositoryOverview";
import { HealthCard } from "./components/HealthCard";
import { HistoryPanel } from "./components/HistoryPanel";
import { AccountPanel } from "./components/AccountPanel";
import { ExportReport } from "./components/ExportReport";
import { Skeleton } from "./components/Shared";
import { useAnalysis } from "./hooks/useAnalysis";
import { authEnabled, getProfile } from "./services/github";
import { exportReport } from "./lib/export";
import { clearPrivateLocalData } from "./lib/storage";
import type { Profile } from "./types";
const ReadmePreview = lazy(() =>
  import("./components/ReadmePreview").then((module) => ({
    default: module.ReadmePreview,
  })),
);
const LanguageChart = lazy(() =>
  import("./components/LanguageChart").then((module) => ({
    default: module.LanguageChart,
  })),
);
const ActivityChart = lazy(() =>
  import("./components/ActivityChart").then((module) => ({
    default: module.ActivityChart,
  })),
);
export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("repolens:theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(authEnabled);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const {
    data,
    loading,
    error,
    history,
    cached,
    storageWarning,
    analyze,
    updateHistory,
    reset,
  } = useAnalysis(!!profile);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("repolens:theme", theme);
    } catch {
      /* Theme still works in memory. */
    }
  }, [theme]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("auth_error")) {
      setAuthMessage(
        "GitHub 登录未完成。请重试，并检查 OAuth 配置或组织授权。",
      );
      window.history.replaceState(null, "", location.pathname);
    }
    if (!authEnabled) return;
    const controller = new AbortController();
    getProfile(controller.signal)
      .then(setProfile)
      .catch((error) => {
        if (!controller.signal.aborted)
          setAuthMessage(
            error instanceof Error ? error.message : "登录状态获取失败",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuthLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function login() {
    setAuthMessage("");
    if (!authEnabled) {
      setAuthMessage(
        "当前部署提供免登录的公开仓库分析。个人及私有仓库登录需要在 Vercel 配置 GitHub OAuth，详见 README。",
      );
      return;
    }
    try {
      const response = await fetch("/api/auth?action=availability");
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/json")
      )
        throw new Error("登录服务尚未配置，请在 Vercel 设置 OAuth 环境变量。");
      const availability = (await response.json()) as { configured?: boolean };
      if (!availability.configured)
        throw new Error("登录服务尚未配置，请在 Vercel 设置 OAuth 环境变量。");
      location.assign("/api/auth?action=login");
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "登录服务不可用");
    }
  }
  async function logout() {
    try {
      const response = await fetch("/api/auth?action=logout", {
        method: "POST",
      });
      if (!response.ok) throw new Error("退出失败，请重试。");
      setProfile(null);
      setAccountOpen(false);
      reset();
      clearPrivateLocalData();
      updateHistory([]);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "退出失败");
    }
  }
  async function download() {
    if (!reportRef.current || !data) return;
    setExporting(true);
    setExportMessage("");
    try {
      await exportReport(reportRef.current, data.repo.full_name);
      setExportMessage("PNG 报告已导出。");
    } catch {
      setExportMessage("导出失败，浏览器可能限制画布或图片资源。请重试。");
    } finally {
      setExporting(false);
    }
  }
  function select(name: string) {
    setExportMessage("");
    void analyze(name);
  }
  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          href={import.meta.env.BASE_URL}
          className="brand"
          aria-label="RepoLens 首页"
        >
          <span className="brand-icon">
            <ScanSearch size={23} />
          </span>
          <strong>
            Repo<span>Lens</span>
          </strong>
          <span className="brand-divider" />
          <span className="brand-subtitle">看见代码的全貌</span>
        </a>
        <nav aria-label="主导航">
          <a
            className="header-source"
            href="https://github.com/fqxxzyw/RepoLens"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github size={17} />
            <span>开源项目</span>
            <ArrowUpRight size={13} />
          </a>
          <button
            className="icon-button theme-button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "切换浅色主题" : "切换深色主题"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {profile ? (
            <>
              <button
                className="account-button"
                onClick={() => setAccountOpen(true)}
              >
                <FolderGit2 size={16} />
                <span>{profile.login}</span>
              </button>
              <button
                className="icon-button"
                aria-label="退出 GitHub 登录"
                onClick={() => void logout()}
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <button
              className="account-button"
              onClick={() => void login()}
              disabled={authLoading}
            >
              <Github size={16} />
              <span>{authLoading ? "检查登录…" : "GitHub 登录"}</span>
            </button>
          )}
        </nav>
      </header>
      <main>
        <motion.section
          className="hero"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="hero-badge">
            <span className="live-dot" />
            OPEN SOURCE, IN FOCUS <Sparkles size={12} />
          </div>
          <h1>
            每一个仓库，<span>都值得被读懂。</span>
          </h1>
          <p>
            从技术栈到维护状态，把复杂的代码仓库变成清晰的洞察。
            <br className="mobile-break" />
            输入一个链接，开始你的下一次探索。
          </p>
          <SearchBar loading={loading} onSearch={select} />
          <div className="search-hints">
            <span>
              <Terminal size={13} />
              试试看
            </span>
            {["facebook/react", "microsoft/vscode", "vitejs/vite"].map(
              (name) => (
                <button key={name} onClick={() => select(name)}>
                  {name}
                  <ArrowUpRight size={11} />
                </button>
              ),
            )}
          </div>
        </motion.section>
        {authMessage && (
          <div className="notice-banner" role="status">
            <CircleAlert size={18} />
            <span>{authMessage}</span>
            <button
              className="icon-button"
              aria-label="关闭登录提示"
              onClick={() => setAuthMessage("")}
            >
              ×
            </button>
          </div>
        )}
        {storageWarning && (
          <div className="notice-banner" role="status">
            浏览器存储不可用，历史和缓存仅在当前会话有效。
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <CircleAlert size={20} />
            <div>
              <strong>暂时无法完成分析</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
        {loading ? (
          <Skeleton />
        ) : data ? (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="report-toolbar">
              <div>
                <span className="live-dot" />
                {cached ? "已缓存的 GitHub 数据" : "来自 GitHub 的真实数据"}
                <span className="toolbar-time">
                  · {new Date(data.analyzedAt).toLocaleString("zh-CN")}
                </span>
              </div>
              <div>
                <button
                  className="secondary-button"
                  onClick={() => void analyze(data.repo.full_name, true)}
                >
                  <RefreshCw size={14} />
                  刷新
                </button>
                <button
                  className="secondary-button"
                  onClick={() => void download()}
                  disabled={exporting}
                >
                  <Download size={14} />
                  {exporting ? "正在导出…" : "导出 PNG"}
                </button>
              </div>
            </div>
            {exportMessage && (
              <p className="export-message" role="status">
                <Check size={14} />
                {exportMessage}
              </p>
            )}
            <RepositoryOverview repo={data.repo} />
            <div className="analysis-grid">
              <Suspense
                fallback={
                  <div className="panel resource-message">
                    正在加载语言图表…
                  </div>
                }
              >
                <LanguageChart resource={data.languages} />
              </Suspense>
              <Suspense
                fallback={
                  <div className="panel resource-message">
                    正在加载提交图表…
                  </div>
                }
              >
                <ActivityChart resource={data.activity} />
              </Suspense>
              <HealthCard analysis={data} />
            </div>
            <div className="bottom-grid">
              <Suspense
                fallback={
                  <div className="panel resource-message">
                    正在加载文档预览…
                  </div>
                }
              >
                <ReadmePreview analysis={data} />
              </Suspense>
              <HistoryPanel
                entries={history}
                onSelect={select}
                onChange={updateHistory}
              />
            </div>
            <ExportReport ref={reportRef} analysis={data} />
          </motion.div>
        ) : (
          <>
            <section className="empty-state">
              <div className="empty-visual">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="empty-lens">
                  <ScanSearch size={34} />
                </div>
                <span className="orbit-node node-code">
                  <Code2 size={17} />
                </span>
                <span className="orbit-node node-branch">
                  <GitBranch size={17} />
                </span>
                <span className="orbit-node node-health">
                  <ShieldCheck size={17} />
                </span>
              </div>
              <h2>你的仓库洞察，即将展开</h2>
              <p>
                无需 API Key，无需阅读成千上万行代码。
                <br />
                用真实数据，发现开源项目背后的故事。
              </p>
              <div className="feature-chips">
                <span>
                  <Code2 size={14} />
                  技术栈可视化
                </span>
                <span>
                  <GitBranch size={14} />
                  提交趋势
                </span>
                <span>
                  <ShieldCheck size={14} />
                  维护健康度
                </span>
              </div>
              <span className="empty-caption">
                NO GUESSWORK. JUST GITHUB DATA.
              </span>
            </section>
            {history.length > 0 && (
              <HistoryPanel
                entries={history}
                onSelect={select}
                onChange={updateHistory}
              />
            )}
          </>
        )}
      </main>
      <footer className="site-footer">
        <span>
          <ScanSearch size={15} />
          <strong>RepoLens</strong>
          <span className="footer-separator">/</span>让开源更易理解
        </span>
        <div>
          <span>Built with curiosity · MIT License</span>
          <a
            href="https://github.com/fqxxzyw/RepoLens"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github size={14} />
            GitHub
            <ArrowUpRight size={12} />
          </a>
        </div>
      </footer>
      {accountOpen && profile && (
        <AccountPanel onSelect={select} onClose={() => setAccountOpen(false)} />
      )}
    </div>
  );
}
