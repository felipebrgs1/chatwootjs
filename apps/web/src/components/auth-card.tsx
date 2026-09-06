import { Link } from "@tanstack/react-router";

import { cn } from "@my-better-t-app/ui/lib/utils";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-woot-bg p-4">
      <div className="w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-woot-blue text-base font-bold text-white">
            C
          </div>
          <div>
            <p className="font-semibold">ChatwootJS</p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
        {subtitle ? <p className={cn("mb-4 text-sm text-muted-foreground")}>{subtitle}</p> : null}
        {children}
        {footer ? (
          <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function AuthFooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="font-medium text-woot-blue hover:underline">
      {children}
    </Link>
  );
}
