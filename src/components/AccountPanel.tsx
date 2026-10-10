import { useEffect, useRef, useState } from "react";
import { Lock, FolderGit2, LoaderCircle, ArrowUpRight, X } from "lucide-react";
import type { PersonalRepo } from "../types";
import { getPersonalRepos } from "../services/github";
export function AccountPanel({
  onSelect,
  onClose,
}: {
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [repos, setRepos] = useState<PersonalRepo[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getPersonalRepos(page, controller.signal)
      .then((data) => {
        setRepos((current) =>
          page === 1
            ? data
            : [
                ...current,
                ...data.filter(
                  (item) =>
                    !current.some((existing) => existing.id === item.id),
                ),
              ],
        );
        setMore(data.length === 30);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error instanceof Error ? error.message : "无法获取仓库列表");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, retry]);
  return (
    <dialog
      ref={dialog}
      className="account-dialog panel"
      onCancel={onClose}
      aria-labelledby="account-title"
    >
      <div className="panel-header">
        <h2 id="account-title">
          <FolderGit2 size={20} />
          我的 GitHub 仓库
        </h2>
        <button
          className="icon-button"
          aria-label="关闭仓库列表"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p className="muted text-sm mb-4">
        选择公开或已授权的私有仓库。组织仓库可能需要单独授权。
      </p>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => setRetry((current) => current + 1)}>
            重试
          </button>
        </div>
      )}
      <div className="personal-repos">
        {repos.map((repo) => (
          <button
            key={repo.id}
            onClick={() => {
              onSelect(repo.full_name);
              onClose();
            }}
          >
            <span>
              <strong>
                {repo.full_name}
                {repo.private && <Lock size={12} />}
              </strong>
              <small>{repo.description || "暂无简介"}</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
        ))}
      </div>
      {loading ? (
        <p className="flex items-center gap-2 muted">
          <LoaderCircle className="animate-spin" size={16} />
          正在加载仓库…
        </p>
      ) : !repos.length && !error ? (
        <p>此账号暂无可访问的仓库。</p>
      ) : (
        more && (
          <button
            className="secondary-button mt-4"
            onClick={() => setPage((current) => current + 1)}
          >
            加载更多
          </button>
        )
      )}
    </dialog>
  );
}
