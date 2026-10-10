import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import auth from "../api/auth.mjs";
import proxy from "../api/github.mjs";
import {
  seal,
  unseal,
  validateProxyPath,
  cookie,
} from "../server/security.mjs";
const secret = randomBytes(32).toString("hex");
test("sessions are encrypted, authenticated, and expire", () => {
  const packed = seal(
    { label: "encrypted session fixture", exp: 2000 },
    secret,
  );
  assert.equal(packed.includes("fixture"), false);
  assert.equal(unseal(packed, secret, 1000).label, "encrypted session fixture");
  assert.equal(unseal(packed, secret, 2000), null);
  assert.equal(unseal(packed, "different-key", 1000), null);
  assert.equal(unseal(packed.slice(0, -8) + "AAAAAAA", secret, 1000), null);
});
test("only read-only repository analysis endpoints can be proxied", () => {
  for (const path of [
    "/repos/a/b",
    "/repos/a/b/languages",
    "/repos/a/b/readme",
    "/repos/a/b/stats/commit_activity",
    "/search/issues?q=repo%3Aa%2Fb%20is%3Aissue%20state%3Aclosed&per_page=1",
    "/user/repos?sort=updated&per_page=30&page=1&affiliation=owner,collaborator,organization_member",
  ])
    assert.equal(validateProxyPath(path), true, path);
  for (const path of [
    "https://evil.test",
    "//evil.test/x",
    "/repos/a/b/contents/private",
    "/user",
    "/repos/a/b?extra=x",
    "/user/repos?page=-1",
    "/search/issues?q=evil",
    "/repos/a/b/../../user",
    "/repos/a/b%0a",
  ])
    assert.equal(validateProxyPath(path), false, path);
});
test("production cookies are HttpOnly, Secure and same-site", () => {
  const value = cookie("session", "encrypted", { secure: true }, 600);
  assert.match(value, /HttpOnly/);
  assert.match(value, /SameSite=Lax/);
  assert.match(value, /Secure/);
  assert.match(value, /Path=\/api/);
});

function response() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(status) {
      this.statusCode = status;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
    redirect(status, url) {
      this.statusCode = status;
      this.location = url;
      return this;
    },
    end() {
      return this;
    },
  };
}
function withConfig() {
  const keys = [
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "SESSION_SECRET",
    "APP_URL",
  ];
  const old = Object.fromEntries(keys.map((name) => [name, process.env[name]]));
  process.env.GITHUB_CLIENT_ID = "fixture-client";
  process.env.GITHUB_CLIENT_SECRET = randomBytes(24).toString("hex");
  process.env.SESSION_SECRET = randomBytes(32).toString("hex");
  process.env.APP_URL = "https://example.com";
  return () => {
    for (const name of keys) {
      if (old[name] === undefined) delete process.env[name];
      else process.env[name] = old[name];
    }
  };
}
test("unconfigured login is explicit and does not redirect", async () => {
  const old = process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_ID;
  try {
    const res = response();
    await auth(
      { method: "GET", url: "/api/auth?action=login", headers: {} },
      res,
    );
    assert.equal(res.statusCode, 503);
  } finally {
    if (old === undefined) delete process.env.GITHUB_CLIENT_ID;
    else process.env.GITHUB_CLIENT_ID = old;
  }
});
test("OAuth redirect carries state and uses the configured callback", async () => {
  const restore = withConfig();
  try {
    const res = response();
    await auth(
      { method: "GET", url: "/api/auth?action=login", headers: {} },
      res,
    );
    const destination = new URL(res.location);
    assert.equal(destination.origin, "https://github.com");
    assert.equal(
      destination.searchParams.get("redirect_uri"),
      "https://example.com/api/auth?action=callback",
    );
    assert.equal(destination.searchParams.get("state").length, 48);
    assert.match(res.headers["Set-Cookie"], /HttpOnly/);
  } finally {
    restore();
  }
});
test("callback rejects missing state without contacting GitHub", async () => {
  const restore = withConfig();
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("must not call GitHub");
  };
  try {
    const res = response();
    await auth(
      {
        method: "GET",
        url: "/api/auth?action=callback&code=fixture",
        headers: {},
      },
      res,
    );
    assert.equal(res.location, "https://example.com/?auth_error=state");
  } finally {
    globalThis.fetch = original;
    restore();
  }
});
test("valid callback exchanges the code server-side and sets an encrypted session", async () => {
  const restore = withConfig();
  const original = globalThis.fetch;
  const ephemeral = randomBytes(24).toString("hex");
  let exchanges = 0;
  globalThis.fetch = async (url, options) => {
    exchanges++;
    assert.equal(url, "https://github.com/login/oauth/access_token");
    assert.equal(options.method, "POST");
    return new Response(JSON.stringify({ access_token: ephemeral }));
  };
  try {
    const state = "random-state";
    const encrypted = seal(
      { kind: "oauth", state, exp: Date.now() + 60000 },
      process.env.SESSION_SECRET,
    );
    const res = response();
    await auth(
      {
        method: "GET",
        url: `/api/auth?action=callback&code=fixture&state=${state}`,
        headers: { cookie: `repolens_oauth=${encrypted}` },
      },
      res,
    );
    assert.equal(exchanges, 1);
    assert.equal(res.location, "https://example.com");
    const sessionCookie = res.headers["Set-Cookie"][1];
    assert.equal(sessionCookie.includes(ephemeral), false);
    const packed = sessionCookie
      .split(";")[0]
      .slice("repolens_session=".length);
    assert.equal(unseal(packed, process.env.SESSION_SECRET).token, ephemeral);
  } finally {
    globalThis.fetch = original;
    restore();
  }
});
test("logout requires POST from the configured origin", async () => {
  const restore = withConfig();
  try {
    for (const [method, origin, expected] of [
      ["GET", "https://example.com", 405],
      ["POST", "https://evil.example", 403],
      ["POST", "https://example.com", 200],
    ]) {
      const res = response();
      await auth(
        { method, url: "/api/auth?action=logout", headers: { origin } },
        res,
      );
      assert.equal(res.statusCode, expected);
    }
  } finally {
    restore();
  }
});
test("proxy requires a session and never permits writes", async () => {
  const restore = withConfig();
  try {
    const anonymous = response();
    await proxy(
      { method: "GET", url: "/api/github?path=/repos/a/b", headers: {} },
      anonymous,
    );
    assert.equal(anonymous.statusCode, 401);
    const write = response();
    await proxy(
      { method: "POST", url: "/api/github?path=/repos/a/b", headers: {} },
      write,
    );
    assert.equal(write.statusCode, 405);
  } finally {
    restore();
  }
});
