import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  settings,
  seal,
  unseal,
  readCookie,
  cookie,
  session,
  send,
  githubFetch,
} from "../server/security.mjs";
export default async function handler(req, res) {
  let config;
  try {
    config = settings();
  } catch {
    return send(res, 503, {
      error:
        "GitHub OAuth is not configured. Public analysis remains available.",
    });
  }
  const action = new URL(req.url, config.origin).searchParams.get("action");
  res.setHeader("Cache-Control", "no-store");
  if (action === "logout") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return send(res, 405, { error: "POST required" });
    }
    if (req.headers.origin !== config.origin)
      return send(res, 403, { error: "Invalid origin" });
    res.setHeader("Set-Cookie", cookie("repolens_session", "", config, 0));
    return send(res, 200, { ok: true });
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return send(res, 405, { error: "GET required" });
  }
  if (action === "availability") return send(res, 200, { configured: true });
  if (action === "login") {
    const state = randomBytes(24).toString("hex");
    res.setHeader(
      "Set-Cookie",
      cookie(
        "repolens_oauth",
        seal({ kind: "oauth", state, exp: Date.now() + 600000 }, config.secret),
        config,
        600,
      ),
    );
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: `${config.origin}/api/auth?action=callback`,
      scope: "read:user repo",
      state,
    });
    return res.redirect(
      302,
      `https://github.com/login/oauth/authorize?${params}`,
    );
  }
  if (action === "callback") {
    const query = new URL(req.url, config.origin).searchParams;
    const stored = unseal(readCookie(req, "repolens_oauth"), config.secret);
    const received = query.get("state") || "";
    res.setHeader("Set-Cookie", cookie("repolens_oauth", "", config, 0));
    if (
      stored?.kind !== "oauth" ||
      typeof stored.state !== "string" ||
      Buffer.byteLength(stored.state) !== Buffer.byteLength(received) ||
      !timingSafeEqual(Buffer.from(stored.state), Buffer.from(received)) ||
      !query.get("code") ||
      query.has("error")
    )
      return res.redirect(302, `${config.origin}/?auth_error=state`);
    try {
      const response = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: query.get("code"),
            redirect_uri: `${config.origin}/api/auth?action=callback`,
          }),
          signal: AbortSignal.timeout(15000),
          redirect: "error",
        },
      );
      const token = await response.json();
      if (!response.ok || typeof token.access_token !== "string" || token.error)
        throw new Error("Token exchange failed");
      res.setHeader("Set-Cookie", [
        cookie("repolens_oauth", "", config, 0),
        cookie(
          "repolens_session",
          seal(
            {
              kind: "session",
              token: token.access_token,
              exp: Date.now() + 8 * 3600000,
            },
            config.secret,
          ),
          config,
          8 * 3600,
        ),
      ]);
      return res.redirect(302, config.origin);
    } catch {
      return res.redirect(302, `${config.origin}/?auth_error=exchange`);
    }
  }
  if (action === "me") {
    const current = session(req, config);
    if (!current) return send(res, 401, { error: "Not signed in" });
    try {
      const response = await githubFetch("/user", current.token);
      if (!response.ok)
        return send(res, response.status, {
          error: "GitHub session unavailable",
        });
      const user = await response.json();
      return send(res, 200, {
        login: user.login,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
      });
    } catch {
      return send(res, 502, { error: "Unable to reach GitHub" });
    }
  }
  return send(res, 404, { error: "Unknown action" });
}
