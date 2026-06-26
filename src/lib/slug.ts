// Deterministic, accent-stripped slug for project names.
const DIACRITICS = /[̀-ͯ]/g;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Validates an untrusted slug at a boundary (e.g. the vote action) before any lookup
// or file write. Accepts only the lowercase shape slugify() produces — no path chars,
// no uppercase, no traversal.
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}
