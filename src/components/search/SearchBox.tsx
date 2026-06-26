import type { Locale } from "@/lib/types";
import { localePath } from "@/lib/i18n/href";

// Plain GET form → /[locale]/search?q= . Works without client JS.
export function SearchBox({
  locale,
  placeholder,
  button,
  defaultValue = "",
  autoFocus = false,
}: {
  locale: Locale;
  placeholder: string;
  button: string;
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  return (
    <form
      action={localePath(locale, "/search")}
      method="get"
      role="search"
      className="flex w-full flex-col gap-2 sm:flex-row"
    >
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        className="w-full rounded-token border border-border bg-surface px-4 py-3 text-text placeholder:text-muted"
      />
      <button
        type="submit"
        className="rounded-token bg-primary px-6 py-3 font-medium text-primary-ink hover:opacity-90"
      >
        {button}
      </button>
    </form>
  );
}
