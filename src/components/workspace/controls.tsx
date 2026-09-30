import type { ReactNode } from "react";

export const inputClass = "mt-1.5 min-h-11 w-full min-w-0 rounded-token border border-border bg-bg px-3 py-2 text-base text-text";
export const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-token border border-border px-3 py-2 text-sm font-medium text-text transition hover:border-primary hover:text-primary disabled:opacity-50";
export const primaryClass = "inline-flex min-h-11 items-center justify-center rounded-token bg-primary px-4 py-2 text-sm font-semibold text-primary-ink transition hover:opacity-90 disabled:opacity-50";

export function Field({ title, children }: { title: string; children: ReactNode }) {
  return <label className="block min-w-0 text-sm font-medium text-muted">{title}{children}</label>;
}

export function downloadFile(contents: string, name: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  // Allow the browser to start consuming the blob before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function displayDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
