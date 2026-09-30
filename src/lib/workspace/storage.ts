import { WorkspaceStoreSchema, type WorkspaceStore } from "./schema";

export const STORAGE_KEY = "projecthub.workspaces.v1";
const EMPTY: WorkspaceStore = { version: 1, workspaces: [] };
export type StoragePort = Pick<Storage, "getItem" | "setItem">;

export function readWorkspaces(raw: string | null): WorkspaceStore {
  return raw === null ? EMPTY : WorkspaceStoreSchema.parse(JSON.parse(raw));
}

export class WorkspaceConflict extends Error {}

export function saveWorkspaces(storage: StoragePort, expected: string | null, next: WorkspaceStore) {
  const data = WorkspaceStoreSchema.parse(next);
  if (storage.getItem(STORAGE_KEY) !== expected) throw new WorkspaceConflict("Workspace changed in another tab");
  const raw = JSON.stringify(data);
  storage.setItem(STORAGE_KEY, raw);
  return raw;
}
