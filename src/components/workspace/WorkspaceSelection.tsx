"use client";

import { useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/types";
import type { ProjectStarter } from "./ProjectForm";
import { WorkspaceApp } from "./WorkspaceApp";

export function WorkspaceSelection({ locale, starter }: { locale: Locale; starter?: ProjectStarter }) {
  const params = useSearchParams();
  const selection = (name: string) => {
    const value = params.get(name);
    return value && value.length <= 36 ? value : undefined;
  };
  const event = selection("event");
  const focus = selection("focus");
  // Read the live router URL: Back can restore a cached page with older server props.
  return <WorkspaceApp locale={locale} starter={starter} selection={{ event, focus }} />;
}
