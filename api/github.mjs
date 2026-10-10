import {
  settings,
  session,
  send,
  validateProxyPath,
  githubFetch,
} from "../server/security.mjs";
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "GET required" });
  }
  let config;
  try {
    config = settings();
  } catch {
    return send(res, 503, { error: "OAuth is not configured" });
  }
  const current = session(req, config);
  if (!current) return send(res, 401, { error: "Sign in required" });
  const path = new URL(req.url, config.origin).searchParams.get("path");
  if (!validateProxyPath(path))
    return send(res, 400, { error: "Unsupported GitHub API path" });
  try {
    const response = await githubFetch(path, current.token);
    for (const name of [
      "x-ratelimit-remaining",
      "x-ratelimit-reset",
      "retry-after",
    ]) {
      const value = response.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    if ([202, 204].includes(response.status)) {
      res.setHeader("Cache-Control", "no-store");
      return res.status(response.status).end();
    }
    if (!response.ok)
      return send(res, response.status, { error: "GitHub request failed" });
    return send(res, response.status, await response.json());
  } catch {
    return send(res, 502, { error: "Unable to reach GitHub" });
  }
}
