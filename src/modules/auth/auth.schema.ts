import { z } from 'zod';

/** Shared by sign-up and reset: 8+ chars with at least one letter and one digit. */
const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/\d/, 'Password must include a number');

/** POST /auth/sign-up (§10 — fullName min 2, email valid, password policy). */
export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: newPassword,
});

/** POST /auth/sign-in. */
export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/** POST /auth/refresh and POST /auth/sign-out. */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/** POST /auth/forgot-password. */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
});

/** POST /auth/reset-password. */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: newPassword,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
