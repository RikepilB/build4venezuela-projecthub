import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/repository", () => ({ builderRepository: { create: vi.fn() } }));

import { submitBuilder } from "@/actions/submit-builder";
import { builderRepository } from "@/lib/repository";
import { revalidatePath } from "next/cache";
import { initialBuilderSubmitState } from "@/actions/submit-builder-types";

const ada = { id: "ada", alias: "Ada", role: "", stack: [], availability: "", timezone: "", status: "" };

beforeEach(() => vi.clearAllMocks());

describe("submitBuilder", () => {
  it("rejects the honeypot", async () => {
    const fd = new FormData();
    fd.set("alias", "Ada");
    fd.set("company", "bot");
    expect(await submitBuilder(initialBuilderSubmitState, fd)).toEqual({ ok: false, error: "spam" });
    expect(builderRepository.create).not.toHaveBeenCalled();
  });

  it("returns fieldErrors when alias is missing", async () => {
    const res = await submitBuilder(initialBuilderSubmitState, new FormData());
    expect(res.ok).toBe(false);
    expect(res.error).toBe("validation");
    expect(res.fieldErrors?.alias).toBeTruthy();
  });

  it("creates and returns ok on a valid submission", async () => {
    vi.mocked(builderRepository.create).mockResolvedValue(ada);
    const fd = new FormData();
    fd.set("alias", "Ada");
    expect(await submitBuilder(initialBuilderSubmitState, fd)).toEqual({ ok: true });
    expect(builderRepository.create).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("maps a write failure to save_failed", async () => {
    vi.mocked(builderRepository.create).mockRejectedValue(new Error("EROFS"));
    const fd = new FormData();
    fd.set("alias", "Ada");
    expect(await submitBuilder(initialBuilderSubmitState, fd)).toEqual({ ok: false, error: "save_failed" });
  });
});
