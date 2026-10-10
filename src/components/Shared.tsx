import type { ReactNode } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import type { Resource } from "../types";
export function Panel({
  title,
  eyebrow,
  icon,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          <div className="panel-eyebrow">{eyebrow}</div>
          <h2>
            {icon}
            {title}
          </h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function ResourceMessage({
  resource,
  empty,
}: {
  resource: Resource<unknown>;
  empty?: string;
}) {
  return (
    <div className="resource-message" role="status">
      {resource.status === "pending" ? (
        <LoaderCircle className="animate-spin" size={25} />
      ) : (
        <CircleAlert size={25} />
      )}
      <p>
        {resource.status === "ready" ? empty || "暂无数据" : resource.message}
      </p>
    </div>
  );
}
export function Skeleton() {
  return (
    <div
      className="skeleton-grid"
      role="status"
      aria-label="正在从 GitHub 获取仓库数据"
    >
      <div className="skeleton h-44 col-span-full" />
      {[0, 1, 2, 3].map((i) => (
        <div className="skeleton h-24" key={i} />
      ))}
      <div className="skeleton h-80 col-span-full" />
      <span className="sr-only">正在分析仓库，请稍候。</span>
    </div>
  );
}
