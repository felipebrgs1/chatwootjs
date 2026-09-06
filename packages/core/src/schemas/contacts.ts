import { z } from "zod";

// Espelha contacts_controller / contact_inboxes_controller /
// contact_merges_controller / labels_controller / custom_attribute_definitions_controller.

/**
 * Rails aceita `labels[]=a&labels[]=b`; o Hono entrega `labels[]` como chave
 * separada — normaliza antes de validar.
 */
export const ContactsQuerySchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === "object") {
      const out = { ...(raw as Record<string, unknown>) };
      const labels = out["labels[]"] ?? out["labels"];
      if (labels !== undefined) {
        out.labels = Array.isArray(labels) ? labels : [labels];
        delete out["labels[]"];
      }
      return out;
    }
    return raw;
  },
  z.object({
    q: z.string().trim().optional(),
    labels: z.array(z.string().trim()).optional(),
    // Direção estilo Rails: prefixo `-` inverte (ex. `-name` = nome desc).
    sort: z
      .string()
      .regex(/^-?(name|email|phone_number|last_activity_at|created_at)$/)
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    per_page: z.coerce.number().int().min(1).max(100).default(15),
  }),
);

export type ContactsQuery = z.infer<typeof ContactsQuerySchema>;

export const CreateContactSchema = z.object({
  name: z.string().trim().optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone_number: z.string().trim().optional(),
  identifier: z.string().trim().optional(),
  location: z.string().optional(),
  country_code: z.string().optional(),
  last_name: z.string().optional(),
  middle_name: z.string().optional(),
  blocked: z.boolean().optional(),
  company_id: z.number().int().positive().nullish(),
  custom_attributes: z.record(z.string(), z.unknown()).optional(),
  additional_attributes: z.record(z.string(), z.unknown()).optional(),
});

export type CreateContactInput = z.infer<typeof CreateContactSchema>;

export const UpdateContactSchema = z.object({
  name: z.string().trim().optional(),
  email: z.union([z.email(), z.literal("")]).nullish(),
  phone_number: z.string().trim().nullish(),
  identifier: z.string().trim().nullish(),
  location: z.string().optional(),
  country_code: z.string().optional(),
  last_name: z.string().optional(),
  middle_name: z.string().optional(),
  blocked: z.boolean().optional(),
  company_id: z.number().int().positive().nullish(),
  custom_attributes: z.record(z.string(), z.unknown()).optional(),
  additional_attributes: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

export const ContactInboxBodySchema = z.object({
  inbox_id: z.number().int().positive(),
});

export const MergeContactSchema = z.object({
  child_id: z.number().int().positive(),
});

export const CreateNoteSchema = z.object({
  content: z.string().trim().min(1),
});

export const CreateLabelSchema = z.object({
  title: z.string().trim().min(1),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/)
    .default("#1f93ff"),
  description: z.string().optional(),
  show_on_sidebar: z.boolean().optional(),
});

export const UpdateLabelSchema = z.object({
  title: z.string().trim().min(1).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/)
    .optional(),
  description: z.string().nullish(),
  show_on_sidebar: z.boolean().optional(),
});

/** attribute_model: 0 contact, 1 conversation. display_type: 0 text … 4 list. */
export const CreateCustomAttributeSchema = z.object({
  attribute_model: z.number().int().min(0).max(1).default(0),
  attribute_key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9_]+$/, "use letras, números e _"),
  attribute_display_name: z.string().trim().min(1),
  attribute_description: z.string().optional(),
  attribute_display_type: z.number().int().min(0).max(7).default(0),
  default_value: z.string().optional(),
  attribute_values: z.array(z.string()).optional(),
  regex_pattern: z.string().optional(),
  regex_cue: z.string().optional(),
});

export const UpdateCustomAttributeSchema = CreateCustomAttributeSchema.partial().extend({
  attribute_key: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
});

export type CreateCustomAttributeInput = z.infer<typeof CreateCustomAttributeSchema>;

/** Validação de um valor de custom attribute por tipo. */
export type AttributeType = "text" | "number" | "link" | "date" | "list" | "checkbox";

export const ATTRIBUTE_TYPES: AttributeType[] = [
  "text",
  "number",
  "link",
  "date",
  "list",
  "checkbox",
];
