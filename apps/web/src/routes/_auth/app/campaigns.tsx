import { zodResolver } from "@hookform/resolvers/zod";
import { Megaphone, Play, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { Textarea } from "@chatwootjs/ui/components/textarea";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";
import {
  audiencePreview,
  listCampaigns,
  triggerCampaign,
  type AudiencePreview,
  type Campaign,
} from "@/lib/campaigns";

export const Route = createFileRoute("/_auth/app/campaigns")({
  validateSearch: (search: Record<string, unknown>) => ({
    type:
      search.type === "ongoing" || search.type === "one_off"
        ? (search.type as "ongoing" | "one_off")
        : undefined,
  }),
  component: CampaignsPage,
});

const schema = z.object({
  title: z.string().trim().min(1, "Informe o título"),
  message: z.string().trim().min(1, "Informe a mensagem"),
  inbox_id: z.string().min(1, "Escolha a inbox"),
  campaign_type: z.enum(["ongoing", "one_off"]),
  url: z.string().optional(),
  time_on_page: z.string().optional(),
  scheduled_at: z.string().optional(),
});

type Values = z.infer<typeof schema>;

interface Inbox {
  id: number;
  name: string;
  channel_type: string | null;
}

const ONGOING_CHANNELS = ["Channel::WebWidget"];
const ONE_OFF_CHANNELS = ["Channel::Sms", "Channel::TwilioSms", "Channel::Whatsapp"];

interface LabelItem {
  id: number;
  title: string;
}

function CampaignsPage() {
  const { session } = useSessionContext();
  const { type } = Route.useSearch();
  const [items, setItems] = useState<Campaign[] | null>(null);
  const [inboxes, setInboxes] = useState<Inbox[]>([]);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [preview, setPreview] = useState<AudiencePreview | null>(null);
  const [previewFor, setPreviewFor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = session?.account.role === "administrator";
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      message: "",
      inbox_id: "",
      campaign_type: type ?? "one_off",
      url: "",
      time_on_page: "20",
      scheduled_at: "",
    },
  });
  const campaignType = form.watch("campaign_type");

  // Vindo do menu (Live chat / SMS), fixa o tipo da seção.
  useEffect(() => {
    if (type) form.setValue("campaign_type", type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function refresh(): Promise<void> {
    setItems(await listCampaigns(session!.accountId));
    const [i, l] = await Promise.all([
      apiFetch<{ inboxes: Inbox[] }>(`/api/v1/accounts/${session!.accountId}/inboxes`),
      apiFetch<{ labels: LabelItem[] }>(`/api/v1/accounts/${session!.accountId}/labels`),
    ]);
    setInboxes(i.inboxes);
    setLabels(l.labels);
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function toggleLabel(title: string): void {
    setPicked((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  }

  async function onSubmit(values: Values): Promise<void> {
    setError(null);
    try {
      await apiFetch(`/api/v1/accounts/${session!.accountId}/campaigns`, {
        method: "POST",
        body: JSON.stringify({
          title: values.title,
          message: values.message,
          inbox_id: Number(values.inbox_id),
          campaign_type: values.campaign_type,
          trigger_rules:
            values.campaign_type === "ongoing"
              ? {
                  url: values.url || undefined,
                  time_on_page: values.time_on_page ? Number(values.time_on_page) : undefined,
                }
              : undefined,
          audience: picked.length > 0 ? { labels: picked } : undefined,
          scheduled_at: values.scheduled_at || undefined,
        }),
      });
      form.reset({
        title: "",
        message: "",
        inbox_id: "",
        campaign_type: type ?? "one_off",
        url: "",
        time_on_page: "20",
        scheduled_at: "",
      });
      setPicked([]);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function showPreview(id: number): Promise<void> {
    setPreviewFor(id);
    setPreview(await audiencePreview(session!.accountId, id));
  }

  async function trigger(id: number): Promise<void> {
    await triggerCampaign(session!.accountId, id);
    await refresh();
  }

  async function toggleEnabled(c: Campaign): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/campaigns/${c.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !c.enabled }),
    });
    await refresh();
  }

  const ongoing = (items ?? []).filter((c) => c.campaign_type === "ongoing");
  const oneOff = (items ?? []).filter((c) => c.campaign_type === "one_off");
  const showOngoing = !type || type === "ongoing";
  const showOneOff = !type || type === "one_off";
  // O tipo da inbox segue o Rails: ongoing vive em Website, one_off em SMS/WhatsApp.
  const eligibleInboxes = inboxes.filter((i) =>
    (campaignType === "ongoing" ? ONGOING_CHANNELS : ONE_OFF_CHANNELS).includes(
      i.channel_type ?? "",
    ),
  );

  function card(c: Campaign) {
    return (
      <li key={c.id} className="grid gap-2 rounded-lg border bg-white p-4">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-woot-blue" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</p>
          <span
            className={
              c.campaign_status === "active"
                ? "rounded bg-green-100 px-1.5 py-0.5 text-[11px] text-green-700"
                : "rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            }
          >
            {c.campaign_status === "active" ? "ativa" : "concluída"}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{c.message}</p>
        {(c.sender || c.scheduled_at) && (
          <p className="text-xs text-muted-foreground">
            {[
              c.sender ? `por ${c.sender.name}` : null,
              c.scheduled_at ? `agenda: ${new Date(c.scheduled_at).toLocaleString()}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {c.campaign_type === "one_off" && c.campaign_status === "active" && isAdmin && (
            <Button size="sm" className="gap-1.5" onClick={() => void trigger(c.id)}>
              <Play className="size-3.5" />
              Disparar
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => void showPreview(c.id)}>
            Audiência
          </Button>
          {c.campaign_type === "ongoing" && isAdmin && (
            <Button size="sm" variant="ghost" onClick={() => void toggleEnabled(c)}>
              {c.enabled ? "Pausar" : "Ativar"}
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remover ${c.title}`}
              onClick={() =>
                void apiFetch(`/api/v1/accounts/${session!.accountId}/campaigns/${c.id}`, {
                  method: "DELETE",
                }).then(() => void refresh())
              }
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
        {previewFor === c.id && preview && (
          <p className="text-xs text-muted-foreground">
            {preview.count} contato(s)
            {preview.sample.length > 0 &&
              ` — ex.: ${preview.sample
                .slice(0, 3)
                .map((s) => s.name)
                .join(", ")}`}
          </p>
        )}
      </li>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Campanhas</h1>
        <p className="text-sm text-muted-foreground">
          Ongoing no live chat por gatilho · one-off em massa para a audiência.
        </p>
      </header>
      <main className="grid content-start gap-6 p-6 lg:grid-cols-[380px_1fr]">
        {isAdmin && (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid content-start gap-3 rounded-lg border bg-white p-4"
          >
            <h2 className="text-sm font-medium">Nova campanha</h2>
            <div className="grid gap-1.5">
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...form.register("title")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="campaign_type">Tipo</Label>
                <select
                  id="campaign_type"
                  {...form.register("campaign_type")}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                >
                  <option value="one_off">One-off (SMS)</option>
                  <option value="ongoing">Ongoing (live chat)</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="inbox_id">Inbox</Label>
                <select
                  id="inbox_id"
                  {...form.register("inbox_id")}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                >
                  <option value="">Selecionar...</option>
                  {eligibleInboxes.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                {eligibleInboxes.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {campaignType === "ongoing"
                      ? "Conecte uma inbox Website."
                      : "Conecte uma inbox SMS/WhatsApp para one-off."}
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea id="message" {...form.register("message")} rows={3} />
            </div>
            {campaignType === "ongoing" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="url">URL contém</Label>
                  <Input id="url" {...form.register("url")} placeholder="/precos" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="time_on_page">Segundos na página</Label>
                  <Input id="time_on_page" inputMode="numeric" {...form.register("time_on_page")} />
                </div>
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="scheduled_at">Agendar para (opcional)</Label>
                <Input id="scheduled_at" type="datetime-local" {...form.register("scheduled_at")} />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Audiência por labels (vazio = todos da inbox)</Label>
              <div className="flex flex-wrap gap-2">
                {labels.map((l) => (
                  <label
                    key={l.id}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  >
                    <Checkbox
                      checked={picked.includes(l.title)}
                      onCheckedChange={() => toggleLabel(l.title)}
                    />
                    {l.title}
                  </label>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Criar
              </Button>
            </div>
          </form>
        )}
        <div className="grid content-start gap-6">
          {showOneOff && (
            <section className="grid content-start gap-2">
              <h2 className="text-sm font-medium">One-off (SMS)</h2>
              {items === null ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <ul className="grid gap-2">{oneOff.map(card)}</ul>
              )}
            </section>
          )}
          {showOngoing && (
            <section className="grid content-start gap-2">
              <h2 className="text-sm font-medium">Ongoing (live chat)</h2>
              {items === null ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <ul className="grid gap-2">{ongoing.map(card)}</ul>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
