// ── Shared primitives ─────────────────────────────────────────────────────────
export * from './common';

// ── Rule engine (used by SDK + API) ───────────────────────────────────────────
export * from './rules';

// ── RBAC (roles, permissions, helpers) ────────────────────────────────────────
export * from './rbac';

// ── Domain schemas (entity + request + response + route contracts) ────────────
export * from './schemas/auth';
export * from './schemas/orgs';
export * from './schemas/projects';
export * from './schemas/api-keys';
export * from './schemas/flags';
export * from './schemas/rules';
export * from './schemas/segments';
export * from './schemas/audit';
export * from './schemas/sdk';
