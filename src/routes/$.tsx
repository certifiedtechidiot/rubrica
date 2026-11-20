import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import Rubrica from "../Rubrica";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "Rubrica — AI Teacher Gradebook & Performance Profiles" },
      {
        name: "description",
        content:
          "Rubrica Gradebook: Classrooms, students, AI paper evaluations, scores, and longitudinal error analytics in one unified workspace.",
      },
      { property: "og:title", content: "Rubrica — AI Teacher Gradebook" },
      {
        property: "og:description",
        content: "Students, classrooms, AI paper evaluations, scores, and longitudinal feedback in one place.",
      },
      { property: "og:url", content: "https://rubrica.in/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://rubrica.in/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://rubrica.in/og-image.png" },
    ],
    links: [
      { rel: "canonical", href: "https://rubrica.in/" },
    ],
  }),
  component: Splat,
});

function Splat() {
  return (
    <ClientOnly fallback={null}>
      <Rubrica />
    </ClientOnly>
  );
}