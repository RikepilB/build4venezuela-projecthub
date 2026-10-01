import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { projectRepository } from "@/lib/repository";
import { WorkspaceSelection } from "@/components/workspace/WorkspaceSelection";

export const metadata: Metadata = { title: "ProjectHub workspace · El Umbral", robots: { index: false } };

export default async function WorkspacePage({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ project?: string | string[]; event?: string | string[]; focus?: string | string[] }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { project } = await searchParams;
  const catalog = typeof project === "string" && project.length <= 120
    ? (await projectRepository.list()).find((item) => item.slug === project) : undefined;
  return <section className="space-y-7">
    <WorkspaceSelection locale={locale} starter={catalog ? { name: catalog.name, goal: catalog.summary, repoUrl: catalog.repo_url ?? "" } : undefined} />
  </section>;
}
