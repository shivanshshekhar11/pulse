import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '..');

const nodeEnv = process.env.NODE_ENV || 'development';
dotenv.config({ path: path.resolve(apiRoot, `.env.${nodeEnv}`) });
dotenv.config({ path: path.resolve(apiRoot, '.env') });

const envSchema = z.object({
  API_PORT: z.string().default('4000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // In production, secrets must be explicitly set and be at least 32 characters.
  // In development, weak defaults are allowed for convenience.
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters — generate with: openssl rand -base64 32')
    .default('dev-secret-change-in-production-min-32-chars'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters — generate with: openssl rand -base64 32')
    .default('dev-refresh-secret-change-in-production-min-32'),
  DATABASE_URL: z.string().default('postgresql://pulse:pulse@localhost:5432/pulse'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001,http://localhost:3002'),
});

const envVars = envSchema.parse(process.env);

export const config = {
  port: parseInt(envVars.API_PORT, 10),
  nodeEnv: envVars.NODE_ENV,
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  },
  database: {
    url: envVars.DATABASE_URL,
  },
  redis: {
    url: envVars.REDIS_URL,
  },
  cors: {
    allowedOrigins: envVars.ALLOWED_ORIGINS.split(',').map(s => s.trim()),
  },
} as const;
