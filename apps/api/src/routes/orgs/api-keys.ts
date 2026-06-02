import type { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  ListApiKeysRouteSchema,
  CreateApiKeyRouteSchema,
  RevokeApiKeyRouteSchema,
} from '@pulse-flags/types';
import { assertPermission } from '../../lib/rbac';
import { writeAuditLog } from '../../lib/audit';
import { findOrgBySlug } from '../../services/organizations';
import * as apiKeyService from '../../services/api-keys';

export default async function apiKeyRoutes(fastify: FastifyInstance) {
  const f = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /api/v1/orgs/:orgSlug/api-keys
  f.get('/:orgSlug/api-keys', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['API Keys'],
      summary: 'List API Keys',
      params: ListApiKeysRouteSchema.params,
      response: ListApiKeysRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { orgSlug } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'apikeys:read', org.id))) return;

    const keys = await apiKeyService.listApiKeys(org.id);

    // Never expose keyHash — project only safe fields
    return reply.send({
      data: keys.map((k) => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        environmentId: k.environmentId,
        scopes: k.scopes,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
        createdAt: k.createdAt,
      })),
    });
  });

  // POST /api/v1/orgs/:orgSlug/api-keys
  f.post('/:orgSlug/api-keys', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['API Keys'],
      summary: 'Create API Key',
      params: CreateApiKeyRouteSchema.params,
      body: CreateApiKeyRouteSchema.body,
      response: CreateApiKeyRouteSchema.response,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'apikeys:write', org.id))) return;

    const { key, rawKey } = await apiKeyService.createApiKey(org.id, userId, request.body);
    if (!key) {
      return reply.code(500).send({
        error: { code: 'CREATE_FAILED', message: 'Failed to create API key', requestId },
      });
    }

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'apikey.created',
      resourceType: 'apikey',
      resourceId: key.id,
      newValue: { name: key.name, keyPrefix: key.keyPrefix, scopes: key.scopes },
      ip: request.ip,
    });

    // rawKey is returned exactly once — cannot be recovered after this response
    return reply.code(201).send({
      data: {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        environmentId: key.environmentId,
        scopes: key.scopes,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
        rawKey,
      },
    });
  });

  // DELETE /api/v1/orgs/:orgSlug/api-keys/:keyId
  f.delete('/:orgSlug/api-keys/:keyId', {
    onRequest: [fastify.authenticate],
    schema: {
      tags: ['API Keys'],
      summary: 'Revoke API Key',
      params: RevokeApiKeyRouteSchema.params,
    },
  }, async (request, reply) => {
    const requestId = request.id;
    const { userId } = request.user;
    const { orgSlug, keyId } = request.params;

    const org = await findOrgBySlug(orgSlug);
    if (!org) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'Organization not found', requestId },
      });
    }

    if (!(await assertPermission(request, reply, 'apikeys:write', org.id))) return;

    const key = await apiKeyService.findApiKey(org.id, keyId);
    if (!key) {
      return reply.code(404).send({
        error: { code: 'NOT_FOUND', message: 'API key not found', requestId },
      });
    }

    if (key.revokedAt) {
      return reply.code(400).send({
        error: { code: 'ALREADY_REVOKED', message: 'API key is already revoked', requestId },
      });
    }

    await apiKeyService.revokeApiKey(key.id);

    await writeAuditLog({
      orgId: org.id,
      actorId: userId,
      action: 'apikey.revoked',
      resourceType: 'apikey',
      resourceId: key.id,
      oldValue: { name: key.name, keyPrefix: key.keyPrefix },
      ip: request.ip,
    });

    return reply.code(204).send();
  });
}
