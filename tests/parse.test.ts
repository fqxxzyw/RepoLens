import { describe, expect, it } from "vitest";
import { parseRepository } from "../src/lib/parse";
describe("repository input", () => {
  it.each([
    "facebook/react",
    " https://github.com/facebook/react/ ",
    "https://github.com/facebook/react.git",
    "https://github.com/facebook/react?tab=readme-ov-file",
  ])("parses %s", (input) =>
    expect(parseRepository(input)).toEqual({
      owner: "facebook",
      repo: "react",
    }),
  );
  it.each([
    "",
    "react",
    "owner/repo/tree/main",
    "https://gitlab.com/a/b",
    "https://github.com.evil.test/a/b",
    "https://user:pass@github.com/a/b",
    "https://github.com:3000/a/b",
    "owner/..",
    "a/b/c",
    "javascript:alert(1)",
  ])("rejects %s", (input) => expect(() => parseRepository(input)).toThrow());
});
