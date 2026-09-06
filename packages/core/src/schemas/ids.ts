import { z } from "zod";

export const AccountIdParamSchema = z.object({
  account_id: z.coerce.number().int().positive(),
});

export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type AccountIdParam = z.infer<typeof AccountIdParamSchema>;
export type IdParam = z.infer<typeof IdParamSchema>;
