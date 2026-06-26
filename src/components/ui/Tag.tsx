export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-muted">
      {children}
    </span>
  );
}
