"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { projectRepository } from "@/lib/repository";
import { ProjectInputSchema } from "@/lib/schemas";
import { splitTags } from "@/lib/text";
import { isLocale, defaultLocale } from "@/lib/i18n/config";
import type { SubmitState } from "./submit-types";

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}

export async function submitProject(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  // Honeypot: real users never fill a hidden field. Bots do.
  if (String(formData.get("company") ?? "").trim().length > 0) {
    return { ok: false, error: "spam" };
  }

  const localeRaw = String(formData.get("locale") ?? defaultLocale);
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;

  // Build the candidate from untrusted form input — validated below at the boundary.
  const candidate = {
    name: String(formData.get("name") ?? "").trim(),
    summary: String(formData.get("summary") ?? "").trim(),
    owner: String(formData.get("owner") ?? "").trim(),
    repo_url: emptyToUndefined(formData.get("repo_url")),
    demo_url: emptyToUndefined(formData.get("demo_url")),
    stack: splitTags(String(formData.get("stack") ?? "")),
    languages: formData.getAll("languages").map(String),
    categories: formData.getAll("categories").map(String),
    status: String(formData.get("status") ?? "planning"),
    needs: {
      contributors: splitTags(String(formData.get("need_contributors") ?? "")),
      api_credits: splitTags(String(formData.get("need_api_credits") ?? "")),
      sponsors: splitTags(String(formData.get("need_sponsors") ?? "")),
    },
  };

  const parsed = ProjectInputSchema.safeParse(candidate);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [key, msgs] of Object.entries(flat)) {
      if (msgs && msgs.length) fieldErrors[key] = msgs[0];
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  let slug: string;
  try {
    const created = await projectRepository.create(parsed.data);
    slug = created.slug;
  } catch (err) {
    // Read-only FS (e.g. deployed serverless) lands here — surface, don't crash.
    console.error("[submit] create failed:", err);
    return { ok: false, error: "save_failed" };
  }

  revalidatePath(`/${locale}/board`);
  redirect(`/${locale}/projects/${slug}`);
}
