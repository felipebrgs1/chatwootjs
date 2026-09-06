import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ConversationsPage } from "@/components/conversations/ConversationsPage";
import type { AssigneeType } from "@/lib/conversations";
import type { StatusChip } from "@/components/conversations/ConversationList";

export const Route = createFileRoute("/_auth/app/")({
  validateSearch: (search) =>
    z
      .object({
        status: z.enum(["open", "pending", "resolved", "snoozed", "all"]).optional(),
        assignee: z.enum(["me", "unassigned", "all"]).optional(),
        q: z.string().optional(),
        inbox_id: z.coerce.number().optional(),
        labels: z.array(z.string()).optional(),
      })
      .parse(search),
  component: ConversationsHome,
});

function ConversationsHome() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ConversationsPage
      selectedId={null}
      filters={{
        status: (search.status ?? "open") as StatusChip,
        assignee: (search.assignee ?? "me") as AssigneeType,
        query: search.q ?? "",
        inboxId: search.inbox_id,
        labels: search.labels,
      }}
      onFilters={(filters) =>
        navigate({
          search: {
            status: filters.status,
            assignee: filters.assignee,
            q: filters.query || undefined,
            inbox_id: filters.inboxId,
            labels: filters.labels?.length ? filters.labels : undefined,
          },
          replace: true,
        })
      }
    />
  );
}
