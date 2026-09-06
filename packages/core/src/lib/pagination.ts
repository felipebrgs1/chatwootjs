import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(25),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export interface PageMeta {
  count: number;
  current_page: number;
  total_pages: number;
  per_page: number;
}

export function pageMeta(total: number, page: number, perPage: number): PageMeta {
  return {
    count: total,
    current_page: page,
    total_pages: total === 0 ? 0 : Math.ceil(total / perPage),
    per_page: perPage,
  };
}

export function paginate<T>(
  items: T[],
  page: number,
  perPage: number,
): { items: T[]; meta: PageMeta } {
  const start = (page - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    meta: pageMeta(items.length, page, perPage),
  };
}
