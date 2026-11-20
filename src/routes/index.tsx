import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import Rubrica from "../Rubrica";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rubrica — AI Handwritten Paper Evaluation & Gradebook for Teachers" },
      {
        name: "description",
        content:
          "Evaluate handwritten student papers in seconds with Rubrica AI. Vision scoring, custom syllabus rubrics, longitudinal mistake tracking & automated DPPs.",
      },
      { property: "og:title", content: "Rubrica — AI Handwritten Paper Evaluation & Gradebook" },
      {
        property: "og:description",
        content:
          "Evaluate handwritten student papers in seconds with Rubrica AI. Vision scoring, custom syllabus rubrics, longitudinal mistake tracking & automated DPPs.",
      },
      { property: "og:url", content: "https://rubrica.in/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://rubrica.in/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Rubrica — AI Handwritten Paper Evaluation & Gradebook" },
      {
        name: "twitter:description",
        content:
          "Evaluate handwritten student papers in seconds with Rubrica AI. Vision scoring, custom syllabus rubrics, longitudinal mistake tracking & automated DPPs.",
      },
      { name: "twitter:image", content: "https://rubrica.in/og-image.png" },
    ],
    links: [
      { rel: "canonical", href: "https://rubrica.in/" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={null}>
      <Rubrica />
    </ClientOnly>
  );
}