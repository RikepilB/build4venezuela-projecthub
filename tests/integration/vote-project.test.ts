import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/repository", () => ({ projectRepository: { vote: vi.fn() } }));

import { upvoteProject } from "@/actions/vote-project";
import { projectRepository } from "@/lib/repository";
import { revalidatePath } from "next/cache";

function form(slug: string): FormData {
  const fd = new FormData();
  fd.set("slug", slug);
  return fd;
}

beforeEach(() => vi.clearAllMocks());

describe("upvoteProject", () => {
  it("votes and revalidates for a valid slug", async () => {
    vi.mocked(projectRepository.vote).mockResolvedValue(1);
    await upvoteProject(form("relief-map"));
    expect(projectRepository.vote).toHaveBeenCalledWith("relief-map");
    expect(revalidatePath).toHaveBeenCalledTimes(2); // board + detail
  });

  it("ignores slugs that fail the boundary regex", async () => {
    for (const bad of ["../etc", "Foo", "a b", ""]) {
      await upvoteProject(form(bad));
    }
    expect(projectRepository.vote).not.toHaveBeenCalled();
  });

  it("swallows a read-only-FS failure without throwing or revalidating", async () => {
    vi.mocked(projectRepository.vote).mockRejectedValue(new Error("EROFS"));
    await expect(upvoteProject(form("relief-map"))).resolves.toBeUndefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
