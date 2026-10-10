import {
  Star,
  GitFork,
  Eye,
  CircleDot,
  ExternalLink,
  GitBranch,
  Scale,
  CalendarDays,
  Lock,
  Archive,
  ArrowUpRight,
} from "lucide-react";
import type { Repository } from "../types";
import { formatNumber, safeLink } from "../lib/transform";
export function RepositoryOverview({ repo }: { repo: Repository }) {
  const stats = [
    {
      label: "Stars",
      value: repo.stargazers_count,
      icon: Star,
      note: "开发者的认可",
    },
    {
      label: "Forks",
      value: repo.forks_count,
      icon: GitFork,
      note: "社区的探索与贡献",
    },
    {
      label: "Watchers",
      value: repo.subscribers_count,
      icon: Eye,
      note: "订阅仓库动态",
    },
    {
      label: "Open Issues + PRs",
      value: repo.open_issues_count,
      icon: CircleDot,
      note: "GitHub 汇总未关闭数量",
    },
  ];
  const homepage = safeLink(repo.homepage || undefined, repo.html_url);
  return (
    <>
      <section className="panel repository-card">
        <div className="repo-main">
          <div className="repo-avatar" aria-hidden="true">
            {repo.owner.login.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="repo-kicker">
              REPOSITORY OVERVIEW{" "}
              <span className="visibility">
                {repo.private ? (
                  <Lock size={11} />
                ) : (
                  <span className="live-dot" />
                )}
                {repo.private ? "私有仓库" : "公开仓库"}
                {repo.archived && (
                  <>
                    <Archive size={11} />
                    已归档
                  </>
                )}
              </span>
            </div>
            <h2 className="repo-name">
              <span>{repo.owner.login} / </span>
              {repo.name}
            </h2>
            <p className="repo-description">
              {repo.description || "此仓库尚未添加简介。"}
            </p>
            <div className="topics">
              {repo.topics?.slice(0, 6).map((topic) => (
                <span key={topic}>{topic}</span>
              ))}
            </div>
          </div>
          <a
            className="github-link"
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="repo-meta">
          <span>
            <GitBranch size={14} />
            {repo.default_branch}
          </span>
          <span>
            <Scale size={14} />
            {repo.license?.spdx_id || "未识别许可证"}
          </span>
          <span>
            <CalendarDays size={14} />
            创建于 {new Date(repo.created_at).toLocaleDateString("zh-CN")}
          </span>
          <span>
            更新于 {new Date(repo.updated_at).toLocaleDateString("zh-CN")}
          </span>
          {homepage && (
            <a href={homepage} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} />
              项目主页
            </a>
          )}
          <a
            href={repo.owner.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="owner-link"
          >
            <img
              src={repo.owner.avatar_url}
              alt={`${repo.owner.login} 的头像`}
              crossOrigin="anonymous"
            />
            {repo.owner.login}
          </a>
        </div>
      </section>
      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, note }) => (
          <div key={label} className="panel stat-card">
            <div className="stat-top">
              <span>{label}</span>
              <Icon size={19} />
            </div>
            <strong title={value.toLocaleString()}>
              {formatNumber(value)}
            </strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
    </>
  );
}
