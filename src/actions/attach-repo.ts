"use server";

import { revalidatePath } from "next/cache";
import { projectRepository } from "@/lib/repository";
import { setRepoOverride } from "@/lib/repos/repo-overrides-store";
import { parseGithubRepo, fetchRepoContributorCount } from "@/lib/github/repo-stats";
import { isValidSlug } from "@/lib/slug";
import type { AttachRepoState } from "./attach-repo-types";

// "Add the repo for this project" — anyone can attach a GitHub repo to a project that
// shipped without one (hackathon-open, no auth). The URL is validated at the boundary
// (https + github.com only); the repo's contributor count is fetched once and cached.
// Stored in the repo-override store (Redis on Vercel) so it persists across deploys.
export async function attachRepo(_prev: AttachRepoState, formData: FormData): Promise<AttachRepoState> {
  if (String(formData.get("company") ?? "").trim().length > 0) {
    return { ok: false, error: "spam" };
  }

  const slug = String(formData.get("slug") ?? "").trim().slice(0, 120);
  const repoUrl = String(formData.get("repo_url") ?? "").trim();

  if (!slug || !isValidSlug(slug)) {
    return { ok: false, error: "validation", fieldErrors: { slug: "invalid" } };
  }

  // External input is data: only an https github.com repo URL is accepted.
  const gh = parseGithubRepo(repoUrl);
  if (!gh) {
    return { ok: false, error: "invalid_repo", fieldErrors: { repo_url: "invalid" } };
  }

  // Don't create overrides for unknown slugs (the form is always rendered for a real project).
  const project = await projectRepository.getBySlug(slug);
  if (!project) {
    return { ok: false, error: "validation", fieldErrors: { slug: "unknown" } };
  }

  // Best-effort contributor count — a failure just leaves the count unknown, never blocks the attach.
  const contributors = await fetchRepoContributorCount(gh.owner, gh.repo);

  const saved = await setRepoOverride(slug, {
    url: `https://github.com/${gh.owner}/${gh.repo}`,
    contributors: contributors ?? undefined,
    fetched_at: new Date().toISOString(),
  });
  if (!saved) {
    return { ok: false, error: "save_failed" };
  }

  revalidatePath("/[locale]/board", "page");
  revalidatePath("/[locale]/projects/[slug]", "page");
  return { ok: true };
}
