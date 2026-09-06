import { cn } from "@chatwootjs/ui/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  resolved: "bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
  snoozed: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  all: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  pending: "Pendente",
  resolved: "Resolvida",
  snoozed: "Adiada",
  all: "Todas",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        STATUS_STYLES[key] ?? STATUS_STYLES.all,
        className,
      )}
    >
      {STATUS_LABELS[key] ?? status}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  low: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const key = priority.toLowerCase();
  if (key === "none" || !PRIORITY_STYLES[key]) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        PRIORITY_STYLES[key],
        className,
      )}
    >
      {PRIORITY_LABELS[key] ?? priority}
    </span>
  );
}
