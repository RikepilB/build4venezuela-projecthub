import type { z } from "zod";
import type {
  ProjectSchema,
  ProjectInputSchema,
  BuilderSchema,
  BuilderInputSchema,
  MembershipSchema,
  MembershipInputSchema,
  NeedsSchema,
  Locale,
  ProjectStatus,
  NeedType,
  ProjectSource,
  Complexity,
  Priority,
  ResourceType,
  ResourceSchema,
  CommunityType,
  CommunitySchema,
  ReferenceCategory,
  ReferenceProjectSchema,
} from "./schemas";

export type Locale = z.infer<typeof Locale>;
export type ProjectStatus = z.infer<typeof ProjectStatus>;
export type NeedType = z.infer<typeof NeedType>;
export type ProjectSource = z.infer<typeof ProjectSource>;
export type Complexity = z.infer<typeof Complexity>;
export type Priority = z.infer<typeof Priority>;
export type Needs = z.infer<typeof NeedsSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectInput = z.infer<typeof ProjectInputSchema>;
export type Builder = z.infer<typeof BuilderSchema>;
export type BuilderInput = z.infer<typeof BuilderInputSchema>;
export type Membership = z.infer<typeof MembershipSchema>;
export type MembershipInput = z.infer<typeof MembershipInputSchema>;
export type ResourceType = z.infer<typeof ResourceType>;
export type Resource = z.infer<typeof ResourceSchema>;
export type CommunityType = z.infer<typeof CommunityType>;
export type Community = z.infer<typeof CommunitySchema>;
export type ReferenceCategory = z.infer<typeof ReferenceCategory>;
export type ReferenceProject = z.infer<typeof ReferenceProjectSchema>;

export type ProjectFilter = {
  category?: string;
  stack?: string;
  language?: Locale;
  status?: ProjectStatus;
  need?: NeedType;
  complexity?: Complexity;
  priority?: Priority;
};
