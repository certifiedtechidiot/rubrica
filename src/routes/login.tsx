import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import Rubrica from "../Rubrica";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Rubrica — Sign In & Register" },
      { name: "description", content: "Sign in to Rubrica or create an account." },
    ],
  }),
  component: LoginRoute,
});

function LoginRoute() {
  return (
    <ClientOnly fallback={null}>
      <Rubrica />
    </ClientOnly>
  );
}
