import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/app/settings/audit-logs")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_auth/app/settings/audit-logs"!</div>;
}
