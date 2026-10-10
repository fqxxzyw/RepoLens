import { History, ArrowUpRight, X, Trash2 } from "lucide-react";
import type { HistoryEntry } from "../types";
import { Panel } from "./Shared";
export function HistoryPanel({
  entries,
  onSelect,
  onChange,
}: {
  entries: HistoryEntry[];
  onSelect: (name: string) => void;
  onChange: (next: HistoryEntry[]) => void;
}) {
  return (
    <Panel
      title="最近分析"
      eyebrow="YOUR EXPLORATIONS"
      icon={<History size={17} />}
      action={
        entries.length > 0 && (
          <button
            className="icon-button"
            aria-label="清空历史记录"
            onClick={() => onChange([])}
          >
            <Trash2 size={15} />
          </button>
        )
      }
      className="history-panel"
    >
      {entries.length ? (
        <div className="history-list">
          {entries.map((entry) => (
            <div key={entry.fullName}>
              <button
                className="history-item"
                onClick={() => onSelect(entry.fullName)}
              >
                <span className="history-repo">
                  <span className="history-symbol">↗</span>
                  <span>
                    <strong>{entry.fullName}</strong>
                    <small>
                      {new Date(entry.analyzedAt).toLocaleDateString("zh-CN")}
                    </small>
                  </span>
                </span>
                <ArrowUpRight size={14} />
              </button>
              <button
                className="icon-button"
                aria-label={`删除 ${entry.fullName} 的记录`}
                onClick={() =>
                  onChange(
                    entries.filter((item) => item.fullName !== entry.fullName),
                  )
                }
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="history-empty">
          <History size={25} />
          <p>你的下一次探索，从这里开始。</p>
          <span>最近 10 个公开仓库会保存在此设备。</span>
        </div>
      )}
      <p className="chart-footnote">私有仓库不保存到浏览器缓存或历史。</p>
    </Panel>
  );
}
