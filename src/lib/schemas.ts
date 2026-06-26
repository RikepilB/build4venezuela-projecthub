import { z } from "zod";

// ── Single source of truth ──────────────────────────────────────────────
// Types (src/lib/types.ts) are z.infer'd from these, so they cannot drift.
// External/user data is validated against these schemas at every boundary
// (importers, form action, repository reads). See .claude/rules/common/coding-rules.md.

export const Locale = z.enum(["en", "es"]);
export const ProjectStatus = z.enum(["live", "wip", "planning"]);
export const NeedType = z.enum(["contributors", "api_credits", "sponsors"]);
// internal = posted here · external = discovered OSS repo · initiative = known relief site (link-out, PII-gated)
export const ProjectSource = z.enum(["internal", "external", "initiative"]);

// https-only guard: z.url() alone would accept javascript:/data: URIs.
const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"), { message: "URL must be https://" });

export const NeedsSchema = z.object({
  contributors: z.array(z.string().min(1).max(80)).default([]), // role/skill asks: "React dev", "ES translator"
  api_credits: z.array(z.string().min(1).max(80)).default([]), // "OpenAI credits", "ElevenLabs"
  sponsors: z.array(z.string().min(1).max(80)).default([]), // "hosting", "SMS gateway"
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(2).max(120),
  summary: z.string().min(10).max(600),
  repo_url: httpsUrl.optional(),
  demo_url: httpsUrl.optional(),
  stack: z.array(z.string().min(1).max(40)).max(30).default([]),
  languages: z.array(Locale).min(1),
  categories: z.array(z.string().min(1).max(40)).min(1).max(10),
  status: ProjectStatus,
  needs: NeedsSchema,
  owner: z.string().min(1).max(80), // alias in P0; user id in P1
  source: ProjectSource.default("internal"),
  created_at: z.string().datetime().optional(),
});

// What the submit form posts; server fills id/slug/created_at/source.
export const ProjectInputSchema = ProjectSchema.omit({
  id: true,
  slug: true,
  created_at: true,
  source: true,
});

export const BuilderSchema = z.object({
  id: z.string().min(1),
  alias: z.string().min(1).max(120),
  role: z.string().max(160).default(""),
  stack: z.array(z.string().min(1).max(40)).max(40).default([]),
  linkedin_url: httpsUrl.optional(),
  availability: z.string().max(120).default(""),
  timezone: z.string().max(60).default(""),
  status: z.string().max(60).default(""),
});

export const ProjectsFileSchema = z.array(ProjectSchema);
export const BuildersFileSchema = z.array(BuilderSchema);
