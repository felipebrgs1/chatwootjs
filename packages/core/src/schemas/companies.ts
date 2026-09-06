import { z } from "zod";

// Empresas — espelha chatwoot companies_controller (index/search/show/create/update/destroy).

export const CompaniesQuerySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(15),
});

export type CompaniesQuery = z.infer<typeof CompaniesQuerySchema>;

export const CreateCompanySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  domain: z.string().trim().optional(),
  description: z.string().optional(),
  custom_attributes: z.record(z.string(), z.unknown()).optional(),
  additional_attributes: z.record(z.string(), z.unknown()).optional(),
});

export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;

export const UpdateCompanySchema = CreateCompanySchema.partial();

export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;

export const CompanyContactBodySchema = z.object({
  contact_id: z.number().int().positive(),
});
