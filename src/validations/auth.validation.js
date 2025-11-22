import { z } from 'zod';

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(6, 'Name is required')
    .max(255, 'Name is too long'),
  email: z
    .email()
    .trim()
    .min(5, 'Email is required')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long'),
  role: z.enum(['user', 'admin']).optional().default('user'),
});

export const signinSchema = z.object({
  email: z.email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
});
