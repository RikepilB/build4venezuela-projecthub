import type { Locale } from "@/lib/types";
import { SITE_URL } from "@/lib/links";

// Bump when the artwork changes so shared links reference a fresh image asset.
export const SOCIAL_PREVIEW_ID = "workspace-v2";
export const SOCIAL_PREVIEW_SIZE = { width: 1200, height: 630 };

export function socialPreview(locale: Locale) {
  return {
    url: `${SITE_URL}/${locale}/opengraph-image/${SOCIAL_PREVIEW_ID}`,
    ...SOCIAL_PREVIEW_SIZE,
    type: "image/png",
    alt: locale === "es"
      ? "El Umbral · ProjectHub — de la idea a la entrega. Proyectos, tareas y entregables para cualquier hackathon."
      : "El Umbral · ProjectHub — from idea to delivery. Projects, tasks and deliverables for any hackathon.",
  };
}
