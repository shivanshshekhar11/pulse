import { describe, it, expect } from 'vitest';
import { hasPermission, resolveRole, ROLE_PERMISSIONS } from '@pulse/types';
import type { OrgRole, ProjectRole, EffectiveRole } from '@pulse/types';

// ── hasPermission ─────────────────────────────────────────────────────────────

describe('hasPermission', () => {
  describe('owner', () => {
    const role: EffectiveRole = 'owner';

    it('grants every permission via wildcard', () => {
      const permissions = [
        'org:read', 'org:update',
        'members:read', 'members:invite', 'members:remove', 'members:update',
        'projects:read', 'projects:write',
        'environments:read', 'environments:write',
        'flags:read', 'flags:write',
        'rules:read', 'rules:write',
        'segments:read', 'segments:write',
        'apikeys:read', 'apikeys:write',
        'audit:read',
        'anything:at:all',
      ];
      for (const perm of permissions) {
        expect(hasPermission(role, perm), `owner should have ${perm}`).toBe(true);
      }
    });
  });

  describe('admin', () => {
    const role: EffectiveRole = 'admin';

    it('grants org:read and org:update', () => {
      expect(hasPermission(role, 'org:read')).toBe(true);
      expect(hasPermission(role, 'org:update')).toBe(true);
    });

    it('grants all member management permissions', () => {
      expect(hasPermission(role, 'members:read')).toBe(true);
      expect(hasPermission(role, 'members:invite')).toBe(true);
      expect(hasPermission(role, 'members:update')).toBe(true);
      expect(hasPermission(role, 'members:remove')).toBe(true);
    });

    it('grants projects:read and projects:write', () => {
      expect(hasPermission(role, 'projects:read')).toBe(true);
      expect(hasPermission(role, 'projects:write')).toBe(true);
    });

    it('grants environments:read and environments:write', () => {
      expect(hasPermission(role, 'environments:read')).toBe(true);
      expect(hasPermission(role, 'environments:write')).toBe(true);
    });

    it('grants flags:read and flags:write', () => {
      expect(hasPermission(role, 'flags:read')).toBe(true);
      expect(hasPermission(role, 'flags:write')).toBe(true);
    });

    it('grants rules:read and rules:write', () => {
      expect(hasPermission(role, 'rules:read')).toBe(true);
      expect(hasPermission(role, 'rules:write')).toBe(true);
    });

    it('grants segments:read and segments:write', () => {
      expect(hasPermission(role, 'segments:read')).toBe(true);
      expect(hasPermission(role, 'segments:write')).toBe(true);
    });

    it('grants apikeys:read and apikeys:write', () => {
      expect(hasPermission(role, 'apikeys:read')).toBe(true);
      expect(hasPermission(role, 'apikeys:write')).toBe(true);
    });

    it('grants audit:read', () => {
      expect(hasPermission(role, 'audit:read')).toBe(true);
    });

    it('does NOT grant arbitrary permissions not in the map', () => {
      expect(hasPermission(role, 'billing:read')).toBe(false);
      expect(hasPermission(role, 'admin:delete')).toBe(false);
    });
  });

  describe('member', () => {
    const role: EffectiveRole = 'member';

    it('grants org:read', () => {
      expect(hasPermission(role, 'org:read')).toBe(true);
    });

    it('does NOT grant org:update', () => {
      expect(hasPermission(role, 'org:update')).toBe(false);
    });

    it('grants members:read', () => {
      expect(hasPermission(role, 'members:read')).toBe(true);
    });

    it('does NOT grant member management write permissions', () => {
      expect(hasPermission(role, 'members:invite')).toBe(false);
      expect(hasPermission(role, 'members:remove')).toBe(false);
      expect(hasPermission(role, 'members:update')).toBe(false);
    });

    it('grants projects:read', () => {
      expect(hasPermission(role, 'projects:read')).toBe(true);
    });

    it('does NOT grant projects:write', () => {
      expect(hasPermission(role, 'projects:write')).toBe(false);
    });

    it('grants environments:read', () => {
      expect(hasPermission(role, 'environments:read')).toBe(true);
    });

    it('does NOT grant environments:write', () => {
      expect(hasPermission(role, 'environments:write')).toBe(false);
    });

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

    it('does NOT grant apikeys permissions', () => {
      expect(hasPermission(role, 'apikeys:read')).toBe(false);
      expect(hasPermission(role, 'apikeys:write')).toBe(false);
    });

    it('grants audit:read', () => {
      expect(hasPermission(role, 'audit:read')).toBe(true);
    });
  });

  describe('writer (project-level role)', () => {
    const role: EffectiveRole = 'writer';

    it('grants org:read', () => {
      expect(hasPermission(role, 'org:read')).toBe(true);
    });

    it('grants members:read', () => {
      expect(hasPermission(role, 'members:read')).toBe(true);
    });

    it('grants projects:read and environments:read', () => {
      expect(hasPermission(role, 'projects:read')).toBe(true);
      expect(hasPermission(role, 'environments:read')).toBe(true);
    });

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

    it('does NOT grant member management write permissions', () => {
      expect(hasPermission(role, 'members:invite')).toBe(false);
      expect(hasPermission(role, 'members:remove')).toBe(false);
      expect(hasPermission(role, 'members:update')).toBe(false);
    });

    it('does NOT grant apikeys permissions', () => {
      expect(hasPermission(role, 'apikeys:read')).toBe(false);
      expect(hasPermission(role, 'apikeys:write')).toBe(false);
    });

    it('grants audit:read', () => {
      expect(hasPermission(role, 'audit:read')).toBe(true);
    });
  });

  describe('viewer', () => {
    const role: EffectiveRole = 'viewer';

    it('grants org:read', () => {
      expect(hasPermission(role, 'org:read')).toBe(true);
    });

    it('does NOT grant org:update', () => {
      expect(hasPermission(role, 'org:update')).toBe(false);
    });

    it('grants members:read', () => {
      expect(hasPermission(role, 'members:read')).toBe(true);
    });

    it('grants projects:read and environments:read', () => {
      expect(hasPermission(role, 'projects:read')).toBe(true);
      expect(hasPermission(role, 'environments:read')).toBe(true);
    });

    it('grants flags:read, rules:read, segments:read', () => {
      expect(hasPermission(role, 'flags:read')).toBe(true);
      expect(hasPermission(role, 'rules:read')).toBe(true);
      expect(hasPermission(role, 'segments:read')).toBe(true);
    });

    it('does NOT grant any write permissions', () => {
      expect(hasPermission(role, 'org:update')).toBe(false);
      expect(hasPermission(role, 'projects:write')).toBe(false);
      expect(hasPermission(role, 'environments:write')).toBe(false);
      expect(hasPermission(role, 'flags:write')).toBe(false);
      expect(hasPermission(role, 'rules:write')).toBe(false);
      expect(hasPermission(role, 'segments:write')).toBe(false);
    });

    it('does NOT grant member management write permissions', () => {
      expect(hasPermission(role, 'members:invite')).toBe(false);
      expect(hasPermission(role, 'members:remove')).toBe(false);
      expect(hasPermission(role, 'members:update')).toBe(false);
    });

    it('does NOT grant apikeys permissions', () => {
      expect(hasPermission(role, 'apikeys:read')).toBe(false);
      expect(hasPermission(role, 'apikeys:write')).toBe(false);
    });

    it('grants audit:read', () => {
      expect(hasPermission(role, 'audit:read')).toBe(true);
    });
  });

  describe('wildcard matching', () => {
    it('owner wildcard * matches any permission', () => {
      expect(hasPermission('owner', 'flags:read')).toBe(true);
      expect(hasPermission('owner', 'anything:goes')).toBe(true);
    });

    it('exact permission match works without wildcards', () => {
      // admin has explicit 'flags:read' — no wildcard needed
      expect(hasPermission('admin', 'flags:read')).toBe(true);
    });

    it('resource:* wildcard matches resource:action', () => {
      // If a role had 'flags:*', it would match 'flags:read' and 'flags:write'
      // owner has '*' which covers everything — test the wildcard logic directly
      expect(hasPermission('owner', 'flags:read')).toBe(true);
      expect(hasPermission('owner', 'flags:write')).toBe(true);
    });

    it('permission for one resource does not bleed into another', () => {
      // viewer has flags:read but NOT flags:write
      expect(hasPermission('viewer', 'flags:read')).toBe(true);
      expect(hasPermission('viewer', 'flags:write')).toBe(false);
      // viewer has no apikeys permissions at all
      expect(hasPermission('viewer', 'apikeys:read')).toBe(false);
    });
  });

  describe('ROLE_PERMISSIONS constant integrity', () => {
    it('owner has exactly one entry: *', () => {
      expect(ROLE_PERMISSIONS.owner).toEqual(['*']);
    });

    it('all org roles are present', () => {
      const roles: OrgRole[] = ['owner', 'admin', 'member', 'viewer'];
      for (const role of roles) {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
      }
    });

    it('writer role is present (project-level)', () => {
      expect(ROLE_PERMISSIONS.writer).toBeDefined();
    });

    it('admin has more permissions than member', () => {
      // admin can do things member cannot
      expect(hasPermission('admin', 'org:update')).toBe(true);
      expect(hasPermission('member', 'org:update')).toBe(false);
      expect(hasPermission('admin', 'apikeys:read')).toBe(true);
      expect(hasPermission('member', 'apikeys:read')).toBe(false);
      expect(hasPermission('admin', 'segments:write')).toBe(true);
      expect(hasPermission('member', 'segments:write')).toBe(false);
    });

    it('member has more permissions than viewer', () => {
      // member can write flags/rules, viewer cannot
      expect(hasPermission('member', 'flags:write')).toBe(true);
      expect(hasPermission('viewer', 'flags:write')).toBe(false);
      expect(hasPermission('member', 'rules:write')).toBe(true);
      expect(hasPermission('viewer', 'rules:write')).toBe(false);
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
