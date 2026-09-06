const BASE_PATH = "/public/api/v1/widgets";

export interface WidgetConfig {
  website_token: string;
  inbox_name: string;
  widget_color: string;
  welcome_title: string | null;
  welcome_tagline: string | null;
  greeting_enabled: boolean;
  greeting_message: string | null;
  pre_chat_form_enabled: boolean;
  csat_survey_enabled: boolean;
  working_hours_enabled: boolean;
  out_of_office_message: string | null;
  allow_messages_after_resolved: boolean;
  ongoing_campaigns: Array<{
    id: number;
    title: string;
    message: string;
    trigger_rules: { url?: string; time_on_page?: number };
  }>;
}

export interface WidgetMessage {
  id: number;
  content: string | null;
  message_type: "incoming" | "outgoing" | "activity" | "template";
  private: boolean;
  sender: { name: string | null } | null;
  attachments: Array<{
    file_type: string;
    external_url: string | null;
    fallback_title: string | null;
  }>;
  created_at: number;
}

export interface WidgetConversation {
  id: number;
  status: string;
  unread_count: number;
  last_activity_at: number;
  messages: Array<{ content: string | null; message_type: string; private: boolean }>;
}

export class WidgetApi {
  constructor(
    private readonly baseUrl: string,
    private readonly websiteToken: string,
  ) {}

  private url(path: string, extra?: Record<string, string>): string {
    const qs = new URLSearchParams({ website_token: this.websiteToken, ...extra });
    return `${this.baseUrl}${BASE_PATH}${path}?${qs.toString()}`;
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
    extra?: Record<string, string>,
  ): Promise<T> {
    const res = await fetch(this.url(path, extra), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    const body = (await res.json()) as { data: T; error?: string };
    if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
    return body.data;
  }

  config(): Promise<WidgetConfig> {
    return this.request<WidgetConfig>("/config");
  }

  upsertContact(input: {
    identifier?: string;
    name?: string;
    email?: string;
    phone_number?: string;
  }): Promise<{ contact_token: string; contact_id: number }> {
    return this.request("/contact", { method: "POST", body: JSON.stringify(input) });
  }

  updateContact(
    contactToken: string,
    input: { name?: string; email?: string; custom_attributes?: Record<string, unknown> },
  ): Promise<{ contact_id: number }> {
    return this.request("/contact/update", {
      method: "POST",
      body: JSON.stringify({ contact_token: contactToken, ...input }),
    });
  }

  listConversations(contactToken: string): Promise<{ conversations: WidgetConversation[] }> {
    return this.request("/conversations", undefined, { contact_token: contactToken });
  }

  createConversation(contactToken: string): Promise<{ conversation: WidgetConversation }> {
    return this.request("/conversations", { method: "POST" }, { contact_token: contactToken });
  }

  listMessages(
    contactToken: string,
    conversationId: number,
  ): Promise<{ messages: WidgetMessage[] }> {
    return this.request(`/conversations/${conversationId}/messages`, undefined, {
      contact_token: contactToken,
    });
  }

  sendMessage(
    contactToken: string,
    conversationId: number,
    content: string,
  ): Promise<{ message: WidgetMessage }> {
    return this.request(
      `/conversations/${conversationId}/messages`,
      { method: "POST", body: JSON.stringify({ content }) },
      { contact_token: contactToken },
    );
  }

  markRead(contactToken: string, conversationId: number): Promise<void> {
    return this.request(
      `/conversations/${conversationId}/read`,
      { method: "PUT" },
      { contact_token: contactToken },
    ).then(() => {});
  }

  submitCsat(
    contactToken: string,
    conversationId: number,
    rating: number,
    feedbackMessage?: string,
  ): Promise<{ id: number | null }> {
    return this.request(
      "/csat",
      {
        method: "POST",
        body: JSON.stringify({
          conversation_id: conversationId,
          rating,
          feedback_message: feedbackMessage,
        }),
      },
      { contact_token: contactToken },
    );
  }
}
