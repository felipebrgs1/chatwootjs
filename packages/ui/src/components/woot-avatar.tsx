import { cn } from "@my-better-t-app/ui/lib/utils";

const COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-600",
] as const;

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return COLORS[hash % COLORS.length]!;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${second}`.toUpperCase();
}

export interface WootAvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Avatar com iniciais (fallback) — igual ao do Chatwoot. */
export function WootAvatar({ name, src, size = "md", className }: WootAvatarProps) {
  const sizeClass =
    size === "sm" ? "size-6 text-[10px]" : size === "lg" ? "size-10 text-sm" : "size-8 text-xs";
  if (src) {
    return (
      <img src={src} alt={name} className={cn("rounded-full object-cover", sizeClass, className)} />
    );
  }
  return (
    <span
      aria-label={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        colorFor(name),
        sizeClass,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
