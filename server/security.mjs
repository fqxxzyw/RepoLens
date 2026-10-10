import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export function settings() {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET, APP_URL } =
    process.env;
  if (
    !GITHUB_CLIENT_ID ||
    !GITHUB_CLIENT_SECRET ||
    !SESSION_SECRET ||
    SESSION_SECRET.length < 32 ||
    !APP_URL
  )
    throw new Error("OAuth configuration missing");
  const url = new URL(APP_URL);
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new Error("Invalid APP_URL");
  return {
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    secret: SESSION_SECRET,
    origin: url.origin,
    secure: url.protocol === "https:",
  };
}
function key(secret) {
  return createHash("sha256").update(secret).digest();
}
export function seal(payload, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function unseal(value, secret, now = Date.now()) {
  try {
    if (!value || value.length > 3500) return null;
    const packed = Buffer.from(value, "base64url");
    if (packed.length < 29) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(secret),
      packed.subarray(0, 12),
    );
    decipher.setAuthTag(packed.subarray(12, 28));
    const payload = JSON.parse(
      Buffer.concat([
        decipher.update(packed.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    );
    return Number.isFinite(payload.exp) && payload.exp > now ? payload : null;
  } catch {
    return null;
  }
}
export function readCookie(req, name) {
  const part = (req.headers.cookie || "")
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : "";
}
export function cookie(name, value, config, seconds) {
  return `${name}=${value}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${seconds}${config.secure ? "; Secure" : ""}`;
}
export function session(req, config) {
  const value = unseal(readCookie(req, "repolens_session"), config.secret);
  return value?.kind === "session" && typeof value.token === "string"
    ? value
    : null;
}
export function send(res, status, data) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(data);
}
export function validateProxyPath(path) {
  if (
    typeof path !== "string" ||
    path.length > 600 ||
    !path.startsWith("/") ||
    path.includes("\\") ||
    /[\r\n]/.test(path)
  )
    return false;
  const url = new URL(path, "https://api.github.com");
  if (url.origin !== "https://api.github.com" || url.hash) return false;
  const repository =
    /^\/repos\/[A-Za-z\d-]+\/[\w.-]+(?:\/(?:languages|readme|stats\/commit_activity))?$/;
  if (repository.test(url.pathname) && !url.search) return true;
  if (url.pathname === "/user/repos") {
    const params = url.searchParams;
    return (
      [...params.keys()].length === 4 &&
      params.get("sort") === "updated" &&
      params.get("per_page") === "30" &&
      params.get("affiliation") === "owner,collaborator,organization_member" &&
      params.get("page") !== null &&
      /^[1-9]\d{0,3}$/.test(params.get("page")) &&
      [...params.keys()].every((name) =>
        ["sort", "per_page", "page", "affiliation"].includes(name),
      )
    );
  }
  if (url.pathname === "/search/issues")
    return (
      [...url.searchParams.keys()].length === 2 &&
      url.searchParams.get("per_page") === "1" &&
      /^repo:[A-Za-z\d-]+\/[\w.-]+ is:issue state:(open|closed)$/.test(
        url.searchParams.get("q") || "",
      )
    );
  return false;
}
export async function githubFetch(path, token) {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "RepoLens",
    },
    signal: AbortSignal.timeout(20000),
    redirect: "error",
  });
}
