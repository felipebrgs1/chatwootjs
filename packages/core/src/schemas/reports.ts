import { z } from "zod";

// Espelha reports_controller + csat_survey_responses_controller do Rails.
// since/until: datas ISO (YYYY-MM-DD); timezone_offset: minutos (igual ao Rails).

export const ReportsQuerySchema = z.object({
  since: z.string().trim().optional(),
  until: z.string().trim().optional(),
  timezone_offset: z.coerce.number().int().min(-840).max(840).default(0),
});

export type ReportsQuery = z.infer<typeof ReportsQuerySchema>;

export const SubmitCsatSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(5000).optional(),
});
