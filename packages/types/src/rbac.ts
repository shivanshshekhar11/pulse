import { z } from 'zod';

// ── Role definitions ──────────────────────────────────────────────────────────

export const OrgRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
export const ProjectRoleSchema = z.enum(['admin', 'writer', 'viewer']);

export type OrgRole = z.infer<typeof OrgRoleSchema>;
export type ProjectRole = z.infer<typeof ProjectRoleSchema>;
export type EffectiveRole = OrgRole | ProjectRole;

// ── Permission map ────────────────────────────────────────────────────────────
//
// Every permission follows the pattern `resource:action`.
// Wildcards (`resource:*`) grant all actions on that resource.
// The special `*` grants everything (owner only).
//
// Resources and their actions:
//   org          — read, update
//   members      — read, invite, update, remove
//   projects     — read, write  (write = create / update / delete)
//   environments — read, write
//   flags        — read, write
//   rules        — read, write
//   segments     — read, write
//   apikeys      — read, write  (write = create / revoke)
//   audit        — read
//
// Role matrix:
//
//   Permission          owner  admin  member  writer  viewer
//   ─────────────────── ─────  ─────  ──────  ──────  ──────
//   org:read              ✓      ✓      ✓       ✓       ✓
//   org:update            ✓      ✓
//   members:read          ✓      ✓      ✓       ✓       ✓
//   members:invite        ✓      ✓
//   members:update        ✓      ✓
//   members:remove        ✓      ✓
//   projects:read         ✓      ✓      ✓       ✓       ✓
//   projects:write        ✓      ✓
//   environments:read     ✓      ✓      ✓       ✓       ✓
//   environments:write    ✓      ✓
//   flags:read            ✓      ✓      ✓       ✓       ✓
//   flags:write           ✓      ✓      ✓       ✓
//   rules:read            ✓      ✓      ✓       ✓       ✓
//   rules:write           ✓      ✓      ✓       ✓
//   segments:read         ✓      ✓      ✓       ✓       ✓
//   segments:write        ✓      ✓
//   apikeys:read          ✓      ✓
//   apikeys:write         ✓      ✓
//   audit:read            ✓      ✓      ✓       ✓       ✓

export const ROLE_PERMISSIONS = {
  owner: ['*'],
  admin: [
    'org:read',
    'org:update',
    'members:read',
    'members:invite',
    'members:update',
    'members:remove',
    'projects:read',
    'projects:write',
    'environments:read',
    'environments:write',
    'flags:read',
    'flags:write',
    'rules:read',
    'rules:write',
    'segments:read',
    'segments:write',
    'apikeys:read',
    'apikeys:write',
    'audit:read',
  ],
  member: [
    'org:read',
    'members:read',
    'projects:read',
    'environments:read',
    'flags:read',
    'flags:write',
    'rules:read',
    'rules:write',
    'segments:read',
    'audit:read',
  ],
  // writer is the project-level equivalent of member
  writer: [
    'org:read',
    'members:read',
    'projects:read',
    'environments:read',
    'flags:read',
    'flags:write',
    'rules:read',
    'rules:write',
    'segments:read',
    'audit:read',
  ],
  viewer: [
    'org:read',
    'members:read',
    'projects:read',
    'environments:read',
    'flags:read',
    'rules:read',
    'segments:read',
    'audit:read',
  ],
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolves the effective role for a user, preferring project-level over org-level. */
export function resolveRole(
  orgRole: OrgRole,
  projectRole: ProjectRole | null
): EffectiveRole {
  return projectRole ?? orgRole;
}

/** Returns true if the given role has the requested permission. */
export function hasPermission(role: EffectiveRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] as readonly string[];

  // owner has everything
  if (permissions.includes('*')) return true;

  // exact match
  if (permissions.includes(permission)) return true;

  // wildcard match: 'flags:*' satisfies 'flags:read'
  const [resource] = permission.split(':');
  if (resource && permissions.includes(`${resource}:*`)) return true;

  return false;
}
