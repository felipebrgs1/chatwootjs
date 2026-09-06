import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/app/settings/")({
  component: () => <Navigate to="/app/settings/general" />,
});
