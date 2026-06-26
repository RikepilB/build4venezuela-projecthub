// Clamp a build-progress value into the 0–100 integer range. Shared by the schema-fed
// ProgressBar and any caller that needs a safe percentage from untrusted input.
export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
