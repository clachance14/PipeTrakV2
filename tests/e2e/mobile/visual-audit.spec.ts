import { test, expect } from '@playwright/test';
import { captureAnnotatedScreenshot, captureComponentScreenshot } from '../../support/mobile/screenshots';
import { MobileAuditReport } from '../../support/mobile/report-generator';
import { login, selectProject, waitForDrawingsPage } from '../../support/auth';

test.describe('Mobile Visual Audit', () => {
  const report = new MobileAuditReport();

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await selectProject(page);
  });

  test('capture drawing table page overview', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    const screenshotPath = await captureAnnotatedScreenshot(page, {
      name: 'drawing-table-overview',
      fullPage: true,
    });

    report.addFinding('Visual Audit - Screenshots', {
      type: 'pass',
      category: 'Drawing Table Overview',
      description: 'Drawing table page captured at 375px mobile viewport',
      screenshot: screenshotPath,
    });
  });

  test('capture drawing table with expanded components', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    // Expand first drawing
    const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
    const expandButton = firstDrawing.locator('button[aria-label*="xpand"]').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      const screenshotPath = await captureAnnotatedScreenshot(page, {
        name: 'drawing-table-expanded',
        fullPage: true,
      });

      report.addFinding('Visual Audit - Screenshots', {
        type: 'pass',
        category: 'Drawing Table (Expanded)',
        description: 'Drawing table with expanded components',
        screenshot: screenshotPath,
      });
    } else {
      report.addFinding('Visual Audit - Screenshots', {
        type: 'warning',
        category: 'Drawing Table (Expanded)',
        description: 'Could not expand drawing to capture screenshot',
      });
    }
  });

  test('capture component row detail', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    // Expand first drawing
    const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
    const expandButton = firstDrawing.locator('button[aria-label*="xpand"]').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      const componentRow = page.locator('[data-testid="component-row"]').first();

      if (await componentRow.isVisible()) {
        const screenshotPath = await captureComponentScreenshot(
          page,
          '[data-testid="component-row"]',
          'component-row-detail'
        );

        report.addFinding('Visual Audit - Screenshots', {
          type: 'pass',
          category: 'Component Row Detail',
          description: 'Close-up of component row showing milestones and metadata',
          screenshot: screenshotPath,
        });
      }
    }
  });

  test('capture metadata assignment dialog', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    const pencilIcon = page.locator('button[aria-label*="Assign"]').first();

    if (await pencilIcon.isVisible()) {
      await pencilIcon.click();
      await page.waitForTimeout(500);

      const screenshotPath = await captureAnnotatedScreenshot(page, {
        name: 'metadata-assignment-dialog',
        fullPage: false,
      });

      report.addFinding('Visual Audit - Screenshots', {
        type: 'pass',
        category: 'Metadata Assignment Dialog',
        description: 'Dialog for assigning areas, systems, and test packages',
        screenshot: screenshotPath,
      });

      // Close dialog
      const closeButton = page.locator('[role="dialog"] button[aria-label*="lose"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      report.addFinding('Visual Audit - Screenshots', {
        type: 'warning',
        category: 'Metadata Assignment Dialog',
        description: 'Could not open metadata dialog to capture screenshot',
      });
    }
  });

  test('capture welder form dialog', async ({ page }) => {
    await page.goto('/welders');
    await page.waitForLoadState('networkidle');

    const addButton = page.locator('button:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const screenshotPath = await captureAnnotatedScreenshot(page, {
        name: 'welder-form-dialog',
        fullPage: false,
      });

      report.addFinding('Visual Audit - Screenshots', {
        type: 'pass',
        category: 'Welder Form Dialog',
        description: 'Form dialog for adding/editing welders',
        screenshot: screenshotPath,
      });

      // Close dialog
      const closeButton = page.locator('[role="dialog"] button[aria-label*="lose"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      report.addFinding('Visual Audit - Screenshots', {
        type: 'warning',
        category: 'Welder Form Dialog',
        description: 'Could not open welder form to capture screenshot',
      });
    }
  });

  test('capture filters and search UI', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    // Look for filter/search area
    const filterArea = page.locator('[data-testid*="filter"], input[type="search"]').first();

    if (await filterArea.isVisible()) {
      const screenshotPath = await captureComponentScreenshot(
        page,
        '[data-testid*="filter"], input[type="search"]',
        'filters-search-ui'
      );

      report.addFinding('Visual Audit - Screenshots', {
        type: 'pass',
        category: 'Filters & Search UI',
        description: 'Filter and search controls on mobile',
        screenshot: screenshotPath,
      });
    } else {
      report.addFinding('Visual Audit - Screenshots', {
        type: 'warning',
        category: 'Filters & Search UI',
        description: 'No filter/search UI found to capture',
      });
    }
  });

  test('capture navigation', async ({ page }) => {
    await page.goto('/drawings');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('nav, [role="navigation"]').first();

    if (await nav.isVisible()) {
      const screenshotPath = await captureComponentScreenshot(
        page,
        'nav, [role="navigation"]',
        'navigation-mobile'
      );

      report.addFinding('Visual Audit - Screenshots', {
        type: 'pass',
        category: 'Navigation',
        description: 'Navigation bar on mobile viewport',
        screenshot: screenshotPath,
      });
    } else {
      report.addFinding('Visual Audit - Screenshots', {
        type: 'warning',
        category: 'Navigation',
        description: 'No navigation found to capture',
      });
    }
  });

  test('capture milestone controls (checkboxes and sliders)', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    // Expand first drawing
    const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
    const expandButton = firstDrawing.locator('button[aria-label*="xpand"]').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);

      // Look for milestone checkbox
      const milestoneCheckbox = page
        .locator('[data-testid="component-row"] input[type="checkbox"]')
        .first();

      if (await milestoneCheckbox.isVisible()) {
        const screenshotPath = await captureComponentScreenshot(
          page,
          '[data-testid="component-row"]',
          'milestone-controls'
        );

        report.addFinding('Visual Audit - Screenshots', {
          type: 'pass',
          category: 'Milestone Controls',
          description: 'Milestone checkboxes and controls in component row',
          screenshot: screenshotPath,
        });
      }
    }
  });

  test.afterAll(async () => {
    const reportPath = report.save();
    console.log(`Visual audit report saved to: ${reportPath}`);
  });
});
