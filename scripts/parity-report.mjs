/**
 * R1 — parity-report: mede a cobertura do Chatwoot OSS (pino em
 * docs/specs/CHATWOOT_PIN.md) contra o nosso server + web, por área.
 *
 * Fontes:
 *   - chatwoot/app/controllers/**  (actions públicas = alvo)
 *   - apps/server/src/routes/**    (rotas Hono registradas)
 *   - chatwoot/app/javascript/dashboard/routes/**  (áreas do front)
 *   - apps/web/src/routes/**       (páginas do dashboard)
 *
 * Uso:
 *   bun scripts/parity-report.mjs              # tabela legível
 *   bun scripts/parity-report.mjs --json       # máquina
 *   bun scripts/parity-report.mjs --write-doc  # gera docs/specs/paridade-mapa.md
 *
 * Exclusões: controllers de infraestrutura, concerns e áreas Enterprise
 * (licença separada, fora do escopo R0). O DDL é coberto pela trilha D
 * (`scripts/schema-diff.mjs` + roundtrip).
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const RAILS = join(ROOT, "chatwoot");
const args = new Set(process.argv.slice(2));
const AS_JSON = args.has("--json");
const WRITE_DOC = args.has("--write-doc");

function walk(dir, filter, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

// ---------- inventário Rails ----------
function parseRailsActions() {
  const files = walk(join(RAILS, "app/controllers"), (p) => extname(p) === ".rb");
  const controllers = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    const actions = [];
    let access = "public";
    for (const line of src.split("\n")) {
      if (/^\s*private\b/.test(line)) access = "private";
      else if (/^\s*protected\b/.test(line)) access = "protected";
      else if (/^\s*public\b/.test(line)) access = "public";
      const m = line.match(/^\s+def ([a-zA-Z0-9_!?]+)/);
      if (m && access === "public") actions.push(m[1]);
    }
    const rel = relative(join(RAILS, "app/controllers"), f).replace(/\.rb$/, "");
    controllers.push({
      path: rel,
      group: rel.includes("/") ? rel.split("/").slice(0, -1).join("/") : "(raiz)",
      actions,
    });
  }
  return controllers;
}

// ---------- inventário das nossas rotas (Hono) ----------
function normalizePath(p) {
  return p.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function parseOurApiRoutes() {
  const routesDir = join(ROOT, "apps/server/src/routes");
  const v1Index = readFileSync(join(routesDir, "v1/index.ts"), "utf8");
  const localToFile = {};
  for (const m of v1Index.matchAll(/import\s+(\w+)\s+from\s+"\.\/([\w-]+)"/g)) {
    localToFile[m[1]] = m[2];
  }
  for (const m of v1Index.matchAll(/import\s*\{([^}]+)\}\s*from\s*"\.\/([\w-]+)"/g)) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim().split(/\s+as\s+/)[0];
      if (name) localToFile[name] = m[2];
    }
  }
  const filePrefixes = {};
  for (const m of v1Index.matchAll(/v1\.route\(\s*"([^"]+)"\s*,\s*(\w+)/g)) {
    const file = localToFile[m[2]];
    if (!file) continue;
    (filePrefixes[file] ??= []).push(m[1]);
  }

  const manualPrefix = {
    "auth.ts": "/auth",
    "super-admin.ts": "/super_admin",
    "webhooks.ts": "/webhooks",
    "hc.ts": "/hc/api",
    "public.ts": "/public/api/v1/widgets",
  };

  const handlers = [];
  const files = walk(routesDir, (p) => extname(p) === ".ts");
  for (const f of files) {
    const rel = relative(routesDir, f);
    if (rel === "v1/index.ts" || rel === "cable.ts" || rel === "_helpers.ts") continue;
    const src = readFileSync(f, "utf8");

    // Prefixos internos: `app.route("/accounts", unscoped)` (fixed point).
    const varPrefix = { app: "" };
    const internal = [...src.matchAll(/(\w+)\.route\(\s*"([^"]+)"\s*,\s*(\w+)/g)].map((m) => ({
      parent: m[1],
      prefix: m[2],
      child: m[3],
    }));
    for (let i = 0; i < 5; i++) {
      for (const r of internal) {
        if (varPrefix[r.parent] !== undefined && varPrefix[r.child] === undefined) {
          varPrefix[r.child] = varPrefix[r.parent] + r.prefix;
        }
      }
    }

    let prefixes;
    if (rel.startsWith("v1/")) {
      const base = rel.replace(/\.ts$/, "").replace(/^v1\//, "");
      prefixes = (filePrefixes[base] ?? []).map((p) => `/api/v1${p === "/" ? "" : p}`);
      if (prefixes.length === 0) prefixes = [`/api/v1/(${base})`];
    } else if (manualPrefix[rel]) {
      prefixes = [manualPrefix[rel]];
    } else {
      prefixes = [`(${rel})`];
    }

    for (const m of src.matchAll(/(\w+)\.(get|post|put|patch|delete)\(\s*"([^"]*)"/g)) {
      const [, varName, method, sub] = m;
      const inner = (varPrefix[varName] ?? "") + (sub === "/" ? "" : sub);
      for (const prefix of prefixes) {
        handlers.push({
          method: method.toUpperCase(),
          path: normalizePath(`${prefix}${inner}`),
          file: rel,
        });
      }
    }
  }
  return handlers;
}

// ---------- inventário do front ----------
function parseOurWebRoutes() {
  const routesDir = join(ROOT, "apps/web/src/routes");
  return walk(routesDir, (p) => [".tsx", ".ts"].includes(extname(p)))
    .map((f) => relative(routesDir, f).replace(/\.(tsx|ts)$/, ""))
    .filter((p) => !p.startsWith("__") && p !== "index")
    .sort();
}

function parseRailsWebAreas() {
  const dir = join(RAILS, "app/javascript/dashboard/routes/dashboard");
  const areas = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (!statSync(p).isDirectory()) continue;
    if (e === "settings") {
      for (const s of readdirSync(p)) {
        if (statSync(join(p, s)).isDirectory()) areas.push(`settings/${s}`);
      }
    } else {
      areas.push(e);
    }
  }
  return areas.sort();
}

// ---------- mapa de áreas ----------
// rails: substrings do path do controller; ours: conjuntos de fragmentos
// (string = substring; string começando com ^ = regexp) que precisam casar
// todos no path de UMA rota.
const API_AREAS = [
  {
    area: "accounts",
    rails: ["api/v1/accounts_controller"],
    ours: [["^/api/v1/accounts$"], ["^/api/v1/accounts/:account_id$"]],
  },
  { area: "auth", rails: ["devise_overrides/", "auth/resend_confirmations"], ours: [["^/auth"]] },
  {
    area: "perfil",
    rails: ["api/v1/profiles_controller", "api/v1/profile/"],
    ours: [["/profile"], ["/profile/mfa"], ["/profile/sessions"]],
  },
  {
    area: "agents",
    rails: ["agents_controller", "assignable_agents_controller"],
    ours: [["/agents"], ["/assignable_agents"]],
  },
  { area: "agent_bots", rails: ["agent_bots_controller"], ours: [["/agent_bots"]] },
  {
    area: "inboxes",
    rails: [
      "inboxes_controller",
      "inbox_members_controller",
      "inbox_csat_templates_controller",
      "channels/twilio_channels_controller",
    ],
    ours: [["/inboxes"], ["/working_hours"]],
  },
  { area: "whatsapp", rails: ["accounts/whatsapp/"], ours: [["/whatsapp"]] },
  { area: "assignment", rails: ["assignment_policies"], ours: [["/assignment_policies"]] },
  {
    area: "contacts",
    rails: [
      "contacts_controller",
      "contacts/",
      "contact_inboxes_controller",
      "actions/contact_merges_controller",
      "custom_attribute_definitions_controller",
    ],
    ours: [["/contacts"], ["/contact_inboxes"], ["/merge"]],
  },
  { area: "custom_filters", rails: ["custom_filters_controller"], ours: [["/custom_filters"]] },
  {
    area: "conversations",
    rails: [
      "conversations_controller",
      "conversations/",
      "bulk_actions_controller",
      "upload_controller",
    ],
    ours: [["/conversations"]],
  },
  {
    area: "csat",
    rails: [
      "csat_survey_responses_controller",
      "public/api/v1/csat_survey_controller",
      "survey/responses_controller",
    ],
    ours: [["/csat"]],
  },
  { area: "automation", rails: ["automation_rules_controller"], ours: [["/automation_rules"]] },
  { area: "macros", rails: ["macros_controller"], ours: [["/macros"]] },
  { area: "canned", rails: ["canned_responses_controller"], ours: [["/canned_responses"]] },
  { area: "labels", rails: ["labels_controller"], ours: [["/labels"]] },
  { area: "teams", rails: ["teams_controller", "team_members_controller"], ours: [["/teams"]] },
  { area: "webhooks", rails: ["accounts/webhooks_controller"], ours: [["/webhooks"]] },
  { area: "campaigns", rails: ["campaigns_controller"], ours: [["/campaigns"]] },
  {
    area: "integrations",
    rails: [
      "integrations/",
      "dashboard_apps_controller",
      "branded_email_layouts_controller",
      "slack_uploads_controller",
      "linear/callbacks_controller",
      "shopify/callbacks_controller",
    ],
    ours: [["/integrations"], ["/dashboard_apps"]],
  },
  { area: "data_imports", rails: ["data_imports_controller"], ours: [["/data_imports"]] },
  { area: "reports_v2", rails: ["api/v2/"], ours: [["^/api/v2/"]] },
  {
    area: "notifications",
    rails: [
      "accounts/notifications_controller",
      "notification_settings_controller",
      "api/v1/notification_subscriptions_controller",
    ],
    ours: [["/notifications"], ["/notification_settings"], ["/notification_subscriptions"]],
  },
  { area: "search", rails: ["search_controller"], ours: [["/search"]] },
  {
    area: "helpcenter",
    rails: [
      "accounts/articles",
      "accounts/portals_controller",
      "accounts/categories_controller",
      "public/api/v1/portals",
    ],
    ours: [["/portals"]],
  },
  { area: "captain", rails: ["accounts/captain/"], ours: [["/captain"]] },
  {
    area: "oauth_authorizations",
    rails: [
      "oauth_authorization_controller",
      "accounts/callbacks_controller",
      "google/authorizations",
      "instagram/authorizations",
      "microsoft/authorizations",
      "notion/authorizations",
      "tiktok/authorizations",
      "twitter/authorizations",
      "google/callbacks",
      "instagram/callbacks",
      "tiktok/callbacks",
      "twitter/callbacks",
      "oauth_callback_controller",
    ],
    ours: [["/authorizations"], ["/callbacks"]],
  },
  { area: "widget", rails: ["api/v1/widget/"], ours: [["^/public/api/v1/widgets"]] },
  { area: "platform", rails: ["platform/api/v1/", "platform_controller"], ours: [["^/platform"]] },
  { area: "public_inbox", rails: ["public/api/v1/inboxes"], ours: [["^/public/api/v1/inboxes"]] },
  { area: "superadmin", rails: ["super_admin/"], ours: [["^/super_admin"]] },
  {
    area: "webhooks_externos",
    rails: ["webhooks/", "twilio/", "api/v1/webhooks_controller"],
    ours: [["^/webhooks"], ["/webhooks"]],
  },
  {
    area: "onboarding",
    rails: ["onboardings_controller", "installation/onboarding_controller"],
    ours: [["/onboardings"]],
  },
];

const RAILS_EXCLUDED = [
  "concerns/",
  "api/base_controller",
  "application_controller",
  "health_controller",
  "dashboard_controller",
  "swagger_controller",
  "android_app_controller",
  "apple_app_controller",
  "widget_tests_controller",
  "widgets_controller",
  "public_controller",
  "api_controller",
  "microsoft_controller",
  "accounts/base_controller",
  "conversations/base_controller",
  "contacts/base_controller",
  "portals/base_controller",
  "twitter/base_controller",
  "super_admin/application_controller",
  "super_admin/access_tokens_controller",
  "microsoft/callbacks_controller",
  "notion/callbacks_controller",
];

const WEB_AREAS = [
  { area: "conversations", rails: ["conversation", "inbox"], ours: [["conversations"]] },
  { area: "contacts", rails: ["contacts"], ours: [["contacts"]] },
  { area: "companies", rails: ["companies"], ours: [["companies"]] },
  { area: "campaigns", rails: ["campaigns"], ours: [["campaigns"]] },
  { area: "helpcenter", rails: ["helpcenter"], ours: [["helpcenter"]] },
  { area: "inbox-settings", rails: ["settings/inbox"], ours: [["settings", "inboxes"]] },
  { area: "agents", rails: ["settings/agents"], ours: [["settings", "agents"]] },
  { area: "teams", rails: ["settings/teams"], ours: [["settings", "teams"]] },
  { area: "labels", rails: ["settings/labels"], ours: [["settings", "labels"]] },
  { area: "canned", rails: ["settings/canned"], ours: [["settings", "canned"]] },
  { area: "macros", rails: ["settings/macros"], ours: [["settings", "macros"]] },
  { area: "automation", rails: ["settings/automation"], ours: [["settings", "automations"]] },
  { area: "attributes", rails: ["settings/attributes"], ours: [["settings", "custom-attributes"]] },
  { area: "auditlogs", rails: ["settings/auditlogs"], ours: [["settings", "audit-logs"]] },
  { area: "reports", rails: ["settings/reports"], ours: [["reports"]] },
  { area: "profile", rails: ["settings/profile"], ours: [["settings", "profile"]] },
  { area: "security", rails: ["settings/security"], ours: [["settings", "security"]] },
  { area: "data", rails: ["settings/data"], ours: [["settings", "data"]] },
  {
    area: "assignment-policy",
    rails: ["settings/assignmentPolicy"],
    ours: [["settings", "assignment-policy"]],
  },
  { area: "integrations", rails: ["settings/integrations"], ours: [["settings", "integrations"]] },
  { area: "templates", rails: ["settings/templates"], ours: [["settings", "templates"]] },
  { area: "agent-bots", rails: ["settings/agentBots"], ours: [["settings", "agent-bots"]] },
  { area: "onboarding", rails: ["onboarding"], ours: [["onboarding"]] },
  { area: "customviews", rails: ["customviews"], ours: [["customviews"]] },
  { area: "commands", rails: ["commands"], ours: [["commands"]] },
  { area: "noAccounts", rails: ["noAccounts"], ours: [["noAccounts"]] },
  { area: "suspended", rails: ["suspended"], ours: [["suspended"]] },
  { area: "upgrade", rails: ["upgrade"], ours: [["upgrade"]] },
  { area: "captain (enterprise)", rails: ["captain"], ours: [], excluded: true },
  { area: "calls (enterprise)", rails: ["calls"], ours: [], excluded: true },
  { area: "sla (enterprise)", rails: ["settings/sla"], ours: [], excluded: true },
  { area: "custom-roles (enterprise)", rails: ["settings/customRoles"], ours: [], excluded: true },
  {
    area: "conversation-workflow (enterprise)",
    rails: ["settings/conversationWorkflow"],
    ours: [],
    excluded: true,
  },
  { area: "billing (stub)", rails: ["settings/billing"], ours: [], excluded: true },
];

// ---------- matching ----------
function matchesFragment(fragment, path) {
  if (fragment.startsWith("^")) return new RegExp(fragment).test(path);
  return path.includes(fragment);
}

function areaCovered(routes, fragmentSets) {
  if (!fragmentSets || fragmentSets.length === 0) return { covered: false, hits: [] };
  const hits = routes.filter((r) =>
    fragmentSets.some((set) => set.every((f) => matchesFragment(f, r.path))),
  );
  return { covered: hits.length > 0, hits: hits.map((h) => `${h.method} ${h.path}`) };
}

function webAreaCovered(files, fragmentSets) {
  const hits = files.filter((f) =>
    fragmentSets.some((set) => set.every((frag) => f.includes(frag))),
  );
  return { covered: hits.length > 0, hits };
}

// ---------- execução ----------
const railsControllers = parseRailsActions();
const ourRoutes = parseOurApiRoutes();
const ourWeb = parseOurWebRoutes();
const railsWebAreas = parseRailsWebAreas();

const excluded = (controller) => RAILS_EXCLUDED.some((token) => controller.path.includes(token));

const apiReport = API_AREAS.map((entry) => {
  const controllers = railsControllers.filter((c) => entry.rails.some((t) => c.path.includes(t)));
  const actions = controllers.reduce((sum, c) => sum + c.actions.length, 0);
  const { covered, hits } = areaCovered(ourRoutes, entry.ours);
  return { ...entry, controllers: controllers.map((c) => c.path), actions, covered, hits };
});

const mappedControllers = new Set(apiReport.flatMap((r) => r.controllers));
const unmapped = railsControllers
  .filter((c) => !excluded(c) && !mappedControllers.has(c.path) && c.actions.length > 0)
  .map((c) => ({ path: c.path, actions: c.actions.length }));

const webReport = WEB_AREAS.map((entry) => {
  const { covered, hits } = webAreaCovered(ourWeb, entry.ours ?? []);
  return { ...entry, covered, hits };
});

const mappedWebAreas = new Set(WEB_AREAS.flatMap((a) => a.rails));
const unmappedWebAreas = railsWebAreas
  .filter((a) => a !== "specs" && !a.includes("/"))
  .filter((a) => !mappedWebAreas.has(a));

const apiActive = apiReport.filter((r) => !r.excluded);
const webActive = webReport.filter((r) => !r.excluded);
const apiCovered = apiActive.filter((r) => r.covered).length;
const webCovered = webActive.filter((r) => r.covered).length;
const pct = (n, d) => (d === 0 ? 0 : Math.round((n / d) * 100));

const matchedRoutes = new Set();
for (const area of apiReport) {
  for (const r of ourRoutes) {
    if (area.ours.some((set) => set.every((f) => matchesFragment(f, r.path)))) matchedRoutes.add(r);
  }
}
const unmatchedRoutes = ourRoutes.filter((r) => !matchedRoutes.has(r));
const missingAreaActions = API_AREAS.filter(
  (a) => !a.excluded && !areaCovered(ourRoutes, a.ours).covered,
).reduce((sum, a) => {
  const controllers = railsControllers.filter((c) => a.rails.some((t) => c.path.includes(t)));
  return sum + controllers.reduce((s, c) => s + c.actions.length, 0);
}, 0);

// Ponderação por ações: cada rota nossa cobre ~1 ação da área (piso no total).
const weighted = apiActive.reduce(
  (acc, r) => ({
    total: acc.total + r.actions,
    covered: acc.covered + Math.min(r.actions, r.hits.length),
  }),
  { total: 0, covered: 0 },
);
const apiWeightedPct = pct(weighted.covered, weighted.total);

const report = {
  pin:
    readFileSync(join(ROOT, "docs/specs/CHATWOOT_PIN.md"), "utf8").match(
      /Chatwoot \*\*`([^`]+)`/,
    )?.[1] ?? "?",
  api: {
    covered: apiCovered,
    total: apiActive.length,
    pct: pct(apiCovered, apiActive.length),
    weightedPct: apiWeightedPct,
    areas: apiReport,
  },
  web: {
    covered: webCovered,
    total: webActive.length,
    pct: pct(webCovered, webActive.length),
    areas: webReport,
  },
  rails: {
    controllers: railsControllers.length,
    actions: railsControllers.reduce((s, c) => s + c.actions.length, 0),
  },
  ours: {
    apiHandlers: ourRoutes.length,
    webRoutes: ourWeb.length,
    unmatchedApiHandlers: unmatchedRoutes.length,
  },
  missingAreaActions,
  unmapped,
  unmappedWebAreas,
};

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`== parity-report — Chatwoot ${report.pin} (OSS) × ChatwootJS ==`);
console.log(
  `Rails: ${report.rails.controllers} controllers / ${report.rails.actions} actions · nossos: ${report.ours.apiHandlers} handlers API / ${report.ours.webRoutes} rotas web`,
);
console.log(
  `\nAPI:  ${apiCovered}/${apiActive.length} áreas cobertas (${report.api.pct}%) · ponderado por ações: ${apiWeightedPct}%`,
);
console.log(`FRONT: ${webCovered}/${webActive.length} áreas cobertas (${report.web.pct}%)\n`);
console.log("API por área:");
for (const r of apiReport) {
  const mark = r.excluded ? "—" : r.covered ? "✅" : "❌";
  console.log(
    `  ${mark} ${r.area.padEnd(24)} rails=${String(r.actions).padStart(3)} ações  nossas rotas=${String(r.hits.length).padStart(3)}${r.excluded ? " (enterprise/fora)" : ""}`,
  );
}
console.log("\nFRONT por área:");
for (const r of webReport) {
  const mark = r.excluded ? "—" : r.covered ? "✅" : "❌";
  console.log(`  ${mark} ${r.area.padEnd(32)} ${r.excluded ? "(enterprise/fora)" : ""}`);
}
if (unmapped.length > 0) {
  console.log(`\nControllers Rails fora do mapa (${unmapped.length}):`);
  for (const c of unmapped) console.log(`  - ${c.path} (${c.actions} ações)`);
}
console.log(
  `\nÁreas ausentes somam ${missingAreaActions} ações Rails; ${unmatchedRoutes.length} handlers nossos fora do mapa (revisar).`,
);
if (unmappedWebAreas.length > 0) {
  console.log(`Áreas do front Rails sem mapa: ${unmappedWebAreas.join(", ")}`);
}

if (WRITE_DOC) {
  const lines = [];
  lines.push(`# Mapa de paridade — Chatwoot ${report.pin} (OSS) × ChatwootJS`);
  lines.push("");
  lines.push("> Gerado por `bun scripts/parity-report.mjs --write-doc` (não editar à mão).");
  lines.push(
    `> Baseline: ${new Date().toISOString().slice(0, 10)} · API ${report.api.covered}/${report.api.total} áreas (${report.api.pct}%) · ponderado por ações ${report.api.weightedPct}% · Front ${report.web.covered}/${report.web.total} (${report.web.pct}%).`,
  );
  lines.push("");
  lines.push("## API");
  lines.push("");
  lines.push("| Área | Rails (ações) | Status | Nossas rotas |");
  lines.push("| --- | ---: | :-: | ---: |");
  for (const r of apiReport) {
    lines.push(
      `| ${r.area}${r.excluded ? " (fora)" : ""} | ${r.actions} | ${r.excluded ? "—" : r.covered ? "✅" : "❌"} | ${r.hits.length} |`,
    );
  }
  lines.push("");
  lines.push("## Front");
  lines.push("");
  lines.push("| Área | Status |");
  lines.push("| --- | :-: |");
  for (const r of webReport) {
    lines.push(`| ${r.area} | ${r.excluded ? "—" : r.covered ? "✅" : "❌"} |`);
  }
  if (unmapped.length > 0) {
    lines.push("");
    lines.push("## Controllers Rails sem área no mapa");
    lines.push("");
    for (const c of unmapped) lines.push(`- \`${c.path}\` (${c.actions} ações)`);
  }
  lines.push("");
  lines.push("## Exclusões");
  lines.push("");
  lines.push("- Infraestrutura/root: health, swagger, asset links, widget tests.");
  lines.push("- `concerns/` (não são endpoints).");
  lines.push(
    "- Enterprise (licença separada): captain avançado, calls, SLA, custom roles, conversation workflow, billing.",
  );
  lines.push("- i18n e pipeline/CI (decisão de escopo R0).");
  lines.push("");
  writeFileSync(join(ROOT, "docs/specs/paridade-mapa.md"), lines.join("\n"));
  console.log("\n→ docs/specs/paridade-mapa.md atualizado");
}
