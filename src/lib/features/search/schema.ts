import { z } from 'zod';

export const searchCategorySchema = z.enum([
  'patient',
  'appointment',
  'prescription',
  'diagnosis',
  'measurement',
]);

export const searchInputSchema = z.object({
  clinicId: z.uuid(),
  q: z.string().trim().min(2, 'Enter at least 2 characters').max(120),
  categories: z.array(searchCategorySchema).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export type SearchCategory = z.infer<typeof searchCategorySchema>;

export interface SearchResult {
  category: SearchCategory;
  id: string;
  title: string;
  subtitle: string | null;
  // precomputed tanstack router link
  href: string;
  // for ranking
  score: number;
  meta?: Record<string, string | number | null>;
}

export interface SearchResponse {
  query: string;
  results: Array<SearchResult>;
  byCategory: Record<SearchCategory, number>;
  elapsedMs: number;
}
