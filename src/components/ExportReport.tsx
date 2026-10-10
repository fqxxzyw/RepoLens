import { forwardRef } from "react";
import { languagesToChart } from "../lib/transform";
import { calculateHealth } from "../lib/health";
import type { Analysis } from "../types";
export const ExportReport = forwardRef<HTMLDivElement, { analysis: Analysis }>(
  function ExportReport({ analysis }, ref) {
    const { repo } = analysis;
    const health = calculateHealth(analysis, Date.parse(analysis.analyzedAt));
    const languages =
      analysis.languages.status === "ready"
        ? languagesToChart(analysis.languages.data)
        : [];
    return (
      <div className="export-offscreen" aria-hidden="true">
        <div className="export-report" ref={ref}>
          <header>
            <strong>◉ RepoLens</strong>
            <span>GITHUB REPOSITORY REPORT</span>
          </header>
          <div className="export-title">{repo.full_name}</div>
          <p>{repo.description || "暂无简介"}</p>
          <div className="export-stats">
            <div>
              <b>{repo.stargazers_count.toLocaleString()}</b>Stars
            </div>
            <div>
              <b>{repo.forks_count.toLocaleString()}</b>Forks
            </div>
            <div>
              <b>{repo.subscribers_count.toLocaleString()}</b>Watchers
            </div>
            <div>
              <b>
                {health.score ?? "—"} <small>/ 100</small>
              </b>
              健康度 · {health.label}
            </div>
          </div>
          <h3>语言组成 / LANGUAGE DISTRIBUTION</h3>
          {languages.length ? (
            <>
              <div className="export-language-bar">
                {languages.map((item) => (
                  <i
                    key={item.name}
                    style={{
                      background: item.color,
                      width: `${item.percent}%`,
                    }}
                  />
                ))}
              </div>
              <div className="export-legend">
                {languages.map((item) => (
                  <span key={item.name}>
                    <i style={{ background: item.color }} />
                    {item.name} {item.percent.toFixed(1)}%
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p>
              {analysis.languages.status === "ready"
                ? "暂无语言数据"
                : analysis.languages.message}
            </p>
          )}
          <h3>仓库健康度 / HEALTH SIGNALS</h3>
          <div className="export-factors">
            {health.factors.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <b>
                  {item.score === null
                    ? "数据未知"
                    : `${Math.round(item.score)} / 100`}
                </b>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
          <p className="export-disclaimer">
            RepoLens 自定义参考评分，非 GitHub 官方评分。有效数据权重{" "}
            {health.coverage}%，缺失项排除后归一化。
          </p>
          <footer>
            <span>
              数据来自 GitHub REST API ·{" "}
              {repo.private ? "私有仓库，请谨慎分享" : "公开仓库"}
            </span>
            <span>
              分析时间：{new Date(analysis.analyzedAt).toLocaleString("zh-CN")}
            </span>
          </footer>
        </div>
      </div>
    );
  },
);
