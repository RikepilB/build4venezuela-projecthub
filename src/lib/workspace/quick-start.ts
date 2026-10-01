import { z } from "zod";
import type { Locale } from "@/lib/types";
import { workspaceCopy } from "./copy";
import { newProject } from "./domain";
import { TaskSchema, WorkProjectSchema, WorkspaceMode, WorkspaceSchema, type Mode, type Workspace } from "./schema";

export const QuickStartInputSchema = z.object({
  projectName: WorkProjectSchema.shape.name,
  goal: WorkProjectSchema.shape.goal,
  eventName: z.union([WorkProjectSchema.shape.name, z.string().trim().length(0)]).optional(),
  context: WorkProjectSchema.shape.context,
  owner: TaskSchema.shape.owner.optional(),
  mode: WorkspaceMode,
  durationHours: z.union([z.literal(6), z.literal(24), z.literal(48)]).optional(),
});

export type QuickStartInput = z.infer<typeof QuickStartInputSchema>;

const starterTasks: Record<Locale, Record<Mode, string[]>> = {
  en: {
    planned: ["Agree on the smallest scope", "Build and test the main journey", "Prepare the demo and submission"],
    rapid: ["Choose one useful outcome", "Build and test the smallest version", "Document the result and next step"],
    crisis: ["Verify the need and source with a coordinator", "Build and test with an intended user", "Record limitations and name a maintainer"],
  },
  es: {
    planned: ["Acordar el alcance mínimo", "Construir y probar el recorrido principal", "Preparar la demo y la entrega"],
    rapid: ["Elegir un resultado útil", "Construir y probar la versión mínima", "Documentar el resultado y el próximo paso"],
    crisis: ["Verificar la necesidad y la fuente con un coordinador", "Construir y probar con un usuario previsto", "Registrar límites e identificar responsable de mantenimiento"],
  },
};

export function createQuickWorkspace(input: QuickStartInput, locale: Locale, id: () => string, now: string): Workspace {
  const values = QuickStartInputSchema.parse(input);
  const updatedAt = WorkspaceSchema.shape.updatedAt.parse(now);
  const project = newProject(values.projectName, workspaceCopy[locale].templates[values.mode], id);
  project.goal = values.goal;
  if (values.context !== undefined) project.context = values.context;
  project.tasks = starterTasks[locale][values.mode].map((title) => ({
    id: id(), title, owner: values.owner ?? "", status: "todo", priority: "normal", dueAt: "", blocker: "",
  }));
  return WorkspaceSchema.parse({
    id: id(), name: values.eventName || (locale === "es" ? "Hackathon rápido" : "Quick hackathon"),
    mode: values.mode, objective: values.goal,
    deadline: values.durationHours ? new Date(Date.parse(updatedAt) + values.durationHours * 3_600_000).toISOString() : "",
    projects: [project], updatedAt,
  });
}
