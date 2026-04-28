import { z } from 'zod';

// Role definitions
export const OrgRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);
export const ProjectRoleSchema = z.enum(['admin', 'writer', 'viewer']);

export type OrgRole = z.infer<typeof OrgRoleSchema>;
export type ProjectRole = z.infer<typeof ProjectRoleSchema>;
export type EffectiveRole = OrgRole | ProjectRole;

// Permission map - stored as constant, not in DB
export const ROLE_PERMISSIONS = {
  owner: ['*'],
  admin: [
    'flags:*',
    'rules:*',
    'segments:*',
    'members:invite',
    'members:remove',
    'members:update',
    'apikeys:*',
    'environments:*',
    'projects:*',
  ],
  member: [
    'flags:read',
    'flags:write',
    'rules:read',
    'rules:write',
    'segments:read',
  ],
  writer: [
    'flags:read',
    'flags:write',
    'rules:read',
    'rules:write',
    'segments:read',
  ],
  viewer: ['flags:read', 'rules:read', 'segments:read'],
} as const;

// Helper to resolve effective role
export function resolveRole(
  orgRole: OrgRole,
  projectRole: ProjectRole | null
): EffectiveRole {
  return projectRole ?? orgRole;
}

// Helper to check permission
export function hasPermission(role: EffectiveRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] as readonly string[];
  
  // Owner has all permissions
  if (permissions.includes('*')) return true;
  
  // Check exact match
  if (permissions.includes(permission)) return true;
  
  // Check wildcard match (e.g., 'flags:*' matches 'flags:read')
  const [resource] = permission.split(':');
  if (resource && permissions.includes(`${resource}:*`)) return true;
  
  return false;
}
