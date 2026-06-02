import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  NEXT_PUBLIC_DASHBOARD_URL: z.string().default('http://localhost:3000'),
  NEXT_PUBLIC_DOCS_URL: z.string().default('http://localhost:3002'),
  NEXT_PUBLIC_EXAMPLE_URL: z.string().default('http://localhost:3003'),
  AUTH_SECRET: z.string().default('dev-auth-secret-change-in-production'),
  AUTH_URL: z.string().default('http://localhost:3000'),
});

// Use process.env here so that NEXT_PUBLIC vars are available on the client
export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL,
  NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
  NEXT_PUBLIC_EXAMPLE_URL: process.env.NEXT_PUBLIC_EXAMPLE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_URL: process.env.AUTH_URL || process.env.NEXT_PUBLIC_DASHBOARD_URL,
});
