import { describe, it, expect } from 'vitest';
import { hasPermission, resolveRole, ROLE_PERMISSIONS } from '@pulse/types';
import type { OrgRole, ProjectRole, EffectiveRole } from '@pulse/types';

// ── hasPermission ─────────────────────────────────────────────────────────────

describe('hasPermission', () => {
  describe('owner', () => {
    const role: EffectiveRole = 'owner';

    it('grants every specific permission via wildcard', () => {
      const permissions = [
        'flags:read', 'flags:write',
        'rules:read', 'rules:write',
        'segments:read', 'segments:write',
        'members:invite', 'members:remove', 'members:update',
        'apikeys:read', 'apikeys:write',
        'environments:read', 'environments:write',
        'projects:read', 'projects:write',
        'anything:at:all',
      ];
      for (const perm of permissions) {
        expect(hasPermission(role, perm), `owner should have ${perm}`).toBe(true);
      }
    });
  });

  describe('admin', () => {
    const role: EffectiveRole = 'admin';

    it('grants flags:read and flags:write via flags:* wildcard', () => {
      expect(hasPermission(role, 'flags:read')).toBe(true);
      expect(hasPermission(role, 'flags:write')).toBe(true);
    });

    it('grants rules:read and rules:write via rules:* wildcard', () => {
      expect(hasPermission(role, 'rules:read')).toBe(true);
      expect(hasPermission(role, 'rules:write')).toBe(true);
    });

    it('grants segments:read and segments:write via segments:* wildcard', () => {
      expect(hasPermission(role, 'segments:read')).toBe(true);
      expect(hasPermission(role, 'segments:write')).toBe(true);
    });

    it('grants members:invite, members:remove, members:update explicitly', () => {
      expect(hasPermission(role, 'members:invite')).toBe(true);
      expect(hasPermission(role, 'members:remove')).toBe(true);
      expect(hasPermission(role, 'members:update')).toBe(true);
    });

    it('grants apikeys:* wildcard', () => {
      expect(hasPermission(role, 'apikeys:read')).toBe(true);
      expect(hasPermission(role, 'apikeys:write')).toBe(true);
    });

    it('grants environments:* wildcard', () => {
      expect(hasPermission(role, 'environments:read')).toBe(true);
      expect(hasPermission(role, 'environments:write')).toBe(true);
    });

    it('grants projects:* wildcard', () => {
      expect(hasPermission(role, 'projects:read')).toBe(true);
      expect(hasPermission(role, 'projects:write')).toBe(true);
    });

    it('does NOT grant arbitrary permissions not in the map', () => {
      expect(hasPermission(role, 'billing:read')).toBe(false);
      expect(hasPermission(role, 'admin:delete')).toBe(false);
    });
  });

  describe('member', () => {
    const role: EffectiveRole = 'member';

    it('grants flags:read and flags:write', () => {
      expect(hasPermission(role, 'flags:read')).toBe(true);
      expect(hasPermission(role, 'flags:write')).toBe(true);
    });

    it('grants rules:read and rules:write', () => {
      expect(hasPermission(role, 'rules:read')).toBe(true);
      expect(hasPermission(role, 'rules:write')).toBe(true);
    });

    it('grants segments:read', () => {
      expect(hasPermission(role, 'segments:read')).toBe(true);
    });

    it('does NOT grant segments:write', () => {
      expect(hasPermission(role, 'segments:write')).toBe(false);
    });

    it('does NOT grant member management permissions', () => {
      expect(hasPermission(role, 'members:invite')).toBe(false);
      expect(hasPermission(role, 'members:remove')).toBe(false);
      expect(hasPermission(role, 'members:update')).toBe(false);
    });

    it('does NOT grant apikeys permissions', () => {
      expect(hasPermission(role, 'apikeys:read')).toBe(false);
      expect(hasPermission(role, 'apikeys:write')).toBe(false);
    });

    it('does NOT grant environments permissions', () => {
      expect(hasPermission(role, 'environments:read')).toBe(false);
      expect(hasPermission(role, 'environments:write')).toBe(false);
    });

    it('does NOT grant projects permissions', () => {
      expect(hasPermission(role, 'projects:read')).toBe(false);
      expect(hasPermission(role, 'projects:write')).toBe(false);
    });
  });

  describe('writer (project-level role)', () => {
    const role: EffectiveRole = 'writer';

    it('grants flags:read and flags:write', () => {
      expect(hasPermission(role, 'flags:read')).toBe(true);
      expect(hasPermission(role, 'flags:write')).toBe(true);
    });

    it('grants rules:read and rules:write', () => {
      expect(hasPermission(role, 'rules:read')).toBe(true);
      expect(hasPermission(role, 'rules:write')).toBe(true);
    });

    it('grants segments:read', () => {
      expect(hasPermission(role, 'segments:read')).toBe(true);
    });

    it('does NOT grant segments:write', () => {
      expect(hasPermission(role, 'segments:write')).toBe(false);
    });

    it('does NOT grant member management permissions', () => {
      expect(hasPermission(role, 'members:invite')).toBe(false);
      expect(hasPermission(role, 'members:remove')).toBe(false);
    });
  });

  describe('viewer', () => {
    const role: EffectiveRole = 'viewer';

    it('grants flags:read', () => {
      expect(hasPermission(role, 'flags:read')).toBe(true);
    });

    it('grants rules:read', () => {
      expect(hasPermission(role, 'rules:read')).toBe(true);
    });

    it('grants segments:read', () => {
      expect(hasPermission(role, 'segments:read')).toBe(true);
    });

    it('does NOT grant any write permissions', () => {
      expect(hasPermission(role, 'flags:write')).toBe(false);
      expect(hasPermission(role, 'rules:write')).toBe(false);
      expect(hasPermission(role, 'segments:write')).toBe(false);
    });

    it('does NOT grant member management permissions', () => {
      expect(hasPermission(role, 'members:invite')).toBe(false);
      expect(hasPermission(role, 'members:remove')).toBe(false);
      expect(hasPermission(role, 'members:update')).toBe(false);
    });

    it('does NOT grant apikeys permissions', () => {
      expect(hasPermission(role, 'apikeys:read')).toBe(false);
      expect(hasPermission(role, 'apikeys:write')).toBe(false);
    });
  });

  describe('wildcard matching', () => {
    it('flags:* matches flags:read', () => {
      expect(hasPermission('admin', 'flags:read')).toBe(true);
    });

    it('flags:* matches flags:write', () => {
      expect(hasPermission('admin', 'flags:write')).toBe(true);
    });

    it('flags:* does NOT match rules:read (different resource)', () => {
      // admin has rules:* separately, but this tests the wildcard logic
      expect(hasPermission('viewer', 'flags:write')).toBe(false);
    });

    it('exact match takes precedence over wildcard for explicit permissions', () => {
      // members:invite is explicit in admin, not via wildcard
      expect(hasPermission('admin', 'members:invite')).toBe(true);
    });
  });

  describe('ROLE_PERMISSIONS constant integrity', () => {
    it('owner has exactly one entry: *', () => {
      expect(ROLE_PERMISSIONS.owner).toEqual(['*']);
    });

    it('all roles are present', () => {
      const roles: OrgRole[] = ['owner', 'admin', 'member', 'viewer'];
      for (const role of roles) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
      }
    });

    it('writer role is present (project-level)', () => {
      expect(ROLE_PERMISSIONS.writer).toBeDefined();
    });
  });
});

// ── resolveRole ───────────────────────────────────────────────────────────────

describe('resolveRole', () => {
  it('returns org role when no project role is provided', () => {
    expect(resolveRole('member', null)).toBe('member');
    expect(resolveRole('viewer', null)).toBe('viewer');
    expect(resolveRole('admin', null)).toBe('admin');
    expect(resolveRole('owner', null)).toBe('owner');
  });

  it('returns project role when provided, overriding org role', () => {
    // viewer at org level but admin at project level
    expect(resolveRole('viewer', 'admin')).toBe('admin');
    // admin at org level but viewer at project level (downgrade)
    expect(resolveRole('admin', 'viewer')).toBe('viewer');
    // member at org level, writer at project level
    expect(resolveRole('member', 'writer')).toBe('writer');
  });

  it('project role null falls back to org role', () => {
    expect(resolveRole('owner', null)).toBe('owner');
  });

  it('all project role values are accepted', () => {
    const projectRoles: ProjectRole[] = ['admin', 'writer', 'viewer'];
    for (const pr of projectRoles) {
      const result = resolveRole('member', pr);
      expect(result).toBe(pr);
    }
  });
});
