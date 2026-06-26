import type { z } from "zod";
import type {
  ProjectSchema,
  ProjectInputSchema,
  BuilderSchema,
  NeedsSchema,
  Locale,
  ProjectStatus,
  NeedType,
  ProjectSource,
} from "./schemas";

export type Locale = z.infer<typeof Locale>;
export type ProjectStatus = z.infer<typeof ProjectStatus>;
export type NeedType = z.infer<typeof NeedType>;
export type ProjectSource = z.infer<typeof ProjectSource>;
export type Needs = z.infer<typeof NeedsSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectInput = z.infer<typeof ProjectInputSchema>;
export type Builder = z.infer<typeof BuilderSchema>;

export type ProjectFilter = {
  category?: string;
  stack?: string;
  language?: Locale;
  status?: ProjectStatus;
  need?: NeedType;
};
