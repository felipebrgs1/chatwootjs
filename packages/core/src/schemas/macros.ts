import { z } from "zod";

import { ActionItemSchema } from "./automation.js";

// Espelha macros_controller do Rails (+ /execute).

export const MACRO_ACTION_NAMES = [
  "assign_agent",
  "assign_team",
  "add_label",
  "remove_label",
  "send_message",
  "change_status",
  "change_priority",
  "snooze",
] as const;

export const CreateMacroSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  visibility: z.enum(["personal", "global"]).optional(),
  actions: z.array(ActionItemSchema).min(1, "Informe ao menos uma ação"),
});

export const UpdateMacroSchema = CreateMacroSchema.partial();

export const ExecuteMacroSchema = z.object({
  conversation_id: z.number().int().positive().optional(),
  conversation_ids: z.array(z.number().int().positive()).optional(),
});
