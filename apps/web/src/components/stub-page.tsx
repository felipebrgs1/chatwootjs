import { EmptyState } from "@my-better-t-app/ui/components/empty-state";

export interface StubPageProps {
  title: string;
  module: string;
  description?: string;
}

/** Placeholder das telas reais (M1–M12) — mantém links do rail válidos. */
export function StubPage({ title, module, description }: StubPageProps) {
  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">{title}</h1>
      </header>
      <EmptyState
        title={`${title} — chega no ${module}`}
        description={description ?? "Esta tela será implementada no módulo correspondente da spec."}
      />
    </div>
  );
}
