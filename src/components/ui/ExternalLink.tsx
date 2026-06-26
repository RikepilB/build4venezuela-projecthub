// Clear, consistent external link: accent color + underline + a small ↗ symbol
// so outbound links are visually obvious. URLs are https-validated upstream
// (schema), still set rel for safety. See CLAUDE.md "External links".
const REL = "noopener noreferrer nofollow";

export function ExternalLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel={REL}
      className={`inline-flex items-center gap-1 text-accent underline decoration-accent/40 underline-offset-2 transition hover:decoration-accent ${className}`}
    >
      <span>{children}</span>
      <span aria-hidden className="text-[0.7em] leading-none">
        ↗
      </span>
    </a>
  );
}
