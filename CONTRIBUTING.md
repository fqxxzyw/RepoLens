# Contributing / 贡献指南

Thanks for helping make open source easier to understand.
感谢帮助更多人读懂开源项目。

1. Open an issue describing the bug or proposal / 在 Issue 中说明问题或提案。
2. Fork and create a branch / Fork 后创建工作分支。
3. Use Node.js 24, run `npm ci`, and implement the change / 使用 Node.js 24 安装依赖并修改。
4. Run `npm run lint`, `npm test`, `npm run build`; for UI changes run `npm run test:e2e` after `npx playwright install chromium` / 提交前执行检查；UI 变更增加浏览器验证。
5. Submit a PR with the reason, screenshots where helpful, and validation / PR 描述修改原因、必要截图及验证结果。

Keep API facts separate from derived scores. Never invent statistics or suppress API errors. Keep private reports and credentials out of logs, localStorage, screenshots, and commits. Browser test fixtures belong only in `tests/` and must be labeled as fixtures.

API 原始数据与评分须保持区分，不使用虚构统计，不吞掉请求异常。私有报告和凭据不得写入日志、浏览器存储、公开截图或提交。浏览器测试数据仅放在 `tests/` 并明确标注。
