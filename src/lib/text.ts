// Accent/diacritic-insensitive normalization so "terremoto" ≈ "terremoto"
// and EN/ES queries match the same records.
const DIACRITICS = /[̀-ͯ]/g;

export function normalize(input: string): string {
  return input.normalize("NFD").replace(DIACRITICS, "").toLowerCase().trim();
}

// Split a free-text skills/stack cell ("Next.js / React, Node;Python") into tags.
export function splitTags(input: string): string[] {
  return input
    .split(/[/,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}
