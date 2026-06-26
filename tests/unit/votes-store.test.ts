import { describe, it, expect, vi, beforeEach } from "vitest";
import { redis } from "@/lib/redis/client";
import * as votesJson from "@/lib/votes/votes-json";
import { readVotes, bumpVote } from "@/lib/votes/votes-store";

// Mock both backends so we can assert the seam picks the right one and falls back.
vi.mock("@/lib/redis/client", () => ({
  redis: { enabled: false, incr: vi.fn(), mget: vi.fn() },
}));
vi.mock("@/lib/votes/votes-json", () => ({
  readVotesFile: vi.fn(),
  bumpVoteFile: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  redis.enabled = false;
});

describe("votes-store (Redis disabled → JSON fallback)", () => {
  it("readVotes delegates to the JSON file", async () => {
    vi.mocked(votesJson.readVotesFile).mockResolvedValue({ a: 3 });
    expect(await readVotes(["a"])).toEqual({ a: 3 });
    expect(redis.mget).not.toHaveBeenCalled();
  });

  it("bumpVote delegates to the JSON file", async () => {
    vi.mocked(votesJson.bumpVoteFile).mockResolvedValue(7);
    expect(await bumpVote("a")).toBe(7);
    expect(redis.incr).not.toHaveBeenCalled();
  });
});

describe("votes-store (Redis enabled)", () => {
  beforeEach(() => {
    redis.enabled = true;
  });

  it("readVotes maps MGET results to counts and drops nulls/zeros", async () => {
    vi.mocked(redis.mget).mockResolvedValue(["5", null]);
    expect(await readVotes(["a", "b"])).toEqual({ a: 5 });
  });

  it("bumpVote uses INCR and does not touch the JSON file", async () => {
    vi.mocked(redis.incr).mockResolvedValue(9);
    expect(await bumpVote("a")).toBe(9);
    expect(votesJson.bumpVoteFile).not.toHaveBeenCalled();
  });

  it("falls back to JSON when Redis returns null (error)", async () => {
    vi.mocked(redis.mget).mockResolvedValue(null);
    vi.mocked(votesJson.readVotesFile).mockResolvedValue({ a: 2 });
    expect(await readVotes(["a"])).toEqual({ a: 2 });

    vi.mocked(redis.incr).mockResolvedValue(null);
    vi.mocked(votesJson.bumpVoteFile).mockResolvedValue(1);
    expect(await bumpVote("a")).toBe(1);
  });
});
