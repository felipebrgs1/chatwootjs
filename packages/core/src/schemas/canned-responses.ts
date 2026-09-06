import { z } from "zod";

// Espelha canned_responses_controller do Rails (busca `?search=` para o `//`).

export const CannedQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export const CreateCannedSchema = z.object({
  short_code: z.string().trim().min(1, "Informe o atalho"),
  content: z.string().trim().min(1, "Informe o conteúdo"),
});

export const UpdateCannedSchema = CreateCannedSchema.partial();
