import { Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/');

  // Check if already logged in (look for sidebar navigation which appears on all authenticated pages)
  const sidebar = page.locator('nav, [role="navigation"]').first();
  const isLoggedIn = await sidebar.count() > 0;

  if (isLoggedIn) {
    return;
  }

  // Fill in login form
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  if (await emailInput.isVisible()) {
    await emailInput.fill('clachance14@hotmail.com');
    await passwordInput.fill('One!663579');

    // Click login button
    const loginButton = page.locator('button[type="submit"]').first();
    await loginButton.click();

    // Wait for any authenticated page (dashboard, drawings, etc.)
    // Just wait for the sidebar to appear as proof of authentication
    await page.waitForSelector('nav, [role="navigation"]', { timeout: 10000 });

    // Give the page a moment to fully load
    await page.waitForLoadState('networkidle');
  }
}

export async function selectProject(page: Page): Promise<string> {
  // Navigate to projects page
  await page.goto('/projects');

  // Wait for projects to load
  await page.waitForLoadState('networkidle');

  // Get the first project's ID from the href
  const projectLink = page.locator('a[href*="/projects/"]').first();
  const href = await projectLink.getAttribute('href');

  if (!href) {
    throw new Error('No project link found');
  }

  // Extract project ID from href (e.g., "/projects/uuid/components")
  const match = href.match(/\/projects\/([^/]+)/);
  if (!match) {
    throw new Error('Could not extract project ID from href');
  }

  const projectId = match[1];

  // Set project in localStorage (this is how the app stores selected project)
  await page.evaluate((id) => {
    localStorage.setItem('selectedProjectId', id);
  }, projectId);

  return projectId;
}

/**
 * Wait for drawings page to be fully loaded
 */
export async function waitForDrawingsPage(page: Page) {
  // Wait for the "Showing X of X drawings" text which indicates page is loaded
  await page.waitForSelector('text=/Showing \\d+ of \\d+ drawings/', { timeout: 15000 });

  // Give a moment for any animations/virtualizer to settle
  await page.waitForTimeout(500);
}
