import { Link } from "@tanstack/react-router";

/**
 * Shell das páginas de auth espelhando o Chatwoot original
 * (`v3/views/login/Index.vue`, `v3/views/auth/reset/password/Index.vue`):
 * página com tinta da marca, logo centralizado, título grande e card branco
 * `max-w-lg` com `p-11`.
 */
export function AuthPageShell({
  title,
  subtitle,
  children,
}: {
  /** Título grande acima do card (login). Omitido no reset (título dentro do card). */
  title?: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-svh w-full flex-col bg-[#f4f8fd] py-20 sm:px-6 lg:px-8 dark:bg-background">
      {title ? (
        <section className="mx-auto max-w-5xl">
          <img
            src="/brand-assets/logo.svg"
            alt="Chatwoot"
            className="mx-auto block h-8 w-auto dark:hidden"
          />
          <img
            src="/brand-assets/logo_dark.svg"
            alt="Chatwoot"
            className="mx-auto hidden h-8 w-auto dark:block"
          />
          <h2 className="mt-6 text-center text-3xl font-medium text-foreground">{title}</h2>
          {subtitle}
        </section>
      ) : null}
      <section className="mt-11 bg-white p-11 shadow-lg sm:mx-auto sm:w-full sm:max-w-lg sm:rounded-lg dark:bg-card dark:shadow-none dark:outline dark:outline-1 dark:outline-border">
        {children}
      </section>
    </main>
  );
}

export function AuthSubtitleLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="lowercase text-woot-blue hover:underline">
      {children}
    </Link>
  );
}
