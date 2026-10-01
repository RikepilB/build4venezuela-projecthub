"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/types";
import { localePath } from "@/lib/i18n/href";

type Props = {
  locale: Locale;
  label: string;
  ariaLabel: string;
  className: string;
  onClick?: () => void;
};

function CurrentRouteSwitch({ locale, label, ariaLabel, className, onClick }: Props) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const path = pathname.replace(/^\/(en|es)(?=\/|$)/, `/${locale}`);
  const href = search ? `${path}?${search}` : path;

  return <Link href={href} aria-label={ariaLabel} className={className} onClick={onClick}>{label}</Link>;
}

export function LocaleSwitch(props: Props) {
  // Query-aware navigation stays inside its own boundary on prerendered pages.
  return (
    <Suspense fallback={<Link href={localePath(props.locale)} aria-label={props.ariaLabel} className={props.className} onClick={props.onClick}>{props.label}</Link>}>
      <CurrentRouteSwitch {...props} />
    </Suspense>
  );
}
