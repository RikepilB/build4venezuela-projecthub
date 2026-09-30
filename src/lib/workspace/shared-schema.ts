import { z } from "zod";
import { WorkspaceSchema } from "./schema";

export const SharedRole = z.enum(["owner", "editor", "viewer"]);
export const SharedWorkspaceSchema = z.object({
  workspace: WorkspaceSchema,
  revision: z.number().int().positive(),
  role: SharedRole,
  userId: z.uuid(),
  updatedAt: z.string(),
  members: z.array(z.object({ userId: z.uuid(), label: z.string(), role: SharedRole })),
  invitations: z.array(z.object({ id: z.uuid(), role: z.enum(["editor", "viewer"]), expiresAt: z.string() })),
  activity: z.array(z.object({ action: z.string(), revision: z.number(), at: z.string() })),
});
export const SharedListSchema = z.array(z.object({ id: z.uuid(), name: z.string(), role: SharedRole, updatedAt: z.string() }));
export const CreateSharedSchema = z.object({ workspace: WorkspaceSchema, label: z.string().trim().min(1).max(80) });
export const SharedMutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), revision: z.number().int().positive(), document: WorkspaceSchema }),
  z.object({ action: z.literal("join"), token: z.string().regex(/^[a-f0-9]{64}$/), label: z.string().trim().min(1).max(80) }),
  z.object({ action: z.literal("invite"), role: z.enum(["editor", "viewer"]) }),
  z.object({ action: z.literal("revoke_invite"), id: z.uuid() }),
  z.object({ action: z.literal("remove_member"), userId: z.uuid() }),
  z.object({ action: z.literal("recovery") }),
]);
export type SharedWorkspace = z.infer<typeof SharedWorkspaceSchema>;
export type SharedMutation = z.infer<typeof SharedMutationSchema>;
