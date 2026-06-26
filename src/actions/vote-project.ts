"use server";

import { revalidatePath } from "next/cache";
import { projectRepository } from "@/lib/repository";
import { isValidSlug } from "@/lib/slug";

// Upvote a project (community prioritization signal). Validates the slug at the
// boundary; on a read-only FS the write fails gracefully without crashing.
export async function upvoteProject(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "").trim().slice(0, 120);
  if (!slug || !isValidSlug(slug)) return;

  try {
    await projectRepository.vote(slug);
  } catch (err) {
    console.error("[vote] could not persist vote:", err);
    return;
  }

  revalidatePath("/[locale]/board", "page");
  revalidatePath("/[locale]/projects/[slug]", "page");
}
