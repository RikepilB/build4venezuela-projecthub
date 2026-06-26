import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { builderRepository } from "@/lib/repository";
import { BuilderGrid } from "@/components/builders/BuilderGrid";
import { localePath } from "@/lib/i18n/href";
import { normalize } from "@/lib/text";

type SP = Record<string, string | string[] | undefined>;
const one = (v: SP[string]) => (typeof v === "string" && v ? v : undefined);
const SELECT = "rounded-token border border-border bg-surface px-3 py-2 text-sm text-text";

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export default async function BuildersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SP>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const sp = await searchParams;
  const availability = one(sp.availability);
  const timezone = one(sp.timezone);
  const stack = one(sp.stack);

  const all = await builderRepository.list();
  const availabilityOptions = uniqueSorted(all.map((b) => b.availability));
  const timezoneOptions = uniqueSorted(all.map((b) => b.timezone));
  const stackOptions = uniqueSorted(all.flatMap((b) => b.stack));

  const builders = all.filter((b) => {
    if (availability && b.availability !== availability) return false;
    if (timezone && b.timezone !== timezone) return false;
    if (stack && !b.stack.some((s) => normalize(s) === normalize(stack))) return false;
    return true;
  });

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text">{dict.builders.title}</h1>
        <p className="mt-1 text-muted">{dict.builders.subtitle}</p>
      </header>

      <form
        method="get"
        action={localePath(locale, "/builders")}
        className="flex flex-wrap items-end gap-3 rounded-token border border-border bg-surface p-4"
      >
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          {dict.builders.availability}
          <select name="availability" defaultValue={availability ?? ""} className={SELECT}>
            <option value="">{dict.builders.all}</option>
            {availabilityOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          {dict.builders.timezone}
          <select name="timezone" defaultValue={timezone ?? ""} className={SELECT}>
            <option value="">{dict.builders.all}</option>
            {timezoneOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          {dict.builders.stack}
          <select name="stack" defaultValue={stack ?? ""} className={SELECT}>
            <option value="">{dict.builders.all}</option>
            {stackOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-token bg-primary px-4 py-2 text-sm font-medium text-primary-ink hover:opacity-90"
          >
            {dict.board.filters}
          </button>
          <Link
            href={localePath(locale, "/builders")}
            className="rounded-token border border-border px-3 py-2 text-sm text-muted hover:text-text"
          >
            {dict.board.clear}
          </Link>
        </div>
      </form>

      <p className="text-sm text-muted">
        {builders.length} {dict.builders.count}
      </p>

      <BuilderGrid builders={builders} dict={dict} />
    </section>
  );
}
