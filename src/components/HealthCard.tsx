import { ShieldCheck, Info } from "lucide-react";
import { Panel } from "./Shared";
import { calculateHealth } from "../lib/health";
import type { Analysis } from "../types";
export function HealthCard({ analysis }: { analysis: Analysis }) {
  const health = calculateHealth(analysis, Date.parse(analysis.analyzedAt));
  return (
    <Panel
      title="仓库健康度"
      eyebrow="REPOSITORY HEALTH"
      icon={<ShieldCheck size={17} />}
      action={<span className="badge">参考指标</span>}
    >
      <div className="health-score">
        <div
          className="score-ring"
          style={{
            background: `conic-gradient(var(--accent) ${(health.score || 0) * 3.6}deg, var(--border) 0)`,
          }}
        >
          <div>
            <strong>{health.score ?? "—"}</strong>
            <span>/ 100</span>
          </div>
        </div>
        <span className="health-status">{health.label}</span>
      </div>
      <div className="health-factors">
        {health.factors.map((factor) => (
          <div key={factor.label} title={factor.detail}>
            <span>{factor.label}</span>
            <div className="factor-track">
              <i style={{ width: `${factor.score ?? 0}%` }} />
            </div>
            <strong>
              {factor.score === null ? "未知" : `${Math.round(factor.score)}`}
            </strong>
          </div>
        ))}
      </div>
      <p className="health-disclaimer">
        <Info size={13} />
        RepoLens 自定义指标，非 GitHub 官方评分。数据覆盖 {health.coverage}
        %，缺失项排除并按有效权重归一化。
      </p>
      <details className="chart-data">
        <summary>评分方法与数据</summary>
        {health.factors.map((factor) => (
          <p key={factor.label}>
            {factor.label}（权重 {factor.weight}%）：{factor.detail}
          </p>
        ))}
        <p>
          代码更新：≤30/90/180/365 天分别得 100/80/60/35 分，超过一年 10
          分。Issue 采用已关闭比例；无 Issue 时排除此项。README 和 License
          按是否存在计分；持续提交按活跃周比例。
        </p>
      </details>
    </Panel>
  );
}
