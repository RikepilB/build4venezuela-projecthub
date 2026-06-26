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
  // useActionState signature: (prevState, formData) → { ok }.
  it("votes and revalidates for a valid slug", async () => {
    vi.mocked(projectRepository.vote).mockResolvedValue(1);
    await expect(upvoteProject(null, form("relief-map"))).resolves.toEqual({ ok: true });
    expect(projectRepository.vote).toHaveBeenCalledWith("relief-map");
    expect(revalidatePath).toHaveBeenCalledTimes(2); // board + detail
  });

  it("ignores slugs that fail the boundary regex", async () => {
    for (const bad of ["../etc", "Foo", "a b", ""]) {
      await expect(upvoteProject(null, form(bad))).resolves.toEqual({ ok: false });
    }
    expect(projectRepository.vote).not.toHaveBeenCalled();
  });

  it("reports a read-only-FS failure as { ok: false } without throwing or revalidating", async () => {
    vi.mocked(projectRepository.vote).mockRejectedValue(new Error("EROFS"));
    await expect(upvoteProject(null, form("relief-map"))).resolves.toEqual({ ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
