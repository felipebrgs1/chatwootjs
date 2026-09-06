import { WidgetApi, type WidgetConfig, type WidgetConversation, type WidgetMessage } from "./api";
import { stringsFor, type WidgetStrings } from "./i18n";
import { beep } from "./sound";
import { STYLES } from "./styles";

export interface ChatwootSettings {
  websiteToken: string;
  locale?: string;
  position?: "left" | "right";
  launcherTitle?: string;
  hideMessageBubble?: boolean;
  baseUrl?: string;
  darkMode?: "light" | "dark" | "auto";
}

interface Session {
  contact_token: string;
  contact_id: number;
  conversation_id: number | null;
  identifier: string | null;
  last_seen: Record<number, number>;
  csat_done: Record<number, boolean>;
}

type View = "home" | "prechatform" | "thread" | "csat";

const POLL_MS = 4000;

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Widget embeddável Chatwoot-compatível (Shadow DOM, sem dependências). */
export class Widget {
  private api: WidgetApi;
  private root: HTMLElement;
  private shadow: ShadowRoot;
  private config: WidgetConfig | null = null;
  private session: Session | null = null;
  private view: View = "home";
  private open = false;
  private messages: WidgetMessage[] = [];
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private unread = 0;
  private error: string | null = null;
  private campaignMsg: string | null = null;
  private campaignTimer: ReturnType<typeof setTimeout> | null = null;
  private csatRating = 0;

  constructor(private settings: ChatwootSettings) {
    const scriptBase = Widget.scriptOrigin();
    this.api = new WidgetApi(settings.baseUrl ?? scriptBase, settings.websiteToken);
    this.root = document.createElement("div");
    this.root.id = "chatwoot-widget";
    this.shadow = this.root.attachShadow({ mode: "open" });
    this.session = Widget.loadSession(settings.websiteToken);
  }

  static scriptOrigin(): string {
    try {
      const current = document.currentScript as HTMLScriptElement | null;
      if (current?.src) return new URL(current.src).origin;
    } catch {
      // ignora
    }
    return window.location.origin;
  }

  private static sessionKey(websiteToken: string): string {
    return `cw_widget_${websiteToken}`;
  }

  private static loadSession(websiteToken: string): Session | null {
    try {
      const raw = localStorage.getItem(Widget.sessionKey(websiteToken));
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }

  private saveSession(): void {
    try {
      if (this.session) {
        localStorage.setItem(
          Widget.sessionKey(this.settings.websiteToken),
          JSON.stringify(this.session),
        );
      }
    } catch {
      // storage indisponível
    }
  }

  mount(): void {
    document.body.appendChild(this.root);
    void this.api
      .config()
      .then((config) => {
        this.config = config;
        // Sessão existente → thread direto; senão home (ou pré-chat).
        if (this.session?.conversation_id) this.view = "thread";
        this.render();
        this.scheduleCampaign();
        if (this.session?.conversation_id) void this.refresh();
      })
      .catch(() => {
        this.error = this.t().couldNotLoad;
        this.render();
      });
  }

  // Campanha ongoing: apos time_on_page na URL configurada, exibe a
  // mensagem como balao do agente na home.
  private scheduleCampaign(): void {
    if (this.campaignTimer) clearTimeout(this.campaignTimer);
    const match = (this.config?.ongoing_campaigns ?? []).find((c) => {
      const url = c.trigger_rules?.url?.trim();
      return !url || window.location.href.includes(url);
    });
    if (!match) return;
    const delay = Math.max(0, (match.trigger_rules?.time_on_page ?? 0) * 1000);
    this.campaignTimer = setTimeout(() => {
      this.campaignMsg = match.message;
      this.render();
    }, delay);
  }

  // ---- API pública ($chatwoot) ----

  setUser(
    identifier: string,
    attrs?: { name?: string; email?: string; phone_number?: string },
  ): void {
    void this.api
      .upsertContact({ identifier, ...attrs })
      .then(({ contact_token, contact_id }) => {
        this.session = {
          contact_token,
          contact_id,
          conversation_id: null,
          identifier,
          last_seen: {},
          csat_done: {},
        };
        this.saveSession();
        this.view = "home";
        this.render();
      })
      .catch((err: unknown) => {
        this.error = err instanceof Error ? err.message : this.t().identifyError;
        this.render();
      });
  }

  reset(): void {
    try {
      localStorage.removeItem(Widget.sessionKey(this.settings.websiteToken));
    } catch {
      // ignora
    }
    this.session = null;
    this.messages = [];
    this.view = "home";
    this.unread = 0;
    this.render();
  }

  toggle(): void {
    this.open = !this.open;
    if (this.open) {
      this.unread = 0;
      if (this.session?.conversation_id) void this.refresh(true);
    }
    this.render();
  }

  // ---- Fluxo ----

  private async startConversation(): Promise<void> {
    if (!this.session) {
      this.view = "prechatform";
      this.render();
      return;
    }
    try {
      const { conversation } = await this.api.createConversation(this.session.contact_token);
      this.session.conversation_id = conversation.id;
      this.saveSession();
      this.view = "thread";
      this.render();
      await this.refresh(true);
    } catch (err) {
      this.error = err instanceof Error ? err.message : this.t().startError;
      this.render();
    }
  }

  private async submitPrechat(name: string, email: string): Promise<void> {
    try {
      const { contact_token, contact_id } = await this.api.upsertContact({ name, email });
      this.session = {
        contact_token,
        contact_id,
        conversation_id: null,
        identifier: email || name,
        last_seen: {},
        csat_done: {},
      };
      this.saveSession();
      await this.startConversation();
    } catch (err) {
      this.error = err instanceof Error ? err.message : this.t().prechatError;
      this.render();
    }
  }

  private async refresh(markSeen = false): Promise<void> {
    if (!this.session?.conversation_id) return;
    try {
      const [{ messages }, { conversations }] = await Promise.all([
        this.api.listMessages(this.session.contact_token, this.session.conversation_id),
        this.api.listConversations(this.session.contact_token),
      ]);
      const conv = conversations.find((c) => c.id === this.session?.conversation_id);
      const prevCount = this.messages.length;
      this.messages = messages.filter((m) => !m.private && m.message_type !== "activity");
      const lastId = this.messages.length > 0 ? this.messages[this.messages.length - 1]!.id : 0;
      // Novas mensagens do agente com painel fechado → badge + som.
      const lastSeen = this.session.last_seen[this.session.conversation_id] ?? 0;
      const fresh = this.messages.filter(
        (m) =>
          m.message_type === "outgoing" && m.id > lastSeen && m.id > (this.messages[0]?.id ?? 0),
      );
      void fresh;
      if (this.messages.length > prevCount && prevCount > 0 && !this.open) {
        const agentNew = this.messages.filter(
          (m) => m.message_type === "outgoing" && m.id > lastSeen,
        );
        if (agentNew.length > 0) {
          this.unread += agentNew.length;
          beep();
        }
      }
      if (markSeen && this.session.conversation_id) {
        this.session.last_seen[this.session.conversation_id] = lastId;
        this.unread = 0;
        this.saveSession();
        await this.api
          .markRead(this.session.contact_token, this.session.conversation_id)
          .catch(() => {});
      }
      // CSAT: conversa resolvida + csat ativo + ainda não avaliado.
      if (
        conv &&
        conv.status === "resolved" &&
        this.config?.csat_survey_enabled &&
        this.session.conversation_id
      ) {
        if (!this.session.csat_done[this.session.conversation_id]) {
          this.view = "csat";
        }
      }
      this.render();
    } catch {
      // polling silencioso
    }
  }

  private async send(content: string): Promise<void> {
    if (!this.session?.conversation_id || !content.trim()) return;
    const text = content.trim();
    // Otimista
    const temp: WidgetMessage = {
      id: -Date.now(),
      content: text,
      message_type: "incoming",
      private: false,
      sender: { name: null },
      attachments: [],
      created_at: Math.floor(Date.now() / 1000),
    };
    this.messages = [...this.messages, temp];
    this.render();
    try {
      await this.api.sendMessage(this.session.contact_token, this.session.conversation_id, text);
      await this.refresh(true);
    } catch (err) {
      this.messages = this.messages.filter((m) => m.id !== temp.id);
      this.error = err instanceof Error ? err.message : this.t().sendError;
      this.render();
    }
  }

  private async submitCsat(): Promise<void> {
    if (!this.session?.conversation_id || this.csatRating < 1) return;
    try {
      await this.api.submitCsat(
        this.session.contact_token,
        this.session.conversation_id,
        this.csatRating,
      );
      this.session.csat_done[this.session.conversation_id] = true;
      this.saveSession();
      this.view = "thread";
      this.render();
    } catch (err) {
      this.error = err instanceof Error ? err.message : this.t().rateError;
      this.render();
    }
  }

  // ---- Render ----

  private position(): "left" | "right" {
    return this.settings.position === "left" ? "left" : "right";
  }

  private color(): string {
    return this.config?.widget_color || "#1f93ff";
  }

  private t(): WidgetStrings {
    return stringsFor(this.settings.locale);
  }

  private render(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.settings.hideMessageBubble && !this.open) {
      this.shadow.innerHTML = "";
      return;
    }
    const pos = this.position();
    const color = this.color();
    const title = this.settings.launcherTitle || this.t().talkToUs;
    const launcherIcon = this.open ? "✕" : "💬";

    let panel = "";
    if (this.open) {
      panel = `<div class="cw-panel ${pos}" style="--cw-color:${esc(color)}">
        <div class="cw-header" style="background:${esc(color)}">
          <h2>${esc(this.config?.welcome_title || this.t().hello)}</h2>
          <p>${esc(this.config?.welcome_tagline || this.t().howCanWeHelp)}</p>
        </div>
        <div class="cw-body"><div class="cw-thread">${this.bodyHtml()}</div></div>
        ${this.view === "thread" ? this.composerHtml() : ""}
      </div>`;
    }

    this.shadow.innerHTML = `<style>${STYLES}</style>
      ${panel}
      <button class="cw-launcher ${pos}" style="background:${esc(color)}" title="${esc(title)}" aria-label="${esc(title)}">
        ${launcherIcon}
        ${!this.open && this.unread > 0 ? `<span class="cw-badge">${this.unread}</span>` : ""}
      </button>`;

    this.shadow.querySelector(".cw-launcher")?.addEventListener("click", () => this.toggle());
    this.bindBody();

    // Polling da thread aberta.
    if (this.open && this.view === "thread" && this.session?.conversation_id) {
      this.pollTimer = setInterval(() => void this.refresh(), POLL_MS);
    }
  }

  private bodyHtml(): string {
    if (!this.config) {
      return `<p class="cw-error">${esc(this.error ?? "Carregando...")}</p>`;
    }
    if (this.view === "home") {
      const ooo =
        this.config.working_hours_enabled && this.config.out_of_office_message
          ? `<div class="cw-ooo">${esc(this.config.out_of_office_message)}</div>`
          : "";
      const greeting =
        this.config.greeting_enabled && this.config.greeting_message
          ? `<div class="cw-msg agent">${esc(this.config.greeting_message)}</div>`
          : "";
      const campaign = this.campaignMsg
        ? `<div class="cw-msg agent cw-campaign">${esc(this.campaignMsg)}</div>`
        : "";
      return `<div class="cw-home">${ooo}${greeting}${campaign}
        <button class="cw-btn" data-action="start">${this.t().startConversation}</button>
        ${this.error ? `<p class="cw-error">${esc(this.error)}</p>` : ""}
      </div>`;
    }
    if (this.view === "prechatform") {
      return `<form class="cw-form" data-form="prechat">
        <input name="name" placeholder="${this.t().yourName}" autocomplete="name" />
        <input name="email" type="email" placeholder="${this.t().yourEmail}" autocomplete="email" />
        <button class="cw-btn" type="submit">${this.t().continue}</button>
        ${this.error ? `<p class="cw-error">${esc(this.error)}</p>` : ""}
      </form>`;
    }
    if (this.view === "csat") {
      const stars = [1, 2, 3, 4, 5]
        .map(
          (n) =>
            `<button type="button" data-star="${n}" class="${n <= this.csatRating ? "on" : ""}">⭐</button>`,
        )
        .join("");
      return `<div class="cw-csat">
        <p><strong>${this.t().rateService}</strong></p>
        <div class="cw-stars">${stars}</div>
        <button class="cw-btn" data-action="csat">${this.t().rate}</button>
        <button class="cw-btn" data-action="csat-skip" style="background:#9ca3af">${this.t().notNow}</button>
        ${this.error ? `<p class="cw-error">${esc(this.error)}</p>` : ""}
      </div>`;
    }
    // thread
    if (this.messages.length === 0) {
      return `<p style="color:#6b7280;font-size:13px">${this.t().noMessages}</p>`;
    }
    return this.messages
      .map((m) => {
        const mine = m.message_type === "incoming";
        const time = new Date(m.created_at * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const atts = (m.attachments ?? [])
          .map((a) =>
            a.file_type === "image" && a.external_url
              ? `<a href="${esc(a.external_url)}" target="_blank"><img src="${esc(a.external_url)}" alt="" style="max-width:100%;border-radius:8px;margin-top:4px" /></a>`
              : a.external_url
                ? `<a href="${esc(a.external_url)}" target="_blank">${esc(a.fallback_title ?? "anexo")}</a>`
                : "",
          )
          .join("");
        return `<div class="cw-msg ${mine ? "user" : "agent"}">${esc(m.content ?? "")}${atts}<span class="cw-meta">${esc(m.sender?.name ?? "")} ${time}</span></div>`;
      })
      .join("");
  }

  private composerHtml(): string {
    return `<form class="cw-composer" data-form="composer">
      <input name="text" placeholder="${this.t().writeMessage}" autocomplete="off" />
      <button class="cw-send" type="submit" aria-label="${this.t().send}">➤</button>
    </form>`;
  }

  private bindBody(): void {
    this.shadow.querySelector('[data-action="start"]')?.addEventListener("click", () => {
      this.error = null;
      if (this.config?.pre_chat_form_enabled && !this.session) {
        this.view = "prechatform";
        this.render();
      } else {
        void this.ensureSession().then(() => this.startConversation());
      }
    });
    this.shadow.querySelector('[data-action="csat"]')?.addEventListener("click", () => {
      void this.submitCsat();
    });
    this.shadow.querySelector('[data-action="csat-skip"]')?.addEventListener("click", () => {
      if (this.session?.conversation_id) {
        this.session.csat_done[this.session.conversation_id] = true;
        this.saveSession();
      }
      this.view = "thread";
      this.render();
    });
    this.shadow.querySelectorAll("[data-star]").forEach((el) => {
      el.addEventListener("click", () => {
        this.csatRating = Number((el as HTMLElement).dataset["star"] ?? 0);
        this.render();
      });
    });
    const prechat = this.shadow.querySelector<HTMLFormElement>('form[data-form="prechat"]');
    prechat?.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(prechat);
      void this.submitPrechat(String(data.get("name") ?? ""), String(data.get("email") ?? ""));
    });
    const composer = this.shadow.querySelector<HTMLFormElement>('form[data-form="composer"]');
    composer?.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(composer);
      const input = composer.querySelector("input");
      void this.send(String(data.get("text") ?? "")).then(() => {
        if (input) input.value = "";
      });
    });
  }

  /** Garante sessão (anônima se preciso) antes de abrir a conversa. */
  private async ensureSession(): Promise<void> {
    if (this.session) return;
    const { contact_token, contact_id } = await this.api.upsertContact({});
    this.session = {
      contact_token,
      contact_id,
      conversation_id: null,
      identifier: null,
      last_seen: {},
      csat_done: {},
    };
    this.saveSession();
  }

  getConversation(): WidgetConversation | null {
    return null;
  }
}
