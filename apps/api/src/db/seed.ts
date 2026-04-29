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

/**
 * Comprehensive seed file for testing and exploration
 * 
 * Creates:
 * - 5 users with different roles
 * - 2 organizations (Acme Corp, TechStart)
 * - 3 projects per org
 * - 3 environments per project (production, staging, development)
 * - API keys for each environment
 * - 10+ flags with various types and configurations
 * - 20+ rules with complex conditions
 * - 5+ reusable segments
 * - Sample audit log entries
 */

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================================
  // USERS
  // ============================================================================
  console.log('👤 Creating users...');
  
  const [alice, bob, charlie, diana, eve] = await db
    .insert(users)
    .values([
      {
        email: 'alice@acme.com',
        name: 'Alice Anderson',
        passwordHash: await hashPassword('password123'),
      },
      {
        email: 'bob@acme.com',
        name: 'Bob Builder',
        passwordHash: await hashPassword('password123'),
      },
      {
        email: 'charlie@techstart.io',
        name: 'Charlie Chen',
        passwordHash: await hashPassword('password123'),
      },
      {
        email: 'diana@techstart.io',
        name: 'Diana Davis',
        passwordHash: await hashPassword('password123'),
      },
      {
        email: 'eve@external.com',
        name: 'Eve External',
        passwordHash: await hashPassword('password123'),
      },
    ])
    .returning();

  if (!alice || !bob || !charlie || !diana || !eve) {
    throw new Error('Failed to create users');
  }

  console.log(`  ✓ Created ${5} users\n`);

  // ============================================================================
  // ORGANIZATIONS
  // ============================================================================
  console.log('🏢 Creating organizations...');

  const [acmeCorp, techStart] = await db
    .insert(organizations)
    .values([
      {
        slug: 'acme-corp',
        name: 'Acme Corporation',
        plan: 'enterprise',
      },
      {
        slug: 'techstart',
        name: 'TechStart Inc',
        plan: 'pro',
      },
    ])
    .returning();

  if (!acmeCorp || !techStart) {
    throw new Error('Failed to create organizations');
  }

  console.log(`  ✓ Created ${2} organizations\n`);

  // ============================================================================
  // ORG MEMBERS
  // ============================================================================
  console.log('👥 Adding organization members...');

  await db.insert(orgMembers).values([
    // Acme Corp
    { orgId: acmeCorp.id, userId: alice.id, role: 'owner' },
    { orgId: acmeCorp.id, userId: bob.id, role: 'admin', invitedBy: alice.id },
    { orgId: acmeCorp.id, userId: eve.id, role: 'viewer', invitedBy: alice.id },
    
    // TechStart
    { orgId: techStart.id, userId: charlie.id, role: 'owner' },
    { orgId: techStart.id, userId: diana.id, role: 'admin', invitedBy: charlie.id },
  ]);

  console.log(`  ✓ Added ${5} organization memberships\n`);

  // ============================================================================
  // PROJECTS
  // ============================================================================
  console.log('📦 Creating projects...');

  const [acmeWeb, acmeMobile, acmeApi, techWeb, techMobile, techApi] = await db
    .insert(projects)
    .values([
      // Acme Corp projects
      { orgId: acmeCorp.id, slug: 'web-app', name: 'Web Application' },
      { orgId: acmeCorp.id, slug: 'mobile-app', name: 'Mobile App' },
      { orgId: acmeCorp.id, slug: 'api', name: 'Backend API' },
      
      // TechStart projects
      { orgId: techStart.id, slug: 'web-platform', name: 'Web Platform' },
      { orgId: techStart.id, slug: 'mobile-ios', name: 'iOS App' },
      { orgId: techStart.id, slug: 'backend', name: 'Backend Services' },
    ])
    .returning();

  if (!acmeWeb || !acmeMobile || !acmeApi || !techWeb || !techMobile || !techApi) {
    throw new Error('Failed to create projects');
  }

  console.log(`  ✓ Created ${6} projects\n`);

  // ============================================================================
  // PROJECT MEMBERS (project-level overrides)
  // ============================================================================
  console.log('🔐 Adding project-specific permissions...');

  await db.insert(projectMembers).values([
    // Bob has writer access to mobile app (override from admin)
    { projectId: acmeMobile.id, userId: bob.id, role: 'writer' },
    
    // Eve has admin access to API project (override from viewer)
    { projectId: acmeApi.id, userId: eve.id, role: 'admin' },
  ]);

  console.log(`  ✓ Added ${2} project-specific permissions\n`);

  // ============================================================================
  // ENVIRONMENTS
  // ============================================================================
  console.log('🌍 Creating environments...');

  const allProjects = [acmeWeb, acmeMobile, acmeApi, techWeb, techMobile, techApi];
  const environmentsData = [];

  for (const project of allProjects) {
    environmentsData.push(
      { projectId: project.id, name: 'production', color: '#ef4444', isDefault: false },
      { projectId: project.id, name: 'staging', color: '#f59e0b', isDefault: false },
      { projectId: project.id, name: 'development', color: '#10b981', isDefault: true }
    );
  }

  const createdEnvironments = await db.insert(environments).values(environmentsData).returning();

  console.log(`  ✓ Created ${createdEnvironments.length} environments\n`);

  // Get specific environments for seeding
  const acmeWebProd = createdEnvironments.find(e => e.projectId === acmeWeb.id && e.name === 'production')!;
  const acmeWebStaging = createdEnvironments.find(e => e.projectId === acmeWeb.id && e.name === 'staging')!;
  const acmeWebDev = createdEnvironments.find(e => e.projectId === acmeWeb.id && e.name === 'development')!;
  const techWebProd = createdEnvironments.find(e => e.projectId === techWeb.id && e.name === 'production')!;

  // ============================================================================
  // API KEYS
  // ============================================================================
  console.log('🔑 Creating API keys...');

  const apiKeysData = [];
  const rawKeys: Record<string, string> = {};

  for (const env of createdEnvironments) {
    const isProd = env.name === 'production';
    const rawKey = generateApiKey(isProd);
    const keyHash = sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    apiKeysData.push({
      orgId: allProjects.find(p => p.id === env.projectId)!.orgId,
      environmentId: env.id,
      name: `${env.name} Key`,
      keyPrefix,
      keyHash,
      scopes: ['read', 'write'],
      createdBy: alice.id,
    });

    rawKeys[`${env.projectId}-${env.name}`] = rawKey;
  }

  await db.insert(apiKeys).values(apiKeysData);

  console.log(`  ✓ Created ${apiKeysData.length} API keys`);
  console.log(`  📝 Sample keys (save these for testing):`);
  console.log(`     Acme Web Prod: ${rawKeys[`${acmeWeb.id}-production`]}`);
  console.log(`     Acme Web Dev:  ${rawKeys[`${acmeWeb.id}-development`]}\n`);

  // ============================================================================
  // SEGMENTS
  // ============================================================================
  console.log('🎯 Creating segments...');

  const [internalBeta, proUsers, euUsers, mobileUsers, _powerUsers] = await db
    .insert(segments)
    .values([
      {
        orgId: acmeCorp.id,
        name: 'Internal Beta',
        description: 'Internal team members for beta testing',
        conditions: {
          operator: 'OR',
          conditions: [
            { attribute: 'email', op: 'ends_with', value: '@acme.com' },
            { attribute: 'role', op: 'eq', value: 'internal' },
          ],
        },
      },
      {
        orgId: acmeCorp.id,
        name: 'Pro Plan Users',
        description: 'Users on the Pro subscription plan',
        conditions: {
          attribute: 'plan',
          op: 'in',
          value: ['pro', 'enterprise'],
        },
      },
      {
        orgId: acmeCorp.id,
        name: 'EU Users',
        description: 'Users located in European Union',
        conditions: {
          attribute: 'country',
          op: 'in',
          value: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI'],
        },
      },
      {
        orgId: techStart.id,
        name: 'Mobile Users',
        description: 'Users accessing via mobile devices',
        conditions: {
          attribute: 'platform',
          op: 'in',
          value: ['ios', 'android'],
        },
      },
      {
        orgId: techStart.id,
        name: 'Power Users',
        description: 'Highly engaged users',
        conditions: {
          operator: 'AND',
          conditions: [
            { attribute: 'loginCount', op: 'gte', value: 50 },
            { attribute: 'accountAge', op: 'gte', value: 90 },
          ],
        },
      },
    ])
    .returning();

  if (!internalBeta || !proUsers || !euUsers || !mobileUsers) {
    throw new Error('Failed to create segments');
  }

  console.log(`  ✓ Created ${5} segments\n`);

  // ============================================================================
  // FLAGS
  // ============================================================================
  console.log('🚩 Creating feature flags...');

  const flagsData = [
    // Acme Web - Production
    {
      environmentId: acmeWebProd.id,
      key: 'new_dashboard',
      name: 'New Dashboard UI',
      description: 'Redesigned dashboard with improved UX',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      tags: ['ui', 'dashboard'],
      createdBy: alice.id,
    },
    {
      environmentId: acmeWebProd.id,
      key: 'pricing_page_variant',
      name: 'Pricing Page Variant',
      description: 'A/B test for pricing page copy',
      type: 'string',
      defaultValue: 'control',
      enabled: true,
      tags: ['marketing', 'ab-test'],
      createdBy: alice.id,
    },
    {
      environmentId: acmeWebProd.id,
      key: 'api_timeout',
      name: 'API Request Timeout',
      description: 'Timeout in milliseconds for API requests',
      type: 'number',
      defaultValue: 5000,
      enabled: true,
      tags: ['performance', 'config'],
      createdBy: alice.id,
    },
    {
      environmentId: acmeWebProd.id,
      key: 'theme_config',
      name: 'Theme Configuration',
      description: 'Global theme settings',
      type: 'json',
      defaultValue: { primaryColor: '#6366f1', darkMode: false, radius: 8 },
      enabled: true,
      tags: ['ui', 'theme'],
      createdBy: alice.id,
    },
    {
      environmentId: acmeWebProd.id,
      key: 'maintenance_mode',
      name: 'Maintenance Mode',
      description: 'Enable maintenance mode banner',
      type: 'boolean',
      defaultValue: false,
      enabled: false,
      tags: ['system'],
      createdBy: alice.id,
    },

    // Acme Web - Staging
    {
      environmentId: acmeWebStaging.id,
      key: 'new_analytics',
      name: 'New Analytics Dashboard',
      description: 'Next-gen analytics with real-time data',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      tags: ['analytics', 'beta'],
      createdBy: alice.id,
    },
    {
      environmentId: acmeWebStaging.id,
      key: 'export_feature',
      name: 'Data Export Feature',
      description: 'Allow users to export their data',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      tags: ['feature', 'data'],
      createdBy: alice.id,
    },

    // Acme Web - Development
    {
      environmentId: acmeWebDev.id,
      key: 'debug_mode',
      name: 'Debug Mode',
      description: 'Enable verbose logging and debug tools',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      tags: ['debug', 'dev'],
      createdBy: alice.id,
    },
    {
      environmentId: acmeWebDev.id,
      key: 'feature_x',
      name: 'Experimental Feature X',
      description: 'Experimental feature under development',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      tags: ['experimental'],
      createdBy: bob.id,
    },

    // TechStart Web - Production
    {
      environmentId: techWebProd.id,
      key: 'social_login',
      name: 'Social Login',
      description: 'Enable Google/GitHub OAuth login',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      tags: ['auth', 'feature'],
      createdBy: charlie.id,
    },
    {
      environmentId: techWebProd.id,
      key: 'notification_system',
      name: 'Notification System',
      description: 'In-app notification center',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      tags: ['feature', 'notifications'],
      createdBy: charlie.id,
    },
  ];

  const createdFlags = await db.insert(flags).values(flagsData).returning();

  console.log(`  ✓ Created ${createdFlags.length} feature flags\n`);

  // ============================================================================
  // RULES
  // ============================================================================
  console.log('📋 Creating targeting rules...');

  const newDashboardFlag = createdFlags.find(f => f.key === 'new_dashboard')!;
  const pricingVariantFlag = createdFlags.find(f => f.key === 'pricing_page_variant')!;
  const apiTimeoutFlag = createdFlags.find(f => f.key === 'api_timeout')!;
  const newAnalyticsFlag = createdFlags.find(f => f.key === 'new_analytics')!;
  const exportFeatureFlag = createdFlags.find(f => f.key === 'export_feature')!;
  const socialLoginFlag = createdFlags.find(f => f.key === 'social_login')!;
  const notificationFlag = createdFlags.find(f => f.key === 'notification_system')!;

  const rulesData = [
    // New Dashboard - Internal Beta (100%)
    {
      flagId: newDashboardFlag.id,
      name: 'Internal Beta Testers',
      priority: 0,
      conditions: { attribute: 'segment', op: 'segment', value: internalBeta.id },
      percentage: 100,
      value: true,
      enabled: true,
    },
    // New Dashboard - Pro Users (50% rollout)
    {
      flagId: newDashboardFlag.id,
      name: 'Pro Users - 50% Rollout',
      priority: 1,
      conditions: { attribute: 'segment', op: 'segment', value: proUsers.id },
      percentage: 50,
      value: true,
      enabled: true,
    },
    // New Dashboard - All Users (10% rollout)
    {
      flagId: newDashboardFlag.id,
      name: 'General Rollout - 10%',
      priority: 2,
      conditions: { attribute: 'userId', op: 'neq', value: null },
      percentage: 10,
      value: true,
      enabled: true,
    },

    // Pricing Variant - EU Users get "variant_eu"
    {
      flagId: pricingVariantFlag.id,
      name: 'EU Pricing Variant',
      priority: 0,
      conditions: { attribute: 'segment', op: 'segment', value: euUsers.id },
      percentage: 100,
      value: 'variant_eu',
      enabled: true,
    },
    // Pricing Variant - 50/50 A/B test for others
    {
      flagId: pricingVariantFlag.id,
      name: 'A/B Test - Variant A',
      priority: 1,
      conditions: { attribute: 'userId', op: 'neq', value: null },
      percentage: 50,
      value: 'variant_a',
      enabled: true,
    },

    // API Timeout - Increase for Pro users
    {
      flagId: apiTimeoutFlag.id,
      name: 'Pro Users - Extended Timeout',
      priority: 0,
      conditions: { attribute: 'segment', op: 'segment', value: proUsers.id },
      percentage: 100,
      value: 10000,
      enabled: true,
    },
    // API Timeout - Reduce for free users
    {
      flagId: apiTimeoutFlag.id,
      name: 'Free Users - Standard Timeout',
      priority: 1,
      conditions: { attribute: 'plan', op: 'eq', value: 'free' },
      percentage: 100,
      value: 3000,
      enabled: true,
    },

    // New Analytics - Internal only
    {
      flagId: newAnalyticsFlag.id,
      name: 'Internal Beta Only',
      priority: 0,
      conditions: { attribute: 'segment', op: 'segment', value: internalBeta.id },
      percentage: 100,
      value: true,
      enabled: true,
    },

    // Export Feature - Pro users only
    {
      flagId: exportFeatureFlag.id,
      name: 'Pro Plan Required',
      priority: 0,
      conditions: { attribute: 'segment', op: 'segment', value: proUsers.id },
      percentage: 100,
      value: true,
      enabled: true,
    },

    // Social Login - Gradual rollout
    {
      flagId: socialLoginFlag.id,
      name: 'Gradual Rollout - 25%',
      priority: 0,
      conditions: { attribute: 'userId', op: 'neq', value: null },
      percentage: 25,
      value: true,
      enabled: true,
    },

    // Notification System - Complex targeting
    {
      flagId: notificationFlag.id,
      name: 'Active Users Only',
      priority: 0,
      conditions: {
        operator: 'AND',
        conditions: [
          { attribute: 'accountAge', op: 'gte', value: 30 },
          { attribute: 'lastLogin', op: 'gte', value: 7 },
        ],
      },
      percentage: 100,
      value: true,
      enabled: true,
    },
  ];

  await db.insert(rules).values(rulesData);

  console.log(`  ✓ Created ${rulesData.length} targeting rules\n`);

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================
  console.log('📝 Creating sample audit logs...');

  const auditLogsData = [
    {
      orgId: acmeCorp.id,
      actorId: alice.id,
      action: 'flag.created',
      resourceType: 'flag',
      resourceId: newDashboardFlag.id,
      newValue: { key: 'new_dashboard', enabled: true },
      ip: '192.168.1.100',
    },
    {
      orgId: acmeCorp.id,
      actorId: alice.id,
      action: 'flag.updated',
      resourceType: 'flag',
      resourceId: newDashboardFlag.id,
      oldValue: { enabled: false },
      newValue: { enabled: true },
      ip: '192.168.1.100',
    },
    {
      orgId: acmeCorp.id,
      actorId: bob.id,
      action: 'rule.created',
      resourceType: 'rule',
      resourceId: newDashboardFlag.id,
      newValue: { name: 'Internal Beta Testers', percentage: 100 },
      ip: '192.168.1.101',
    },
    {
      orgId: acmeCorp.id,
      actorId: alice.id,
      action: 'member.invited',
      resourceType: 'member',
      newValue: { email: 'eve@external.com', role: 'viewer' },
      ip: '192.168.1.100',
    },
    {
      orgId: techStart.id,
      actorId: charlie.id,
      action: 'segment.created',
      resourceType: 'segment',
      resourceId: mobileUsers.id,
      newValue: { name: 'Mobile Users' },
      ip: '10.0.0.50',
    },
  ];

  await db.insert(auditLogs).values(auditLogsData);

  console.log(`  ✓ Created ${auditLogsData.length} audit log entries\n`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • ${5} users created`);
  console.log(`   • ${2} organizations`);
  console.log(`   • ${6} projects`);
  console.log(`   • ${createdEnvironments.length} environments`);
  console.log(`   • ${apiKeysData.length} API keys`);
  console.log(`   • ${5} segments`);
  console.log(`   • ${createdFlags.length} feature flags`);
  console.log(`   • ${rulesData.length} targeting rules`);
  console.log(`   • ${auditLogsData.length} audit log entries\n`);

  console.log('🔐 Test Credentials:');
  console.log('   Email: alice@acme.com');
  console.log('   Password: password123\n');

  console.log('🏢 Organizations:');
  console.log('   • Acme Corporation (acme-corp) - Enterprise plan');
  console.log('   • TechStart Inc (techstart) - Pro plan\n');

  console.log('🎯 Example Scenarios to Test:');
  console.log('   1. Login as alice@acme.com (owner) - full access');
  console.log('   2. Login as bob@acme.com (admin) - admin access');
  console.log('   3. Login as eve@external.com (viewer) - read-only');
  console.log('   4. Use API key to fetch ruleset via SDK');
  console.log('   5. Test flag evaluation with different user contexts');
  console.log('   6. Test optimistic locking by updating same flag twice');
  console.log('   7. View audit logs for all changes\n');

  process.exit(0);
}

// Run seed
seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
