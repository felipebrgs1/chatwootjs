import { createFileRoute } from "@tanstack/react-router";

import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_auth/app/campaigns")({
  component: () => (
    <StubPage
      title="Campanhas"
      module="M7"
      description="Campanhas ongoing (widget) e one-off (disparo em massa)."
    />
  ),
});
