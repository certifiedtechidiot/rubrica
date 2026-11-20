import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import Rubrica from "../Rubrica";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Rubrica — Portal & Dashboard" },
      { name: "description", content: "Access your Rubrica student or teacher workspace." },
    ],
  }),
  component: AppRoute,
});

function AppRoute() {
  return (
    <ClientOnly fallback={null}>
      <Rubrica />
    </ClientOnly>
  );
}
