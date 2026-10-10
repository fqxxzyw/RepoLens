import type { Analysis } from "../types";
export interface HealthFactor {
  label: string;
  weight: number;
  score: number | null;
  detail: string;
}
export function calculateHealth(analysis: Analysis, now = Date.now()) {
  const { repo, issues, readme, activity } = analysis;
  const age = Math.max(0, (now - Date.parse(repo.pushed_at)) / 86400000);
  const activityScore =
    activity.status === "ready"
      ? (() => {
          const recent = activity.data.slice(-12);
          return recent.length
            ? (recent.filter((week) => week.total > 0).length / recent.length) *
                100
            : null;
        })()
      : null;
  const factors: HealthFactor[] = [
    {
      label: "最近代码更新",
      weight: 25,
      score: Number.isFinite(age)
        ? age <= 30
          ? 100
          : age <= 90
            ? 80
            : age <= 180
              ? 60
              : age <= 365
                ? 35
                : 10
        : null,
      detail: Number.isFinite(age)
        ? `${Math.floor(age)} 天前推送代码`
        : "更新时间缺失",
    },
    {
      label: "Issue 处理情况",
      weight: 20,
      score:
        issues.status === "ready"
          ? issues.data.open + issues.data.closed === 0
            ? null
            : (issues.data.closed / (issues.data.open + issues.data.closed)) *
              100
          : null,
      detail:
        issues.status === "ready"
          ? `${issues.data.closed} 已关闭 / ${issues.data.open} 未关闭（不含 PR）`
          : "无法获取 Issue 统计",
    },
    {
      label: "README 文档",
      weight: 20,
      score: readme.status === "ready" ? (readme.data ? 100 : 0) : null,
      detail:
        readme.status === "ready"
          ? readme.data
            ? "已提供项目文档"
            : "未找到 README"
          : "文档状态未知",
    },
    {
      label: "开源许可证",
      weight: 15,
      score: repo.license ? 100 : 0,
      detail: repo.license?.spdx_id || "未识别到许可证",
    },
    {
      label: "持续提交",
      weight: 20,
      score: activityScore,
      detail:
        activityScore === null
          ? "提交统计暂不可用"
          : `最近 12 周中 ${Math.round(activityScore)}% 的周有提交`,
    },
  ];
  const known = factors.filter(
    (factor): factor is HealthFactor & { score: number } =>
      factor.score !== null,
  );
  const coverage = known.reduce((sum, factor) => sum + factor.weight, 0);
  const score = coverage
    ? Math.round(
        known.reduce((sum, factor) => sum + factor.score * factor.weight, 0) /
          coverage,
      )
    : null;
  return {
    score,
    coverage,
    factors,
    label:
      score === null
        ? "数据不足"
        : score >= 80
          ? "状态良好"
          : score >= 60
            ? "持续发展"
            : score >= 40
              ? "值得关注"
              : "维护较少",
  };
}
