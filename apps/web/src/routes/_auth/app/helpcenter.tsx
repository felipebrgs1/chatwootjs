import { createFileRoute } from "@tanstack/react-router";

import { StubPage } from "@/components/stub-page";

export const Route = createFileRoute("/_auth/app/helpcenter")({
  component: () => (
    <StubPage
      title="Central de ajuda"
      module="M9"
      description="Portais, categorias e artigos publicados no portal público."
    />
  ),
});
