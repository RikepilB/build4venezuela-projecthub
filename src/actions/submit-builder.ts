"use server";

import { revalidatePath } from "next/cache";
import { builderRepository } from "@/lib/repository";
import { BuilderInputSchema } from "@/lib/schemas";
import { splitTags } from "@/lib/text";
import { isLocale, defaultLocale } from "@/lib/i18n/config";
import type { BuilderSubmitState } from "./submit-builder-types";

function emptyToUndefined(v: FormDataEntryValue | null): string | undefined {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}

// "Add yourself to the roster" — public submit. Honeypot + Zod at the boundary;
// writes to data/builders.json (gitignored PII). Read-only FS fails gracefully.
export async function submitBuilder(
  _prev: BuilderSubmitState,
  formData: FormData,
): Promise<BuilderSubmitState> {
  if (String(formData.get("company") ?? "").trim().length > 0) {
    return { ok: false, error: "spam" };
  }

  const localeRaw = String(formData.get("locale") ?? defaultLocale);
  const locale = isLocale(localeRaw) ? localeRaw : defaultLocale;

  const candidate = {
    alias: String(formData.get("alias") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    stack: splitTags(String(formData.get("stack") ?? "")),
    linkedin_url: emptyToUndefined(formData.get("linkedin_url")),
    availability: String(formData.get("availability") ?? "").trim(),
    timezone: String(formData.get("timezone") ?? "").trim(),
    status: String(formData.get("status") ?? "").trim(),
  };

  const parsed = BuilderInputSchema.safeParse(candidate);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [key, msgs] of Object.entries(flat)) {
      if (msgs && msgs.length) fieldErrors[key] = msgs[0];
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  try {
    await builderRepository.create(parsed.data);
  } catch (err) {
    console.error("[submit-builder] create failed:", err);
    return { ok: false, error: "save_failed" };
  }

  revalidatePath(`/${locale}/builders`);
  return { ok: true };
}
