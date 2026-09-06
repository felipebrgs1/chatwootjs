import { createFileRoute } from "@tanstack/react-router";

import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_auth/app/settings")({
  component: () => (
    <StubPage
      title="Configurações"
      module="M1/M2"
      description="Conta, agentes, caixas de entrada, labels, teams e integrações."
    />
  ),
});
