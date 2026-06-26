// Non-server module: a "use server" file may only export async functions, so the
// shared state type/value live here and are imported by both the action and the form.
export interface SubmitState {
  ok: boolean;
  error?: "validation" | "save_failed" | "spam";
  fieldErrors?: Record<string, string>;
}

export const initialSubmitState: SubmitState = { ok: false };
