import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeProject } from "../fixtures/projects";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/repository", () => ({ projectRepository: { create: vi.fn() } }));

import { submitProject } from "@/actions/submit-project";
import { projectRepository } from "@/lib/repository";
import { revalidatePath } from "next/cache";
import { initialSubmitState } from "@/actions/submit-types";

function validForm(): FormData {
  const fd = new FormData();
  fd.set("name", "Relief Map");
  fd.set("summary", "A map of relief centers in Venezuela.");
  fd.set("owner", "me");
  fd.set("status", "wip");
  fd.set("repo_url", ""); // empty → should become undefined, not ""
  fd.append("languages", "es");
  fd.append("categories", "coordination");
  return fd;
}

beforeEach(() => vi.clearAllMocks());

describe("submitProject", () => {
  it("rejects the honeypot without calling create", async () => {
    const fd = validForm();
    fd.set("company", "i am a bot");
    expect(await submitProject(initialSubmitState, fd)).toEqual({ ok: false, error: "spam" });
    expect(projectRepository.create).not.toHaveBeenCalled();
  });

  it("returns flattened fieldErrors on invalid input", async () => {
    const res = await submitProject(initialSubmitState, new FormData());
    expect(res.ok).toBe(false);
    expect(res.error).toBe("validation");
    expect(Object.keys(res.fieldErrors ?? {}).length).toBeGreaterThan(0);
  });

  it("coerces empty urls to undefined and revalidates, then redirects", async () => {
    vi.mocked(projectRepository.create).mockResolvedValue(makeProject({ slug: "relief-map" }));
    await expect(submitProject(initialSubmitState, validForm())).rejects.toThrow(/REDIRECT/);
    const arg = vi.mocked(projectRepository.create).mock.calls[0][0];
    expect(arg.repo_url).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("maps a read-only-FS write failure to save_failed", async () => {
    vi.mocked(projectRepository.create).mockRejectedValue(new Error("EROFS"));
    expect(await submitProject(initialSubmitState, validForm())).toEqual({
      ok: false,
      error: "save_failed",
    });
  });
});
