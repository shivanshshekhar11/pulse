import '@fastify/jwt';
import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    id: string;
    apiKey?: {
      id: string;
      orgId: string;
      environmentId: string | null;
      name: string;
      keyPrefix: string;
      keyHash: string;
      scopes: string[];
      lastUsedAt: Date | null;
      expiresAt: Date | null;
      revokedAt: Date | null;
      createdBy: string;
      createdAt: Date;
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      userId: string;
      email: string;
    };
  }
}
