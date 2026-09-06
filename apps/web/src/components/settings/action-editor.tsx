import { Plus, Trash2 } from "lucide-react";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import type { AutomationCondition, MacroAction } from "@/lib/automation";

// Editores usados pelo builder de macros e de automações (mesmo formato
// `{ action_name, action_params }` do Rails).

export function parseParams(text: string): unknown[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => {
      if (part === "true") return true;
      if (part === "false") return false;
      if (part === "null") return null;
      const n = Number(part);
      return part !== "" && Number.isFinite(n) ? n : part;
    });
}

export function formatParams(params: unknown[]): string {
  return (params ?? []).map((p) => String(p ?? "")).join(", ");
}

export function ActionRows({
  actions,
  options,
  onChange,
}: {
  actions: MacroAction[];
  options: readonly string[];
  onChange: (actions: MacroAction[]) => void;
}) {
  function set(index: number, patch: Partial<MacroAction>): void {
    onChange(actions.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  return (
    <div className="grid gap-2">
      {actions.map((action, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={action.action_name}
            onChange={(e) => set(i, { action_name: e.target.value })}
            className="h-9 w-44 flex-shrink-0 rounded-lg border border-input bg-background px-2 text-sm"
            aria-label="Ação"
          >
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <Input
            value={formatParams(action.action_params)}
            onChange={(e) => set(i, { action_params: parseParams(e.target.value) })}
            placeholder="parâmetros, separados por vírgula"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remover ação"
            onClick={() => onChange(actions.filter((_, j) => j !== i))}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={() => onChange([...actions, { action_name: options[0]!, action_params: [] }])}
      >
        <Plus className="size-3.5" />
        Adicionar ação
      </Button>
    </div>
  );
}

export function ConditionRows({
  conditions,
  keys,
  onChange,
}: {
  conditions: AutomationCondition[];
  keys: readonly string[];
  onChange: (conditions: AutomationCondition[]) => void;
}) {
  const OPERATORS = [
    "equal_to",
    "not_equal_to",
    "contains",
    "does_not_contain",
    "is_present",
    "is_not_present",
    "is_greater_than",
    "is_less_than",
  ];

  function set(index: number, patch: Partial<AutomationCondition>): void {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  return (
    <div className="grid gap-2">
      {conditions.map((condition, i) => (
        <div key={i} className="grid gap-2 rounded-lg border p-2">
          <div className="flex items-center gap-2">
            <div className="grid flex-1 gap-1">
              <Label>Atributo</Label>
              <select
                value={condition.attribute_key}
                onChange={(e) => set(i, { attribute_key: e.target.value })}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              >
                {keys.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid flex-1 gap-1">
              <Label>Operador</Label>
              <select
                value={condition.filter_operator}
                onChange={(e) => set(i, { filter_operator: e.target.value })}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              >
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remover condição"
              className="mt-5"
              onClick={() => onChange(conditions.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
          <div className="grid gap-1">
            <Label>Valores (vírgula separa)</Label>
            <Input
              value={formatParams(
                Array.isArray(condition.values) ? condition.values : [condition.values],
              )}
              onChange={(e) => set(i, { values: parseParams(e.target.value) })}
              placeholder="open, pending"
            />
          </div>
          {i < conditions.length - 1 && (
            <div className="flex items-center gap-2">
              <Label>Combinar com a próxima</Label>
              <select
                value={(condition.query_operator ?? "AND").toUpperCase()}
                onChange={(e) => set(i, { query_operator: e.target.value })}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="AND">E (AND)</option>
                <option value="OR">OU (OR)</option>
              </select>
            </div>
          )}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit gap-1.5"
        onClick={() =>
          onChange([
            ...conditions.map((c, j) =>
              j === conditions.length - 1 && !c.query_operator
                ? { ...c, query_operator: "AND" }
                : c,
            ),
            { attribute_key: keys[0]!, filter_operator: "equal_to", values: [] },
          ])
        }
      >
        <Plus className="size-3.5" />
        Adicionar condição
      </Button>
    </div>
  );
}
