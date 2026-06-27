import { jsonProjectRepository, type ProjectRepository } from "./projects.repo";
import { jsonBuilderRepository, type BuilderRepository } from "./builders.repo";
import { jsonMembershipRepository, type MembershipRepository } from "./memberships.repo";
import { jsonResourceRepository, type ResourceRepository } from "./resources.repo";
import { jsonCommunityRepository, type CommunityRepository } from "./communities.repo";
import { jsonReferenceRepository, type ReferenceRepository } from "./reference.repo";

// Backend selector — the single swap point for P1 (Supabase).
// DATA_BACKEND=json (default) | supabase (not yet implemented).
const backend = process.env.DATA_BACKEND ?? "json";

export const projectRepository: ProjectRepository = jsonProjectRepository;
export const builderRepository: BuilderRepository = jsonBuilderRepository;
export const membershipRepository: MembershipRepository = jsonMembershipRepository;
export const resourceRepository: ResourceRepository = jsonResourceRepository;
export const communityRepository: CommunityRepository = jsonCommunityRepository;
export const referenceRepository: ReferenceRepository = jsonReferenceRepository;
export const dataBackend = backend;
