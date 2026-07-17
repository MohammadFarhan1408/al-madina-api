import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string().trim().optional(),
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(5),
  addressLine: z.string().trim().min(3),
  country: z.string().trim().min(2),
  state: z.string().trim().optional(),
  city: z.string().trim().min(1),
  postalCode: z.string().trim().optional(),
  landmark: z.string().trim().optional(),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'No fields to update' },
);
