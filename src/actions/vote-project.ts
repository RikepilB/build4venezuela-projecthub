"use server";

import { revalidatePath } from "next/cache";
import { projectRepository } from "@/lib/repository";
import { isValidSlug } from "@/lib/slug";

export type VoteState = { ok: boolean };

// Upvote a project (community prioritization signal). Validates the slug at the
// boundary. Returns {ok} so the client marks "voted" only on a CONFIRMED write — a
// failed persist (e.g. Vercel's read-only FS with no Redis configured) no longer
// silently locks the button via an optimistic localStorage flag.
export async function upvoteProject(
  _prev: VoteState | null,
  formData: FormData,
): Promise<VoteState> {
  const slug = String(formData.get("slug") ?? "").trim().slice(0, 120);
  if (!slug || !isValidSlug(slug)) return { ok: false };

  try {
    await projectRepository.vote(slug);
  } catch (err) {
    console.error("[vote] could not persist vote:", err);
    return { ok: false };
  }

  revalidatePath("/[locale]/board", "page");
  revalidatePath("/[locale]/projects/[slug]", "page");
  return { ok: true };
}
