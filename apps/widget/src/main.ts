import { Widget, type ChatwootSettings } from "./widget";

declare global {
  interface Window {
    chatwootSettings?: ChatwootSettings;
    $chatwoot?: {
      setUser: (
        identifier: string,
        attrs?: { name?: string; email?: string; phone_number?: string },
      ) => void;
      reset: () => void;
      toggle: () => void;
    };
  }
}

function boot(): void {
  const settings = window.chatwootSettings;
  if (!settings?.websiteToken) return;
  const widget = new Widget(settings);
  widget.mount();
  window.$chatwoot = {
    setUser: (identifier, attrs) => widget.setUser(identifier, attrs),
    reset: () => widget.reset(),
    toggle: () => widget.toggle(),
  };
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
