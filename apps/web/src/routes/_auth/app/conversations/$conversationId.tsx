import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ConversationsPage } from "@/components/conversations/ConversationsPage";
import type { AssigneeType } from "@/lib/conversations";
import type { StatusChip } from "@/components/conversations/ConversationList";

export const Route = createFileRoute("/_auth/app/conversations/$conversationId")({
  validateSearch: (search) =>
    z
      .object({
        status: z.enum(["open", "pending", "resolved", "snoozed", "all"]).optional(),
        assignee: z.enum(["me", "unassigned", "all"]).optional(),
        q: z.string().optional(),
      })
      .parse(search),
  component: ConversationView,
});

function ConversationView() {
  const { conversationId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <ConversationsPage
      selectedId={Number(conversationId)}
      filters={{
        status: (search.status ?? "open") as StatusChip,
        assignee: (search.assignee ?? "me") as AssigneeType,
        query: search.q ?? "",
      }}
      onFilters={(filters) =>
        navigate({
          search: {
            status: filters.status,
            assignee: filters.assignee,
            q: filters.query || undefined,
          },
          replace: true,
        })
      }
    />
  );
}
