import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Code2 } from "lucide-react";
import { Panel, ResourceMessage } from "./Shared";
import { languagesToChart } from "../lib/transform";
import type { Analysis } from "../types";
export function LanguageChart({
  resource,
}: {
  resource: Analysis["languages"];
}) {
  const data =
    resource.status === "ready" ? languagesToChart(resource.data) : [];
  return (
    <Panel
      title="语言分布"
      eyebrow="LANGUAGES"
      icon={<Code2 size={17} />}
      action={<span className="badge">按代码字节</span>}
    >
      {resource.status !== "ready" || !data.length ? (
        <ResourceMessage
          resource={resource}
          empty="暂无语言数据，仓库可能为空。"
        />
      ) : (
        <>
          <div
            className="donut-container"
            role="img"
            aria-label={data
              .map((item) => `${item.name} ${item.percent.toFixed(1)}%`)
              .join("，")}
          >
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="bytes"
                  nameKey="name"
                  innerRadius={61}
                  outerRadius={81}
                  paddingAngle={data.length > 1 ? 3 : 0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    `${Number(value).toLocaleString()} bytes`
                  }
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--text)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-label">
              <strong>{data.length}</strong>
              <span>种编程语言</span>
            </div>
          </div>
          <div className="language-legend">
            {data.map((item) => (
              <div key={item.name}>
                <span>
                  <i style={{ background: item.color }} />
                  {item.name}
                </span>
                <strong>
                  {item.percent < 0.1 ? "<0.1" : item.percent.toFixed(1)}%
                </strong>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
