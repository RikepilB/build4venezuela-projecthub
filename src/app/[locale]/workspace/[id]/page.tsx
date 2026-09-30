import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isLocale } from "@/lib/i18n/config";
import { SharedWorkspaceApp } from "@/components/workspace/SharedWorkspaceApp";

export const metadata: Metadata = { title: "Shared workspace · ProjectHub", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function SharedWorkspacePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !z.uuid().safeParse(id).success) notFound();
  return <SharedWorkspaceApp id={id} locale={locale} />;
}
