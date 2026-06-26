import { jsonProjectRepository, type ProjectRepository } from "./projects.repo";
import { jsonBuilderRepository, type BuilderRepository } from "./builders.repo";

// Backend selector — the single swap point for P1 (Supabase).
// DATA_BACKEND=json (default) | supabase (not yet implemented).
const backend = process.env.DATA_BACKEND ?? "json";

export const projectRepository: ProjectRepository = jsonProjectRepository;
export const builderRepository: BuilderRepository = jsonBuilderRepository;
export const dataBackend = backend;
