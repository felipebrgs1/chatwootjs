import { createFileRoute } from "@tanstack/react-router";

import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_auth/app/reports")({
  component: () => (
    <StubPage
      title="Relatórios"
      module="M8"
      description="Overview, por agente/team/inbox/label e CSAT."
    />
  ),
});
