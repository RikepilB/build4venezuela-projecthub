export function SkipLink({ label }: { label: string }) {
  return (
    <a
      href="#main"
      className="sr-only rounded-token bg-primary px-4 py-2 font-medium text-primary-ink focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      {label}
    </a>
  );
}
