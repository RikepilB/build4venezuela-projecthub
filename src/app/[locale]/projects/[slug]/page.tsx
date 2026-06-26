import { notFound } from "next/navigation";
import { isLocale, getDictionary } from "@/lib/i18n/config";
import { projectRepository } from "@/lib/repository";
import { ProjectDetail } from "@/components/project/ProjectDetail";

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

  return <ProjectDetail project={project} locale={locale} dict={dict} />;
}
