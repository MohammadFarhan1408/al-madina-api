import { z } from 'zod';
import { Types } from 'mongoose';

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: 'Invalid id' });

export const createRoleSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().trim().optional(),
  permissionIds: z.array(objectId).default([]),
});

export const updateRoleSchema = createRoleSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'No fields to update' },
);
