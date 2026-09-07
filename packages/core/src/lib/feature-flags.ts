// Gerado do Chatwoot (pino D0): config/features.yml.
// Bit i (1-based) da coluna = 2n-1. NUNCA reordenar (ver cabeçalho do yml).
export interface FeatureDef {
  name: string;
  column: "feature_flags" | "feature_flags_ext_1";
  bit: number;
  defaultOn: boolean;
}

export const FEATURES: FeatureDef[] = [
  { name: "inbound_emails", column: "feature_flags", bit: 1, defaultOn: true },
  { name: "channel_email", column: "feature_flags", bit: 2, defaultOn: true },
  { name: "channel_facebook", column: "feature_flags", bit: 3, defaultOn: true },
  { name: "conversation_unread_counts", column: "feature_flags", bit: 4, defaultOn: false },
  { name: "ip_lookup", column: "feature_flags", bit: 5, defaultOn: false },
  { name: "disable_branding", column: "feature_flags", bit: 6, defaultOn: false },
  { name: "email_continuity_on_api_channel", column: "feature_flags", bit: 7, defaultOn: false },
  { name: "help_center", column: "feature_flags", bit: 8, defaultOn: true },
  { name: "agent_bots", column: "feature_flags", bit: 9, defaultOn: true },
  { name: "macros", column: "feature_flags", bit: 10, defaultOn: true },
  { name: "agent_management", column: "feature_flags", bit: 11, defaultOn: true },
  { name: "team_management", column: "feature_flags", bit: 12, defaultOn: true },
  { name: "inbox_management", column: "feature_flags", bit: 13, defaultOn: true },
  { name: "labels", column: "feature_flags", bit: 14, defaultOn: true },
  { name: "custom_attributes", column: "feature_flags", bit: 15, defaultOn: true },
  { name: "automations", column: "feature_flags", bit: 16, defaultOn: true },
  { name: "canned_responses", column: "feature_flags", bit: 17, defaultOn: true },
  { name: "integrations", column: "feature_flags", bit: 18, defaultOn: true },
  { name: "voice_recorder", column: "feature_flags", bit: 19, defaultOn: true },
  { name: "report_rollup", column: "feature_flags", bit: 20, defaultOn: false },
  { name: "channel_website", column: "feature_flags", bit: 21, defaultOn: true },
  { name: "campaigns", column: "feature_flags", bit: 22, defaultOn: true },
  { name: "reports", column: "feature_flags", bit: 23, defaultOn: true },
  { name: "crm", column: "feature_flags", bit: 24, defaultOn: true },
  { name: "auto_resolve_conversations", column: "feature_flags", bit: 25, defaultOn: true },
  { name: "custom_reply_email", column: "feature_flags", bit: 26, defaultOn: false },
  { name: "custom_reply_domain", column: "feature_flags", bit: 27, defaultOn: false },
  { name: "audit_logs", column: "feature_flags", bit: 28, defaultOn: false },
  { name: "custom_tools", column: "feature_flags", bit: 29, defaultOn: false },
  { name: "message_reply_to", column: "feature_flags", bit: 30, defaultOn: false },
  { name: "branded_email_templates", column: "feature_flags", bit: 31, defaultOn: false },
  { name: "inbox_view", column: "feature_flags", bit: 32, defaultOn: false },
  { name: "sla", column: "feature_flags", bit: 33, defaultOn: false },
  { name: "help_center_embedding_search", column: "feature_flags", bit: 34, defaultOn: false },
  { name: "linear_integration", column: "feature_flags", bit: 35, defaultOn: false },
  { name: "captain_integration", column: "feature_flags", bit: 36, defaultOn: false },
  { name: "custom_roles", column: "feature_flags", bit: 37, defaultOn: false },
  { name: "chatwoot_v4", column: "feature_flags", bit: 38, defaultOn: true },
  { name: "captain_v1_action_classifier", column: "feature_flags", bit: 39, defaultOn: false },
  { name: "contact_chatwoot_support_team", column: "feature_flags", bit: 40, defaultOn: true },
  { name: "shopify_integration", column: "feature_flags", bit: 41, defaultOn: false },
  { name: "search_with_gin", column: "feature_flags", bit: 42, defaultOn: false },
  { name: "channel_instagram", column: "feature_flags", bit: 43, defaultOn: true },
  { name: "crm_integration", column: "feature_flags", bit: 44, defaultOn: false },
  { name: "channel_voice", column: "feature_flags", bit: 45, defaultOn: false },
  { name: "notion_integration", column: "feature_flags", bit: 46, defaultOn: false },
  { name: "captain_integration_v2", column: "feature_flags", bit: 47, defaultOn: false },
  { name: "whatsapp_embedded_signup", column: "feature_flags", bit: 48, defaultOn: false },
  { name: "whatsapp_campaign", column: "feature_flags", bit: 49, defaultOn: false },
  { name: "crm_v2", column: "feature_flags", bit: 50, defaultOn: false },
  { name: "assignment_v2", column: "feature_flags", bit: 51, defaultOn: true },
  { name: "captain_document_auto_sync", column: "feature_flags", bit: 52, defaultOn: false },
  { name: "advanced_search", column: "feature_flags", bit: 53, defaultOn: false },
  { name: "saml", column: "feature_flags", bit: 54, defaultOn: false },
  { name: "advanced_search_indexing", column: "feature_flags", bit: 55, defaultOn: false },
  { name: "reply_mailer_migration", column: "feature_flags", bit: 56, defaultOn: false },
  { name: "unread_count_for_filters", column: "feature_flags", bit: 57, defaultOn: false },
  { name: "companies", column: "feature_flags", bit: 58, defaultOn: false },
  { name: "channel_tiktok", column: "feature_flags", bit: 59, defaultOn: true },
  { name: "csat_review_notes", column: "feature_flags", bit: 60, defaultOn: false },
  { name: "captain_tasks", column: "feature_flags", bit: 61, defaultOn: true },
  { name: "conversation_required_attributes", column: "feature_flags", bit: 62, defaultOn: false },
  { name: "advanced_assignment", column: "feature_flags", bit: 63, defaultOn: false },
  { name: "whatsapp_manual_transfer", column: "feature_flags_ext_1", bit: 1, defaultOn: false },
  { name: "data_import", column: "feature_flags_ext_1", bit: 2, defaultOn: false },
  { name: "api_and_webhooks", column: "feature_flags_ext_1", bit: 3, defaultOn: true },
  { name: "whatsapp_reconfigure", column: "feature_flags_ext_1", bit: 4, defaultOn: false },
  {
    name: "whatsapp_embedded_signup_inbox_creation",
    column: "feature_flags_ext_1",
    bit: 5,
    defaultOn: false,
  },
  { name: "delayed_automations", column: "feature_flags_ext_1", bit: 6, defaultOn: false },
];

export function flagsToObject(
  ff: bigint | number | null | undefined,
  ext1: bigint | number | null | undefined,
): Record<string, boolean> {
  const b0 = BigInt(ff ?? 0);
  const b1 = BigInt(ext1 ?? 0);
  const out: Record<string, boolean> = {};
  for (const f of FEATURES) {
    const bits = f.column === "feature_flags" ? b0 : b1;
    out[f.name] = (bits & (1n << BigInt(f.bit - 1))) !== 0n;
  }
  // Alias nosso (v1): captain liga se qualquer integração captain ativa.
  out["captain_enabled"] = !!(out["captain_integration"] || out["captain_integration_v2"]);
  return out;
}

export function defaultFeatureFlags(): { featureFlags: bigint; featureFlagsExt1: bigint } {
  let ff = 0n;
  let ext1 = 0n;
  for (const f of FEATURES) {
    if (!f.defaultOn) continue;
    if (f.column === "feature_flags") ff |= 1n << BigInt(f.bit - 1);
    else ext1 |= 1n << BigInt(f.bit - 1);
  }
  return { featureFlags: ff, featureFlagsExt1: ext1 };
}
