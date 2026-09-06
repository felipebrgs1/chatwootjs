import { apiFetch } from "@/lib/auth";

// Client de campanhas (M7).

export interface Campaign {
  id: number;
  display_id: number | null;
  title: string;
  message: string;
  description: string | null;
  campaign_type: "ongoing" | "one_off";
  campaign_status: "active" | "completed";
  enabled: boolean;
  inbox_id: number;
  inbox: { id: number; name: string; channel_type: string | null } | null;
  sender: { id: number; name: string } | null;
  trigger_rules: { url?: string; time_on_page?: number };
  audience: { labels?: string[] };
  scheduled_at: string | null;
}

export interface AudiencePreview {
  count: number;
  sample: Array<{ id: number; name: string; email: string | null }>;
}

export async function listCampaigns(accountId: number, type?: string): Promise<Campaign[]> {
  const q = type ? `?campaign_type=${type}` : "";
  const d = await apiFetch<{ campaigns: Campaign[] }>(
    `/api/v1/accounts/${accountId}/campaigns${q}`,
  );
  return d.campaigns;
}

export async function audiencePreview(accountId: number, id: number): Promise<AudiencePreview> {
  const d = await apiFetch<{ audience: AudiencePreview }>(
    `/api/v1/accounts/${accountId}/campaigns/${id}/audience`,
  );
  return d.audience;
}

export async function triggerCampaign(accountId: number, id: number): Promise<void> {
  await apiFetch(`/api/v1/accounts/${accountId}/campaigns/${id}/trigger`, { method: "POST" });
}
