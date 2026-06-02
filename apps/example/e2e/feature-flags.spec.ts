import { test, expect } from '@playwright/test';
import { PulseTestClient } from '@pulse-flags/sdk';

const apiUrl = process.env.NEXT_PUBLIC_PULSE_URL || 'http://localhost:4000';

test.describe('NovaPay Feature Flags', () => {
  let pulse: InstanceType<typeof PulseTestClient>;


  test.beforeAll(async () => {
    // We need an access token to use the Pulse management API
    const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@novapay.com',
        password: 'password123',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to login: ${response.status} ${await response.text()}`);
    }

    const { data } = await response.json();

    pulse = new PulseTestClient({
      apiUrl,
      accessToken: data.accessToken,
      orgSlug: 'novapay',
      projectSlug: 'novapay-web',
      envName: 'development',
    });
  });

  test.beforeEach(async () => {
    await pulse.resetAll(); // ensure clean state
  });

  test('shows default hero when new_homepage_hero is disabled', async ({ page }) => {
    await pulse.setDefault('new_homepage_hero', false);
    await page.goto('/');
    
    // Expect the old hero to be active
    const oldHero = page.getByTestId('old-hero');
    await expect(oldHero).toBeVisible();
    await expect(oldHero).toContainText('Taking payments online');

    // Expect the new hero to NOT be visible
    const newHero = page.getByTestId('new-hero');
    await expect(newHero).toHaveCount(0);
  });

  test('shows new hero when new_homepage_hero is enabled', async ({ page }) => {
    await pulse.setDefault('new_homepage_hero', true);
    await pulse.enable('new_homepage_hero');

    await page.goto('/');
    
    // Using Server Sent Events? we might need to wait for connection or reload page.
    // wait for new hero to appear via SSR or rehydration
    const newHero = page.getByTestId('new-hero');
    await expect(newHero).toBeVisible();
    await expect(newHero).toContainText('Welcome to NovaPay 2.0!');
  });

  test('shows customized pricing CTA text', async ({ page }) => {
    await pulse.clearRules('pricing_cta_text');
    await pulse.setDefault('pricing_cta_text', 'Start Free Trial');
    await pulse.enable('pricing_cta_text');

    await page.goto('/pricing');
    
    const cta = page.getByTestId('pricing-cta');
    await expect(cta).toContainText('Start Free Trial');
  });

  test('shows new analytics widget for power users only', async ({ page }) => {
    // 1. Give everyone access to the dashboard context without the widget
    await pulse.setDefault('new_analytics_widget', false);
    
    // 2. Set up targeting rule specifically for power users
    await pulse.clearRules('new_analytics_widget').catch(() => {});
    await pulse.createRule('new_analytics_widget', {
      name: 'Power Users Only',
      conditions: {
        operator: 'AND',
        conditions: [
          {
            op: 'eq',
            attribute: 'userId',
            value: 'power-user-123'
          }
        ]
      },
      percentage: 100,
      value: true,
      enabled: true
    });
    await pulse.enable('new_analytics_widget');
    
    // 3. Log in as a standard user
    await page.goto('/dashboard');
    const userIdInput = page.getByTestId('user-id-input');
    await userIdInput.fill('standard-user');

    // Should NOT see widget
    const widget = page.getByTestId('new-widget');
    await expect(widget).toHaveCount(0);

    // 4. Pretend we are the targeted user
    await userIdInput.fill('power-user-123');
    await expect(widget).toBeVisible();
  });

  test('applies JSON theme configuration dynamically', async ({ page }) => {
    // Reset test pollution from other tests
    await pulse.setDefault('new_homepage_hero', false);

    // Modify the JSON config default
    await pulse.clearRules('theme_config');
    await pulse.setDefault('theme_config', { radius: 24 });
    await pulse.enable('theme_config');

    await page.goto('/');

    const hero = page.getByTestId('old-hero');
    // Ensure the inline style border-radius was applied from the fallback tier
    await expect(hero).toHaveCSS('border-radius', '24px');
  });

  test('shows export feature for beta segment users', async ({ page, request }) => {
    // 1. Create a segment via API directly using request context
    const segmentRes = await request.post(`${apiUrl}/api/v1/orgs/novapay/segments`, {
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pulse.getToken}` 
      },
      data: {
        name: 'Beta Users Test Segment',
        description: 'Users opted into beta',
        conditions: {
          operator: 'AND',
          conditions: [
            { op: 'eq', attribute: 'beta', value: 'true' }
          ]
        }
      }
    });
    const segmentData = await segmentRes.json();
    const segmentId = segmentData.data.id;

    // 2. Set up flag with segment rule
    await pulse.setDefault('beta_export_feature', false);
    await pulse.clearRules('beta_export_feature').catch(() => {});
    await pulse.createRule('beta_export_feature', {
      name: 'Beta Segment Rule',
      conditions: {
        operator: 'AND',
        conditions: [
          { attribute: 'userId', op: 'segment', value: segmentId }
        ]
      },
      percentage: 100,
      value: true,
      enabled: true
    });
    await pulse.enable('beta_export_feature');

    await page.goto('/dashboard');
    const betaCheckbox = page.getByTestId('beta-checkbox');
    const exportBtn = page.getByTestId('export-feature');
    
    // Default user (checkbox unchecked)
    await expect(exportBtn).toHaveCount(0);

    // Beta user
    await betaCheckbox.check();
    await expect(exportBtn).toBeVisible();

    // Clean up segment
    await request.delete(`${apiUrl}/api/v1/orgs/novapay/segments/${segmentId}`, {
      headers: { Authorization: `Bearer ${pulse.getToken}` }
    });
  });

  test('live toggle reflects without page reload via SSE', async ({ page }) => {
    await pulse.setDefault('new_homepage_hero', false);
    await pulse.disable('new_homepage_hero');
    
    await page.goto('/');

    const oldHero = page.getByTestId('old-hero');
    await expect(oldHero).toBeVisible();

    // Wait for EventSource to connect fully before we trigger an update
    await page.waitForTimeout(2000);

    // Toggle the flag on while the page is open
    await pulse.setDefault('new_homepage_hero', true);
    await pulse.enable('new_homepage_hero');

    // Wait for the new hero to appear automatically via SSE
    const newHero = page.getByTestId('new-hero');
    await expect(newHero).toBeVisible({ timeout: 10000 });
  });
});
