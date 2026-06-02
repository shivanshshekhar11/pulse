import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_PULSE_API_KEY: z.string().default('ps_test_dummy'),
  NEXT_PUBLIC_PULSE_URL: z.string().default('http://localhost:4000'),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  NEXT_PUBLIC_DASHBOARD_URL: z.string().default('http://localhost:3001'),
  NEXT_PUBLIC_DOCS_URL: z.string().default('http://localhost:3002'),
  NEXT_PUBLIC_EXAMPLE_URL: z.string().default('http://localhost:3003'),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_PULSE_API_KEY: process.env.NEXT_PUBLIC_PULSE_API_KEY,
  NEXT_PUBLIC_PULSE_URL: process.env.NEXT_PUBLIC_PULSE_URL || process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_PULSE_URL,
  NEXT_PUBLIC_DASHBOARD_URL: process.env.NEXT_PUBLIC_DASHBOARD_URL,
  NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
  NEXT_PUBLIC_EXAMPLE_URL: process.env.NEXT_PUBLIC_EXAMPLE_URL,
});
