import { z } from "zod";

// ── Single source of truth ──────────────────────────────────────────────
// Types (src/lib/types.ts) are z.infer'd from these, so they cannot drift.
// External/user data is validated against these schemas at every boundary
// (importers, form action, repository reads). See .claude/rules/common/coding-rules.md.

export const Locale = z.enum(["en", "es"]);
// Lifecycle, ordered: planning (just published) → wip → testing → mvp (completed /
// MVP ready, submittable to build4venezuela.com) → live.
export const ProjectStatus = z.enum(["planning", "wip", "testing", "mvp", "live"]);
export const NeedType = z.enum(["contributors", "api_credits", "sponsors"]);
// Effort to build (rank). Impact/urgency (rank). Both ranked low → high.
export const Complexity = z.enum(["low", "medium", "high"]);
export const Priority = z.enum(["low", "medium", "high"]);
// internal = posted here · external = discovered OSS repo · initiative = known relief site (link-out, PII-gated)
export const ProjectSource = z.enum(["internal", "external", "initiative"]);
// Verified relief-resource categories for the /resources directory. Synced from the
// "Plataformas activas" Google-Sheet tab via scripts/import-platforms.mjs.
export const ResourceType = z.enum([
  "search",
  "official",
  "resources",
  "dev",
  "donation",
  "finance",
  "psychosocial",
  "telecom",
  "other",
]);

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
  // Discovery/radar fields (all optional so existing seed data stays valid).
  complexity: Complexity.optional(), // how hard to build
  priority: Priority.optional(), // impact / urgency
  use_case: z.string().min(1).max(280).optional(), // who it's for / when it's used
  stars: z.number().int().nonnegative().optional(), // GitHub stargazers (external repos)
  contributors: z.number().int().nonnegative().optional(), // GitHub repo contributor count (cached at attach/import)
  progress: z.number().int().min(0).max(100).optional(), // 0–100% build progress
  votes: z.number().int().nonnegative().default(0), // community upvotes → prioritization
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

// What the "add yourself" form posts; server fills the id.
export const BuilderInputSchema = BuilderSchema.omit({ id: true });

// Team membership: a person joining a project (hackathon-open, no auth). Names are
// runtime PII (data/memberships.json is gitignored). Linked to a Builder by name
// when it lines up; free-text otherwise.
export const MembershipSchema = z.object({
  project_slug: z.string().min(1).max(120),
  name: z.string().min(1).max(80),
  role: z.string().max(80).default(""),
  created_at: z.string().datetime().optional(),
});

// What the "I'm building this" form posts; server fills created_at.
export const MembershipInputSchema = MembershipSchema.omit({ created_at: true });

// A verified relief resource (link-out or contact). Distinct from Project: these are
// vetted platforms/orgs/lines to USE, not buildable hackathon projects. See /resources.
export const ResourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(160),
  type: ResourceType,
  url: httpsUrl.optional(), // primary https link when the resource is a website
  contact: z.string().min(1).max(160).optional(), // phone / account for offline channels
  summary: z.string().max(600).default(""),
  languages: z.array(Locale).default([]),
  verified_source: z.string().max(120).default(""), // who vouches for it (e.g. "UNICEF")
  active: z.boolean().default(true),
});

export const ProjectsFileSchema = z.array(ProjectSchema);
export const ResourcesFileSchema = z.array(ResourceSchema);
export const BuildersFileSchema = z.array(BuilderSchema);
export const MembershipsFileSchema = z.array(MembershipSchema);
