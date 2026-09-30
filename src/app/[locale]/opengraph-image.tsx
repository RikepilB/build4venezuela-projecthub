import { ImageResponse } from "next/og";
import { SOCIAL_PREVIEW_ID, SOCIAL_PREVIEW_SIZE, socialPreview } from "@/lib/social-preview";

export const size = SOCIAL_PREVIEW_SIZE;
export const contentType = "image/png";

export function generateImageMetadata({ params }: { params: { locale: string } }) {
  const locale = params.locale === "es" ? "es" : "en";
  return [{ id: SOCIAL_PREVIEW_ID, alt: socialPreview(locale).alt, size, contentType }];
}

const BG = "#15131b";
const PANEL = "#1b1825";
const IVORY = "#f3f0e8";
const AMBER = "#e9a64a";
const MUTED = "#a8a4b2";
const BORDER = "#383540";

const copy = {
  es: {
    headline: ["De la idea", "a la entrega."],
    description: "Organiza proyectos, tareas y entregables para cualquier hackathon.",
    example: "Proyecto de ejemplo",
    columns: ["Por hacer", "En curso", "Listo"],
    tasks: ["Preparar demo", "Crear prototipo", "Definir alcance"],
    footer: "Descubre. Organiza. Construye.",
  },
  en: {
    headline: ["From idea", "to delivery."],
    description: "Track projects, tasks and deliverables for any hackathon.",
    example: "Example project",
    columns: ["To do", "In progress", "Done"],
    tasks: ["Prepare demo", "Build prototype", "Define scope"],
    footer: "Discover. Organize. Build.",
  },
};

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const text = copy[locale === "es" ? "es" : "en"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BG,
          color: IVORY,
          padding: "48px 60px 36px",
          borderLeft: `8px solid ${AMBER}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", fontSize: 70, fontWeight: 700, letterSpacing: -3 }}>
            El Umbral
          </div>
          <div style={{ display: "flex", color: MUTED, fontSize: 20, letterSpacing: 3 }}>
            BUILD4VENEZUELA
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 508 }}>
            <div style={{ display: "flex", color: AMBER, fontSize: 32, fontWeight: 600, marginBottom: 14 }}>
              ProjectHub
            </div>
            {text.headline.map((line) => (
              <div
                key={line}
                style={{ display: "flex", fontSize: 62, fontWeight: 700, lineHeight: 1.06, letterSpacing: -2 }}
              >
                {line}
              </div>
            ))}
            <div style={{ display: "flex", color: MUTED, fontSize: 25, lineHeight: 1.35, marginTop: 20 }}>
              {text.description}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 528,
              background: PANEL,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", color: MUTED, fontSize: 18, marginBottom: 8 }}>
              HACKATHON
            </div>
            <div style={{ display: "flex", fontSize: 25, fontWeight: 600, marginBottom: 24 }}>
              {text.example}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {text.columns.map((column, index) => (
                <div key={column} style={{ display: "flex", flexDirection: "column", width: 150 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      color: index === 1 ? AMBER : MUTED,
                      fontSize: 17,
                      fontWeight: 600,
                      marginBottom: 12,
                    }}
                  >
                    {column}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      minHeight: 132,
                      padding: 16,
                      background: BG,
                      border: `1px solid ${index === 1 ? AMBER : BORDER}`,
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ display: "flex", fontSize: 22, fontWeight: 500, lineHeight: 1.2 }}>
                      {text.tasks[index]}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        width: index === 2 ? 48 : 30,
                        height: 4,
                        marginTop: 20,
                        borderRadius: 2,
                        background: index === 1 ? AMBER : BORDER,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 20,
            fontSize: 22,
          }}
        >
          <div style={{ display: "flex", color: MUTED }}>{text.footer}</div>
          <div style={{ display: "flex", color: AMBER }}>elumbralvzla.org</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
