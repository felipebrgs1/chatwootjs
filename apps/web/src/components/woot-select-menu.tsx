import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@chatwootjs/ui/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

/** Seletor estilo SelectMenu do Chatwoot v4: botão faded com chevron e
 * menu flutuante com check no valor ativo. */
export function WootSelectMenu({
  value,
  options,
  onChange,
  align = "right",
  className,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div ref={ref} className={cn("relative flex w-fit", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 max-w-40 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 text-sm text-woot-slate-12 transition-colors hover:bg-muted",
          open && "bg-muted",
        )}
      >
        <span className="truncate">{active?.label ?? "—"}</span>
        <ChevronDown className="size-4 flex-shrink-0 text-woot-slate-11" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full z-40 mt-1 flex min-w-36 flex-col gap-0.5 rounded-lg border border-border bg-background p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex h-7 items-center gap-2 rounded-md px-2 text-sm transition-colors hover:bg-muted",
                option.value === value
                  ? "bg-woot-slate-3/70 text-woot-slate-12"
                  : "text-woot-slate-11",
              )}
            >
              <span className="flex-grow truncate text-start">{option.label}</span>
              {option.value === value && (
                <Check className="size-3.5 flex-shrink-0 text-woot-slate-11" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
