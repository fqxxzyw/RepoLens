import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { Panel, ResourceMessage } from "./Shared";
import { safeLink } from "../lib/transform";
import type { Analysis } from "../types";
export function ReadmePreview({ analysis }: { analysis: Analysis }) {
  const { readme, repo } = analysis;
  const base = `${repo.html_url}/blob/${encodeURIComponent(repo.default_branch)}/${readme.status === "ready" && readme.data ? readme.data.path : "README.md"}`;
  return (
    <Panel
      title="README 预览"
      eyebrow="PROJECT DOCUMENTATION"
      icon={<BookOpen size={17} />}
      action={
        <a
          className="subtle-link"
          href={
            readme.status === "ready" && readme.data
              ? readme.data.html_url
              : repo.html_url
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          查看源文档 <ArrowUpRight size={14} />
        </a>
      }
      className="readme-panel"
    >
      {readme.status !== "ready" || !readme.data ? (
        <ResourceMessage resource={readme} empty="此仓库尚未提供 README。" />
      ) : (
        <div className="markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            skipHtml
            urlTransform={(value) => safeLink(value, base) || ""}
            components={{
              a: ({ href, children }) => (
                <a
                  href={safeLink(href, base)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              img: ({ alt, src }) => {
                // Keep authenticated private image URLs/token material out of third-party requests.
                if (repo.private)
                  return (
                    <span className="image-placeholder">
                      [图片：{alt || "私有仓库图片，请在 GitHub 查看"}]
                    </span>
                  );
                let source = safeLink(src, base);
                if (
                  source?.startsWith("https://github.com/") &&
                  source.includes("/blob/")
                )
                  source = source
                    .replace(
                      "https://github.com/",
                      "https://raw.githubusercontent.com/",
                    )
                    .replace("/blob/", "/");
                return source ? (
                  <img
                    src={source}
                    alt={alt || ""}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>[不安全图片已过滤]</span>
                );
              },
            }}
          >
            {readme.data.content}
          </ReactMarkdown>
        </div>
      )}
    </Panel>
  );
}
