import { db } from './index';
import {
  users,
  organizations,
  orgMembers,
  projects,
  projectMembers,
  environments,
  apiKeys,
  flags,
  rules,
  segments,
  auditLogs,
} from './schema';
import { hashPassword, generateApiKey, sha256 } from '../lib/crypto';
import { sql } from 'drizzle-orm';

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  await db.execute(sql`
    TRUNCATE TABLE
      users, organizations, org_members, projects, project_members,
      environments, api_keys, flags, rules, segments, audit_logs
    RESTART IDENTITY CASCADE;
  `);
  console.log('  ✓ Database cleared\n');
}

async function seed() {
  console.log('🌱 Starting database seed...\n');
  await clearDatabase();

  // ============================================================================
  // USERS
  // ============================================================================
  console.log('👤 Creating users...');

  const createdUsers = await db
    .insert(users)
    .values([
      { email: 'alice@novapay.com', name: 'Alice Anderson', passwordHash: await hashPassword('password123') },
      { email: 'bob@novapay.com', name: 'Bob Builder', passwordHash: await hashPassword('password123') },
      { email: 'carol@novapay.com', name: 'Carol Chen', passwordHash: await hashPassword('password123') },
      { email: 'diana@novapay.com', name: 'Diana Davis', passwordHash: await hashPassword('password123') },
      { email: 'eve@external.com', name: 'Eve External', passwordHash: await hashPassword('password123') },
      { email: 'charlie@acme.com', name: 'Charlie Tech', passwordHash: await hashPassword('password123') },
      { email: 'frank@acme.com', name: 'Frank Finance', passwordHash: await hashPassword('password123') },
      { email: 'grace@acme.com', name: 'Grace Global', passwordHash: await hashPassword('password123') },
      { email: 'hank@acme.com', name: 'Hank HR', passwordHash: await hashPassword('password123') },
    ])
    .returning();
  const alice = createdUsers[0]!;
  const bob = createdUsers[1]!;
  const carol = createdUsers[2]!;
  const diana = createdUsers[3]!;
  const eve = createdUsers[4]!;
  const charlie = createdUsers[5]!;
  const frank = createdUsers[6]!;
  const grace = createdUsers[7]!;
  const hank = createdUsers[8]!;

  console.log('  ✓ Created 6 users\n');

  // ============================================================================
  // ORGANIZATIONS
  // ============================================================================
  console.log('🏢 Creating organizations...');

  const createdOrgs = await db
    .insert(organizations)
    .values([
      { slug: 'novapay', name: 'NovaPay', plan: 'enterprise' },
      { slug: 'acme-corp', name: 'Acme Corporation', plan: 'pro' },
    ])
    .returning();
  const novaPay = createdOrgs[0]!;
  const acmeCorp = createdOrgs[1]!;

  console.log('  ✓ Created 2 organizations\n');

  // ============================================================================
  // ORG MEMBERS
  // ============================================================================
  console.log('👥 Adding organization members...');

  await db.insert(orgMembers).values([
    { orgId: novaPay.id, userId: alice.id,  role: 'owner'  },
    { orgId: novaPay.id, userId: bob.id,    role: 'admin',  invitedBy: alice.id },
    { orgId: novaPay.id, userId: carol.id,  role: 'member', invitedBy: alice.id },
    { orgId: novaPay.id, userId: diana.id,  role: 'member', invitedBy: alice.id },
    { orgId: novaPay.id, userId: eve.id,    role: 'viewer', invitedBy: alice.id },

    { orgId: acmeCorp.id, userId: charlie.id, role: 'owner' },
    { orgId: acmeCorp.id, userId: frank.id, role: 'admin', invitedBy: charlie.id },
    { orgId: acmeCorp.id, userId: grace.id, role: 'member', invitedBy: charlie.id },
    { orgId: acmeCorp.id, userId: hank.id, role: 'member', invitedBy: charlie.id },
    { orgId: acmeCorp.id, userId: alice.id, role: 'viewer', invitedBy: charlie.id }, // Alice views Acme
  ]);

  console.log('  ✓ Added 10 org memberships\n');

  // ============================================================================
  // PROJECTS
  // ============================================================================
  console.log('📦 Creating projects...');

  const createdProjects = await db
    .insert(projects)
    .values([
      { orgId: novaPay.id,  slug: 'novapay-web',      name: 'Web Application' },
      { orgId: novaPay.id,  slug: 'novapay-mobile',   name: 'Mobile App'      },
      { orgId: novaPay.id,  slug: 'novapay-api',      name: 'Backend API'     },
      { orgId: acmeCorp.id, slug: 'acme-web',         name: 'Web Platform'    },
      { orgId: acmeCorp.id, slug: 'acme-api',         name: 'Core API'        },
    ])
    .returning();
  const novaWeb = createdProjects[0]!;
  const novaMobile = createdProjects[1]!;
  const novaApi = createdProjects[2]!;
  const acmeWeb = createdProjects[3]!;
  const acmeApi = createdProjects[4]!;

  console.log('  ✓ Created 5 projects\n');

  // ============================================================================
  // PROJECT MEMBERS
  // ============================================================================
  console.log('🔐 Adding project-specific permissions...');

  await db.insert(projectMembers).values([
    { projectId: novaApi.id, userId: eve.id, role: 'admin' },
  ]);

  console.log('  ✓ Added 1 project-specific override\n');

  // ============================================================================
  // ENVIRONMENTS
  // ============================================================================
  console.log('🌍 Creating environments...');

  const allProjects = [novaWeb, novaMobile, novaApi, acmeWeb, acmeApi];
  const environmentsData = [];

  for (const project of allProjects) {
    environmentsData.push(
      { projectId: project.id, name: 'production',  color: '#ef4444', isDefault: false },
      { projectId: project.id, name: 'staging',     color: '#f59e0b', isDefault: false },
      { projectId: project.id, name: 'development', color: '#10b981', isDefault: true  },
    );
  }

  const createdEnvironments = await db.insert(environments).values(environmentsData).returning();

  const novaWebDev = createdEnvironments.find(e => e.projectId === novaWeb.id && e.name === 'development')!;

  console.log(`  ✓ Created ${createdEnvironments.length} environments\n`);

  // ============================================================================
  // API KEYS
  // ============================================================================
  console.log('🔑 Creating API keys...');

  const apiKeysData = [];
  const rawKeys: Record<string, string> = {};

  for (const env of createdEnvironments) {
    const isProd = env.name === 'production';
    let rawKey = generateApiKey(isProd);

    if (env.id === novaWebDev.id) {
      rawKey = 'ps_test_your_api_key_here';
    }

    const keyHash  = sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    apiKeysData.push({
      orgId:         allProjects.find(p => p.id === env.projectId)!.orgId,
      environmentId: env.id,
      name:          `${env.name} Key`,
      keyPrefix,
      keyHash,
      scopes:        ['read', 'write'],
      createdBy:     alice.id,
    });

    rawKeys[`${env.projectId}-${env.name}`] = rawKey;
  }

  await db.insert(apiKeys).values(apiKeysData);

  console.log(`  ✓ Created ${apiKeysData.length} API keys`);
  console.log(`  📝 NovaPay dev key (used by example app): ${rawKeys[`${novaWeb.id}-development`]}\n`);

  // ============================================================================
  // SEGMENTS
  // ============================================================================
  console.log('🎯 Creating segments...');

  const createdSegments = await db
    .insert(segments)
    .values([
      { orgId: novaPay.id, name: 'Internal Beta', description: 'Internal testing.', conditions: { attribute: 'beta', op: 'eq', value: 'true' } },
      { orgId: novaPay.id, name: 'Pro Plan Users', description: 'Pro/Ent users.', conditions: { attribute: 'plan', op: 'in', value: ['pro', 'enterprise'] } },
      { orgId: novaPay.id, name: 'EU Users', description: 'EU based users.', conditions: { attribute: 'country', op: 'in', value: ['DE', 'FR', 'IT', 'ES'] } },
      { orgId: acmeCorp.id, name: 'Mobile Users', description: 'Mobile users.', conditions: { attribute: 'platform', op: 'in', value: ['ios', 'android'] } },
      { orgId: acmeCorp.id, name: 'Power Users', description: 'Power users.', conditions: { operator: 'AND', conditions: [{ attribute: 'loginCount', op: 'gte', value: 50 }, { attribute: 'accountAge', op: 'gte', value: 90 }] } },
    ])
    .returning();
  const internalBeta = createdSegments[0]!;
  const proUsers = createdSegments[1]!;
  const euUsers = createdSegments[2]!;
  const mobileUsers = createdSegments[3]!;
  const powerUsers = createdSegments[4]!;

  console.log('  ✓ Created 5 segments\n');

  // ============================================================================
  // FLAGS AND RULES (DYNAMIC)
  // ============================================================================
  console.log('🚩 Creating feature flags and rules...');

  const rulesData: any[] = [];
  
  const generateRulesForFlag = (flagId: string, flagKey: string, flagType: string, isNova: boolean) => {
    const segment1Id = isNova ? internalBeta.id : mobileUsers.id;
    const segment2Id = isNova ? proUsers.id : powerUsers.id;
    const segment3Id = isNova ? euUsers.id : powerUsers.id;

    // Hardcode specific rules for the NovaPay example app flags to match E2E and Demo Lab
    if (flagKey === 'new_homepage_hero') {
      rulesData.push(
        { flagId, name: 'Beta Users Access', priority: 0, conditions: { attribute: 'userId', op: 'segment', value: segment1Id }, percentage: 100, value: true, enabled: true },
        { flagId, name: 'Pro Users Access', priority: 1, conditions: { attribute: 'userId', op: 'segment', value: segment2Id }, percentage: 100, value: true, enabled: true },
        { flagId, name: '50% Rollout', priority: 2, conditions: { attribute: 'userId', op: 'neq', value: '' }, percentage: 50, value: true, enabled: true }
      );
      return;
    }
    if (flagKey === 'pricing_cta_text') {
      rulesData.push(
        { flagId, name: 'Enterprise CTA', priority: 0, conditions: { operator: 'AND', conditions: [{ attribute: 'plan', op: 'eq', value: 'enterprise' }] }, percentage: 100, value: 'Contact Sales', enabled: true },
        { flagId, name: 'Pro CTA', priority: 1, conditions: { attribute: 'userId', op: 'segment', value: segment2Id }, percentage: 100, value: 'Upgrade to Pro', enabled: true },
        { flagId, name: 'Beta Trial CTA', priority: 2, conditions: { attribute: 'userId', op: 'segment', value: segment1Id }, percentage: 100, value: 'Start Free Trial (Beta)', enabled: true }
      );
      return;
    }
    if (flagKey === 'new_analytics_widget') {
      rulesData.push(
        { flagId, name: 'Power Users Only', priority: 0, conditions: { operator: 'AND', conditions: [{ op: 'eq', attribute: 'userId', value: 'power-user-123' }] }, percentage: 100, value: true, enabled: true },
        { flagId, name: 'Enterprise Widget', priority: 1, conditions: { operator: 'AND', conditions: [{ attribute: 'plan', op: 'eq', value: 'enterprise' }] }, percentage: 100, value: true, enabled: true },
        { flagId, name: '10% Canary', priority: 2, conditions: { attribute: 'userId', op: 'neq', value: '' }, percentage: 10, value: true, enabled: true }
      );
      return;
    }
    if (flagKey === 'beta_export_feature') {
      rulesData.push(
        { flagId, name: 'Beta Segment Rule', priority: 0, conditions: { attribute: 'userId', op: 'segment', value: segment1Id }, percentage: 100, value: true, enabled: true },
        { flagId, name: 'Admin Override', priority: 1, conditions: { operator: 'AND', conditions: [{ attribute: 'userId', op: 'eq', value: 'admin-1' }] }, percentage: 100, value: true, enabled: true },
        { flagId, name: 'Paused Rollout', priority: 2, conditions: { attribute: 'userId', op: 'neq', value: '' }, percentage: 0, value: true, enabled: true }
      );
      return;
    }
    if (flagKey === 'theme_config') {
      rulesData.push(
        { flagId, name: 'Pro Plan Theme', priority: 0, conditions: { attribute: 'userId', op: 'segment', value: segment2Id }, percentage: 100, value: { primaryColor: '#ef4444', radius: 12 }, enabled: true },
        { flagId, name: 'Tester Custom Theme', priority: 1, conditions: { operator: 'AND', conditions: [{ attribute: 'userId', op: 'eq', value: 'tester' }] }, percentage: 100, value: { primaryColor: '#10b981', radius: 24 }, enabled: true },
        { flagId, name: '10% New Theme', priority: 2, conditions: { attribute: 'userId', op: 'neq', value: '' }, percentage: 10, value: { primaryColor: '#f59e0b', radius: 16 }, enabled: true }
      );
      return;
    }

    if (flagType === 'boolean') {
      rulesData.push(
        { flagId, name: `${flagKey} - Beta Testing`, priority: 0, conditions: { attribute: 'userId', op: 'segment', value: segment1Id }, percentage: 100, value: true, enabled: true },
        { flagId, name: `${flagKey} - Premium Access`, priority: 1, conditions: { attribute: 'userId', op: 'segment', value: segment2Id }, percentage: 100, value: true, enabled: true },
        { flagId, name: `${flagKey} - 10% Canary`, priority: 2, conditions: { attribute: 'userId', op: 'neq', value: '' }, percentage: 10, value: true, enabled: true }
      );
    } else if (flagType === 'string') {
      const v1 = flagKey.includes('cta') ? 'Upgrade to Pro' : 'Variant A';
      const v2 = flagKey.includes('cta') ? 'Start Free Trial (EU)' : 'Variant B';
      const v3 = flagKey.includes('cta') ? 'Try Premium' : 'Variant C';
      rulesData.push(
        { flagId, name: `${flagKey} - VIP Text`, priority: 0, conditions: { attribute: 'userId', op: 'segment', value: segment2Id }, percentage: 100, value: v1, enabled: true },
        { flagId, name: `${flagKey} - Regional Text`, priority: 1, conditions: { attribute: 'userId', op: 'segment', value: segment3Id }, percentage: 100, value: v2, enabled: true },
        { flagId, name: `${flagKey} - 50% Split`, priority: 2, conditions: { attribute: 'userId', op: 'neq', value: '' }, percentage: 50, value: v3, enabled: true }
      );
    } else if (flagType === 'number') {
      const scale = flagKey.includes('timeout') ? 1000 : 100;
      rulesData.push(
        { flagId, name: `${flagKey} - VIP Limit`, priority: 0, conditions: { attribute: 'userId', op: 'segment', value: segment2Id }, percentage: 100, value: 5 * scale, enabled: true },
        { flagId, name: `${flagKey} - Beta Override`, priority: 1, conditions: { attribute: 'userId', op: 'segment', value: segment1Id }, percentage: 100, value: 2 * scale, enabled: true },
        { flagId, name: `${flagKey} - Default Scale`, priority: 2, conditions: { attribute: 'userId', op: 'neq', value: '' }, percentage: 100, value: 1 * scale, enabled: true }
      );
    } else if (flagType === 'json') {
      rulesData.push(
        { flagId, name: `${flagKey} - Beta Config`, priority: 0, conditions: { attribute: 'userId', op: 'segment', value: segment1Id }, percentage: 100, value: { primaryColor: '#10b981', radius: 4 }, enabled: true },
        { flagId, name: `${flagKey} - Pro Config`, priority: 1, conditions: { attribute: 'userId', op: 'segment', value: segment2Id }, percentage: 100, value: { primaryColor: '#ef4444', radius: 12 }, enabled: true },
        { flagId, name: `${flagKey} - Fallback Config`, priority: 2, conditions: { attribute: 'userId', op: 'neq', value: '' }, percentage: 100, value: { primaryColor: '#f59e0b', radius: 16 }, enabled: true }
      );
    }
  };
  
  const pendingFlags: any[] = [];
  
  for (const env of createdEnvironments) {
    const isProd = env.name === 'production';
    const creatorId = env.projectId === novaWeb.id || env.projectId === novaMobile.id || env.projectId === novaApi.id ? alice.id : charlie.id;

    if (env.projectId === novaWeb.id) {
      pendingFlags.push(
        { environmentId: env.id, key: 'new_homepage_hero', name: 'New Homepage Hero', description: 'Redesigned hero section.', type: 'boolean', defaultValue: false, enabled: !isProd, tags: ['ui', 'homepage'], createdBy: creatorId },
        { environmentId: env.id, key: 'pricing_cta_text', name: 'Pricing CTA Text', description: 'Controls the Pro plan button copy.', type: 'string', defaultValue: 'Start Free', enabled: true, tags: ['marketing'], createdBy: creatorId },
        { environmentId: env.id, key: 'new_analytics_widget', name: 'New Analytics Widget', description: '10% percentage rollout.', type: 'boolean', defaultValue: false, enabled: !isProd, tags: ['analytics'], createdBy: creatorId },
        { environmentId: env.id, key: 'beta_export_feature', name: 'Beta Export Feature', description: 'Gated by Internal Beta.', type: 'boolean', defaultValue: false, enabled: !isProd, tags: ['beta'], createdBy: creatorId },
        { environmentId: env.id, key: 'theme_config', name: 'Theme Config', description: 'JSON theme flag.', type: 'json', defaultValue: { primaryColor: '#6366f1', radius: 8 }, enabled: true, tags: ['ui'], createdBy: creatorId }
      );
    } else if (env.projectId === novaMobile.id) {
      pendingFlags.push(
        { environmentId: env.id, key: 'mobile_dark_mode', name: 'Mobile Dark Mode', description: 'Force dark mode on mobile app.', type: 'boolean', defaultValue: false, enabled: !isProd, tags: ['ui'], createdBy: creatorId },
        { environmentId: env.id, key: 'biometric_login', name: 'Biometric Authentication', description: 'Allow FaceID/Fingerprint logins.', type: 'boolean', defaultValue: false, enabled: !isProd, tags: ['security'], createdBy: creatorId },
        { environmentId: env.id, key: 'in_app_chat', name: 'In-App Live Chat', description: 'Live support chat in mobile app.', type: 'boolean', defaultValue: false, enabled: false, tags: ['support'], createdBy: creatorId }
      );
    } else if (env.projectId === novaApi.id) {
      pendingFlags.push(
        { environmentId: env.id, key: 'rate_limit_limit', name: 'Rate Limit Limit', description: 'Max requests per minute.', type: 'number', defaultValue: 100, enabled: true, tags: ['performance'], createdBy: creatorId },
        { environmentId: env.id, key: 'enable_redis_cache', name: 'Enable Redis Cache', description: 'Cache responses in Redis.', type: 'boolean', defaultValue: true, enabled: true, tags: ['cache'], createdBy: creatorId },
        { environmentId: env.id, key: 'database_timeout_ms', name: 'Database Timeout (ms)', description: 'Database operation timeout threshold.', type: 'number', defaultValue: 5000, enabled: true, tags: ['ops'], createdBy: creatorId }
      );
    } else if (env.projectId === acmeWeb.id) {
      pendingFlags.push(
        { environmentId: env.id, key: 'acme_new_ui', name: 'Acme New UI Layout', description: 'New dashboard design for Acme Corp.', type: 'boolean', defaultValue: false, enabled: !isProd, tags: ['ui'], createdBy: creatorId },
        { environmentId: env.id, key: 'enable_billing_v2', name: 'Acme Billing V2', description: 'Enable Stripe Billing V2 portal.', type: 'boolean', defaultValue: false, enabled: false, tags: ['billing'], createdBy: creatorId },
        { environmentId: env.id, key: 'acme_search_v2', name: 'Acme Search V2', description: 'AI-powered search interface.', type: 'boolean', defaultValue: false, enabled: !isProd, tags: ['search'], createdBy: creatorId }
      );
    } else if (env.projectId === acmeApi.id) {
      pendingFlags.push(
        { environmentId: env.id, key: 'acme_maintenance_mode', name: 'Acme Maintenance Mode', description: 'Global maintenance mode for Acme API.', type: 'boolean', defaultValue: false, enabled: false, tags: ['ops'], createdBy: creatorId },
        { environmentId: env.id, key: 'acme_api_timeout', name: 'Acme API Timeout (ms)', description: 'API gateway timeout setting.', type: 'number', defaultValue: 3000, enabled: true, tags: ['config'], createdBy: creatorId },
        { environmentId: env.id, key: 'acme_debug_logging', name: 'Acme Debug Logging', description: 'Verbose debug logs in production.', type: 'boolean', defaultValue: false, enabled: false, tags: ['ops'], createdBy: creatorId }
      );
    }
  }

  const createdFlags = await db.insert(flags).values(pendingFlags).returning();
  console.log(`  ✓ Created ${createdFlags.length} feature flags\n`);

  console.log('📋 Creating targeting rules...');
  for (const flag of createdFlags) {
    const env = createdEnvironments.find(e => e.id === flag.environmentId)!;
    const project = allProjects.find(p => p.id === env.projectId)!;
    const isNova = project.orgId === novaPay.id;
    
    generateRulesForFlag(flag.id, flag.key, flag.type, isNova);
  }

  await db.insert(rules).values(rulesData);
  console.log(`  ✓ Created ${rulesData.length} targeting rules\n`);

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================
  console.log('📝 Creating sample audit logs...');

  const getFlag = (envId: string, key: string) => {
    const f = createdFlags.find(f => f.environmentId === envId && f.key === key);
    if (!f) throw new Error(`Flag not found: ${key} in env ${envId}`);
    return f;
  };

  const newAnalyticsWidgetFlag = getFlag(novaWebDev.id, 'new_analytics_widget');
  const betaExportFlag         = getFlag(novaWebDev.id, 'beta_export_feature');

  await db.insert(auditLogs).values([
    { orgId: novaPay.id, actorId: alice.id, action: 'flag.created', resourceType: 'flag', resourceId: newAnalyticsWidgetFlag.id, newValue: { key: 'new_analytics_widget' }, ip: '192.168.1.100' },
    { orgId: novaPay.id, actorId: bob.id, action: 'rule.created', resourceType: 'rule', resourceId: newAnalyticsWidgetFlag.id, newValue: { name: 'Canary Rollout 10%' }, ip: '192.168.1.101' },
    { orgId: novaPay.id, actorId: alice.id, action: 'flag.created', resourceType: 'flag', resourceId: betaExportFlag.id, newValue: { key: 'beta_export_feature' }, ip: '192.168.1.100' },
  ]);

  console.log('  ✓ Created 3 audit log entries\n');

  console.log('━'.repeat(60));
  console.log('✅  Seed complete!\n');
  console.log('🔐  Dashboard Login Credentials (novapay)');
  console.log('   alice@novapay.com  /  password123  →  owner');
  console.log('🔑  Example App SDK Key  →  ps_test_your_api_key_here');
  console.log('    Org:  novapay  |  Project: novapay-web  |  Env: development\n');
  console.log('━'.repeat(60));

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
