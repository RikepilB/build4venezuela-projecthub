// Non-server module: a "use server" file may only export async functions, so the
// shared state type/value live here and are imported by both the action and the form.
export interface BuilderSubmitState {
  ok: boolean;
  error?: "validation" | "save_failed" | "spam";
  fieldErrors?: Record<string, string>;
}

export const initialBuilderSubmitState: BuilderSubmitState = { ok: false };
