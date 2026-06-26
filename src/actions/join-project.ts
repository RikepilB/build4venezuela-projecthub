"use server";

import { revalidatePath } from "next/cache";
import { membershipRepository } from "@/lib/repository";
import { MembershipInputSchema } from "@/lib/schemas";
import type { JoinState } from "./join-project-types";

// "Soy parte de esto" — anyone can add their name to a project's team (hackathon-
// open, no auth). Honeypot + Zod at the boundary; the join is idempotent per name.
// Read-only FS (deployed serverless) fails gracefully without crashing.
export async function joinProject(_prev: JoinState, formData: FormData): Promise<JoinState> {
  if (String(formData.get("company") ?? "").trim().length > 0) {
    return { ok: false, error: "spam" };
  }

  const candidate = {
    project_slug: String(formData.get("project_slug") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
  };

  const parsed = MembershipInputSchema.safeParse(candidate);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [key, msgs] of Object.entries(flat)) {
      if (msgs && msgs.length) fieldErrors[key] = msgs[0];
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  try {
    await membershipRepository.join(parsed.data);
  } catch (err) {
    console.error("[join] could not persist membership:", err);
    return { ok: false, error: "save_failed" };
  }

  revalidatePath("/[locale]/projects/[slug]", "page");
  revalidatePath("/[locale]/builders", "page");
  return { ok: true };
}
