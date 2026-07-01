import { z } from 'zod';
import { THEME_MODES } from '../../constants/business';

/** PATCH /users/me. */
export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    avatar: z.string().url().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

/** PATCH /users/me/preferences. */
export const updatePreferencesSchema = z
  .object({
    themeMode: z.enum(THEME_MODES).optional(),
    promosEnabled: z.boolean().optional(),
    orderUpdatesEnabled: z.boolean().optional(),
    currency: z.string().trim().length(3).optional(),
    language: z.string().trim().min(2).max(5).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

/** POST /users/me/push-token. */
export const pushTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type PushTokenInput = z.infer<typeof pushTokenSchema>;
