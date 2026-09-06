import { z } from "zod";

// Espelha portals/categories/articles controllers do Rails.

const slug = z
  .string()
  .trim()
  .min(1, "Informe o slug")
  .regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífens");

export const CreatePortalSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  slug,
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/, "Cor inválida")
    .optional(),
  page_title: z.string().optional(),
  header_text: z.string().optional(),
  homepage_link: z.string().optional(),
  custom_domain: z.string().optional(),
});

export const UpdatePortalSchema = CreatePortalSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const CreateCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  slug,
  description: z.string().optional(),
  locale: z.string().trim().optional(),
  position: z.number().int().min(0).optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CreateArticleSchema = z.object({
  title: z.string().trim().min(1, "Informe o título"),
  slug,
  description: z.string().optional(),
  content: z.string().optional(),
  category_id: z.number().int().positive().nullable().optional(),
  folder_id: z.number().int().positive().nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
  locale: z.string().trim().optional(),
  position: z.number().int().min(0).optional(),
});

export const UpdateArticleSchema = CreateArticleSchema.partial();
