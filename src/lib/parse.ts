export function parseRepository(input: string): {
  owner: string;
  repo: string;
} {
  let value = input.trim();
  if (/^https?:\/\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new Error("请输入有效的 GitHub 仓库地址。");
    }
    if (
      url.hostname.toLowerCase() !== "github.com" ||
      url.username ||
      url.password ||
      url.port
    ) {
      throw new Error("仅支持 github.com 上的仓库地址。");
    }
    value = url.pathname;
  }
  value = value.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
  const parts = value.split("/");
  if (
    parts.length !== 2 ||
    !/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(parts[0]) ||
    !/^[\w.-]+$/.test(parts[1]) ||
    /^\.+$/.test(parts[1])
  ) {
    throw new Error("请输入 owner/repo 或完整仓库 URL，例如 facebook/react。");
  }
  return { owner: parts[0], repo: parts[1] };
}
