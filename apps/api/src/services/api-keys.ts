import { db } from '../db';
import { apiKeys, environments } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { generateApiKey, sha256 } from '../lib/crypto';
import type { CreateApiKey } from '@pulse/types';

export async function listApiKeys(orgId: string) {
  return db.query.apiKeys.findMany({
    where: and(eq(apiKeys.orgId, orgId), isNull(apiKeys.revokedAt)),
  });
}

export async function findApiKey(orgId: string, keyId: string) {
  return db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)),
  });
}

export async function createApiKey(orgId: string, createdBy: string, data: CreateApiKey) {
  // Determine key prefix based on environment type
  const environment = data.environmentId
    ? await db.query.environments.findFirst({
        where: eq(environments.id, data.environmentId),
      })
    : null;

  const isProduction = environment?.name === 'production';
  const rawKey = generateApiKey(isProduction);
  const keyHash = sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const [key] = await db
    .insert(apiKeys)
    .values({
      orgId,
      environmentId: data.environmentId,
      name: data.name,
      keyPrefix,
      keyHash,
      scopes: data.scopes ?? ['read'],
      expiresAt: data.expiresAt ?? null,
      createdBy,
    })
    .returning();

  // Return both the DB record and the raw key (shown once only)
  return { key: key!, rawKey };
}

export async function revokeApiKey(keyId: string) {
  await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, keyId));
}
