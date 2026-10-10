import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";
import { Panel, ResourceMessage } from "./Shared";
import { weeksToChart } from "../lib/transform";
import type { Analysis } from "../types";
export function ActivityChart({
  resource,
}: {
  resource: Analysis["activity"];
}) {
  const data = resource.status === "ready" ? weeksToChart(resource.data) : [];
  const total = data.reduce((sum, week) => sum + week.commits, 0);
  return (
    <Panel
      title="提交活跃度"
      eyebrow="COMMIT ACTIVITY"
      icon={<Activity size={17} />}
      action={<span className="badge">最近 12 周</span>}
      className="activity-panel"
    >
      {resource.status !== "ready" || !data.length ? (
        <ResourceMessage resource={resource} empty="暂无提交记录。" />
      ) : (
        <>
          <div className="activity-summary">
            <strong>{total.toLocaleString()}</strong>
            <span>次提交 · 默认分支</span>
          </div>
          <div
            className="activity-chart"
            role="img"
            aria-label={`最近 ${data.length} 周共 ${total} 次提交`}
          >
            <ResponsiveContainer width="100%" height={215}>
              <AreaChart
                data={data}
                margin={{ top: 10, right: 8, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="commitGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#64e6bb" stopOpacity={0.27} />
                    <stop offset="100%" stopColor="#64e6bb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={22}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [`${value} 次`, "提交"]}
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="commits"
                  stroke="#64e6bb"
                  strokeWidth={2.5}
                  fill="url(#commitGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-footnote">
            GitHub 按周统计 · 默认分支近一年中的最后 12 周
          </p>
          <details className="chart-data">
            <summary>查看每周数据</summary>
            <table>
              <thead>
                <tr>
                  <th>周开始日期（UTC）</th>
                  <th>提交</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.timestamp}>
                    <td>
                      {new Date(item.timestamp * 1000)
                        .toISOString()
                        .slice(0, 10)}
                    </td>
                    <td>{item.commits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Panel>
  );
}
