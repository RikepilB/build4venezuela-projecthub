import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, defaultLocale, getDictionary } from "@/lib/i18n/config";
import type { Locale } from "@/lib/types";
import { projectRepository } from "@/lib/repository";
import { ProjectDetail } from "@/components/project/ProjectDetail";
import { RecruitPanel } from "@/components/project/RecruitPanel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const typed: Locale = isLocale(locale) ? locale : defaultLocale;
  const project = await projectRepository.getBySlug(slug);
  if (!project) return { title: "El Umbral" };
  return {
    title: `${project.name} · El Umbral`,
      description: project.summary?.slice(0, 160),
    alternates: {
      canonical: `/${typed}/projects/${slug}`,
      languages: { en: `/en/projects/${slug}`, es: `/es/projects/${slug}`, "x-default": `/en/projects/${slug}` },
    },
    openGraph: {
      title: `${project.name} · El Umbral`,
    description: project.summary?.slice(0, 160),
      locale: typed === "es" ? "es_VE" : "en_US",
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const project = await projectRepository.getBySlug(slug);
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ProjectDetail project={project} locale={locale} dict={dict} />
      <RecruitPanel project={project} locale={locale} dict={dict} />
    </div>
  );
}
