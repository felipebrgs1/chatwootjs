import { createFileRoute } from "@tanstack/react-router";

import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_auth/app/contacts")({
  component: () => (
    <StubPage
      title="Contatos"
      module="M3"
      description="CRM de contatos: busca, labels, atributos custom e importação CSV."
    />
  ),
});
