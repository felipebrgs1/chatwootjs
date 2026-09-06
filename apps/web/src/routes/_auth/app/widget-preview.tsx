import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

export const Route = createFileRoute("/_auth/app/widget-preview")({
  component: WidgetPreview,
});

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

/** Preview/debug do widget (M5): carrega o widget.js real contra a API. */
function WidgetPreview() {
  const [token, setToken] = useState("");
  const [loaded, setLoaded] = useState<string | null>(null);

  function load(): void {
    if (!token.trim()) return;
    // Recria o snippet como em HTML estático.
    for (const el of document.querySelectorAll("[data-widget-preview]")) el.remove();
    const settings = document.createElement("script");
    settings.textContent = `window.chatwootSettings = { websiteToken: ${JSON.stringify(token.trim())} };`;
    settings.setAttribute("data-widget-preview", "");
    const loader = document.createElement("script");
    loader.src = `${SERVER_URL}/widget.js`;
    loader.defer = true;
    loader.setAttribute("data-widget-preview", "");
    document.body.append(settings, loader);
    setLoaded(token.trim());
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-lg font-semibold">Preview do widget</h1>
        <p className="text-sm text-muted-foreground">
          Carrega o <code>widget.js</code> real nesta página (debug M5).
        </p>
      </header>
      <main className="grid max-w-xl content-start gap-3 p-6">
        <div className="grid gap-1.5">
          <Label htmlFor="website_token">Website token</Label>
          <div className="flex gap-2">
            <Input
              id="website_token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="token da inbox Website"
            />
            <Button onClick={load}>Carregar</Button>
          </div>
        </div>
        {loaded && (
          <p className="text-sm text-muted-foreground">
            Widget carregado com token <code>{loaded}</code> — procure a bolha no canto inferior
            direito. Recarregue a página para trocar de token.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          Página estática equivalente:{" "}
          <a
            className="text-woot-blue hover:underline"
            href={`${SERVER_URL}/widget-demo${token ? `?website_token=${encodeURIComponent(token)}` : ""}`}
            target="_blank"
            rel="noreferrer"
          >
            /widget-demo
          </a>
        </p>
      </main>
    </div>
  );
}
