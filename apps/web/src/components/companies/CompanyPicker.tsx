import { Building2, Search, X } from "lucide-react";
import { useRef, useState } from "react";

import { apiFetch } from "@/lib/auth";

export interface PickedCompany {
  id: number;
  name: string;
  domain: string | null;
}

/**
 * Seletor de empresa 1:1 com CompanySelector do v4: busca, escolhe e permite
 * desvincular. Usado no form do contato.
 */
export function CompanyPicker({
  accountId,
  value,
  onChange,
  inputId = "company-picker",
}: {
  accountId: number;
  value: PickedCompany | null;
  onChange: (company: PickedCompany | null) => void;
  inputId?: string;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedCompany[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(term: string): void {
    setQ(term);
    if (timer.current) clearTimeout(timer.current);
    if (!term.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => {
      void apiFetch<{ companies: PickedCompany[] }>(
        `/api/v1/accounts/${accountId}/companies/search?q=${encodeURIComponent(term.trim())}`,
      )
        .then((d) => {
          setResults(d.companies);
          setOpen(true);
        })
        .catch(() => {});
    }, 300);
  }

  if (value) {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-woot-slate-3/60 px-2.5 py-1.5 text-sm text-woot-slate-12">
        <Building2 className="size-4 text-woot-slate-10" />
        <span className="font-medium">{value.name}</span>
        {value.domain && <span className="text-xs text-woot-slate-11">{value.domain}</span>}
        <button
          type="button"
          aria-label="Desvincular empresa"
          onClick={() => onChange(null)}
          className="text-woot-slate-10 hover:text-woot-slate-12"
        >
          <X className="size-3.5" />
        </button>
      </span>
    );
  }

  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
      <input
        id={inputId}
        value={q}
        onChange={(e) => search(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar empresa..."
        autoComplete="off"
        className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pl-8 text-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 md:text-xs dark:bg-input/30"
      />
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
          {results.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhuma empresa.</p>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c);
                  setQ("");
                  setResults([]);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
              >
                <Building2 className="size-4 shrink-0 text-woot-slate-10" />
                <span className="min-w-0 flex-1 truncate text-start font-medium text-woot-slate-12">
                  {c.name}
                </span>
                {c.domain && (
                  <span className="truncate text-[11px] text-woot-slate-11">{c.domain}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
