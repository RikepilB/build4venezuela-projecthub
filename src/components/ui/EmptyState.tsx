export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-token border border-dashed border-border bg-surface p-8 text-center">
      <p className="text-lg font-semibold text-text">{title}</p>
      {body ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p> : null}
      {children ? <div className="mt-5 flex justify-center gap-3">{children}</div> : null}
    </div>
  );
}
