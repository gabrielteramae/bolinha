import { createFileRoute } from "@tanstack/react-router";
import { BolinhaGame } from "@/components/bolinha-game";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <BolinhaGame />;
}
