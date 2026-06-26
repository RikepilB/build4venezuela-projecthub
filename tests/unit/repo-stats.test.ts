import { describe, it, expect } from "vitest";
import { parseGithubRepo } from "@/lib/github/repo-stats";

describe("parseGithubRepo", () => {
  it("parses a standard https github.com repo URL", () => {
    expect(parseGithubRepo("https://github.com/crafter-station/mission-ve")).toEqual({
      owner: "crafter-station",
      repo: "mission-ve",
    });
  });

  it("strips a trailing .git and ignores deep paths", () => {
    expect(parseGithubRepo("https://github.com/owner/repo.git")).toEqual({ owner: "owner", repo: "repo" });
    expect(parseGithubRepo("https://github.com/owner/repo/tree/main/src")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("accepts the www. host", () => {
    expect(parseGithubRepo("https://www.github.com/a/b")).toEqual({ owner: "a", repo: "b" });
  });

  it("rejects non-https schemes (no javascript:/http:/data:)", () => {
    expect(parseGithubRepo("http://github.com/a/b")).toBeNull();
    expect(parseGithubRepo("javascript:alert(1)//github.com/a/b")).toBeNull();
    expect(parseGithubRepo("data:text/html,github.com/a/b")).toBeNull();
  });

  it("rejects non-github hosts and malformed URLs", () => {
    expect(parseGithubRepo("https://gitlab.com/a/b")).toBeNull();
    expect(parseGithubRepo("https://github.com.evil.com/a/b")).toBeNull();
    expect(parseGithubRepo("https://github.com/owner")).toBeNull(); // no repo
    expect(parseGithubRepo("not a url")).toBeNull();
  });
});
