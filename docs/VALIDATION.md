# 验证记录 / Validation report

Validation date: 2026-10-10. Node.js 24.19.0. Chromium browser.

## 已验证 / Verified locally

- `npm install` and clean frozen-lockfile `npm ci` completed.
- `npm run lint` completed with no warnings or errors.
- `npm test`: 36 URL parsing, health, data transformation and API error tests; 9 server encryption, proxy allowlist, OAuth state/exchange, cookie, CSRF and method tests passed. OAuth exchange tests use a mocked upstream and randomly generated ephemeral session data, not real credentials.
- `npm run build`: strict TypeScript checks and production Vite build passed. Charts and README are split into lazy chunks.
- `npm audit`: zero reported vulnerabilities across runtime and development dependencies at validation time.
- Chromium regression checks: public dashboard, relative README links, HTML/script and unsafe URL filtering, light/dark persistence, 390 px mobile viewport without horizontal overflow, request race protection, history deletion/clear, missing repository, rate-limit response and asynchronous `202` statistics.
- PNG download was saved and checked for a valid PNG signature and nontrivial rendered content. Export includes repository statistics, language distribution, health details and analysis time.
- Private report fixtures did not enter localStorage history/cache. Account picker retry, private proxy report and sign-out clearing were checked with isolated browser fixtures.
- Production preview home and disabled-OAuth notice were checked in Chromium with no uncaught page errors. `home-dark.png` and `home-light.png` are actual production home screenshots, not fabricated report screenshots.
- A separate `/RepoLens/` production build and Chromium preview verified the GitHub Pages subpath and its asset loading.
- Source review and pattern scans found no real credentials, user-specific filesystem paths, private repository data or unintended publishable generated files. `node_modules`, `dist`, browser artifacts and environment secret files are ignored.

## 尚未联调 / Not established by these checks

- The cloud environment's current egress proxy rejected `api.github.com` with an HTTP 403 CONNECT denial. This is a network policy response, not evidence of a GitHub rate-limit or repository failure. API and avatar domains were added to the environment configuration draft, but a draft save does not apply running-instance networking.
- No live repository report was claimed to have passed in this environment. Browser data are labeled test fixtures and are only imported by tests. Production always requests GitHub and displays API failures instead of substituting fixtures.
- Real OAuth login, private repository authorization and organization/SSO access were not tested: no OAuth App client credentials, session encryption secret or deployment origin were supplied. See the README's Vercel instructions. No raw or private token is built into the frontend.
- GitHub Pages and Vercel publication were not executed. Local production builds and workflow files do not prove a hosted deployment.

当前完成的是项目实现、安装、自动测试及本地浏览器验证。真实 API 网络和 OAuth 部署是独立验证边界；配置环境访问与部署凭据后，需要再用真实账号与仓库验证。公开分析不需要访客配置任何密钥。

Implementation, installation, automated tests and local browser validation are complete. Live API networking, OAuth authorization and hosted deployment remain separate checks. Public visitors need no API key.
