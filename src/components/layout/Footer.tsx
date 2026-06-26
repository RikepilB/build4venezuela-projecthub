export function Footer({ note }: { note: string }) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-muted">
        {note}
      </div>
    </footer>
  );
}
