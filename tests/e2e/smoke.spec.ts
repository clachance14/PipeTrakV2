import { test, expect } from '@playwright/test';

test.describe('PipeTrak V2 - Smoke Tests', () => {
  test('should load the login page', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that we're on a page (basic smoke test)
    await expect(page).toHaveTitle(/PipeTrak/i);
  });

  test('should have visible login form elements', async ({ page }) => {
    await page.goto('/');

    // Look for common login elements (adjust based on your actual login page)
    // This is just a placeholder - update based on your actual UI
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });
});
