// State for the "attach a repo to this project" action (useActionState).
export interface AttachRepoState {
  ok: boolean;
  error?: "validation" | "invalid_repo" | "save_failed" | "spam";
  fieldErrors?: Record<string, string>;
}

export const initialAttachRepoState: AttachRepoState = { ok: false };
