import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().trim().min(2),
});

export const updateTagSchema = createTagSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'No fields to update' },
);
