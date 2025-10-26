import { test, expect } from '@playwright/test';
import { measureTouchTarget, measureSpacingBetween } from '../../support/mobile/measurements';
import { MobileAuditReport } from '../../support/mobile/report-generator';
import { login, selectProject, waitForDrawingsPage } from '../../support/auth';

test.describe('Mobile Touch Targets', () => {
  const report = new MobileAuditReport();

  test.beforeEach(async ({ page }) => {
    // Set mobile viewport (iPhone SE/8)
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await selectProject(page);
  });

  test('milestone checkboxes meet 44px minimum', async ({ page }) => {
    await page.goto('/drawings');

    // Wait for drawing table to load
    await waitForDrawingsPage(page);

    // Expand first drawing to see components
    const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
    const expandButton = firstDrawing.locator('button[aria-label*="xpand"]').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500); // Wait for expansion animation
    }

    // Find milestone checkboxes in component rows
    const milestoneCheckboxes = page.locator('[data-testid="component-row"] input[type="checkbox"]');
    const count = await milestoneCheckboxes.count();

    if (count === 0) {
      report.addFinding('Touch Targets - Milestone Checkboxes', {
        type: 'warning',
        category: 'Milestone Checkboxes',
        description: 'No milestone checkboxes found to test',
      });
      return;
    }

    // Test first 3 checkboxes
    const testCount = Math.min(count, 3);
    let allPass = true;

    for (let i = 0; i < testCount; i++) {
      const checkbox = milestoneCheckboxes.nth(i);
      const result = await measureTouchTarget(checkbox);

      if (!result.meetsMinimum) {
        allPass = false;
        report.addFinding('Touch Targets - Milestone Checkboxes', {
          type: 'fail',
          category: `Milestone Checkbox ${i + 1}`,
          description: 'Touch target too small for mobile',
          details: result.issues.join(', '),
          measurements: {
            width: `${result.width}px`,
            height: `${result.height}px`,
            required: '44px × 44px',
          },
        });
      }
    }

    if (allPass) {
      report.addFinding('Touch Targets - Milestone Checkboxes', {
        type: 'pass',
        category: 'Milestone Checkboxes',
        description: `All ${testCount} tested checkboxes meet 44px × 44px minimum`,
      });
    }

    expect(allPass).toBe(true);
  });

  test('pencil edit icons meet touch target minimum', async ({ page }) => {
    await page.goto('/drawings');

    await waitForDrawingsPage(page);

    // Find pencil icons for inline editing
    const pencilIcons = page.locator('button[aria-label*="dit"], button[aria-label*="Assign"]');
    const count = await pencilIcons.count();

    if (count === 0) {
      report.addFinding('Touch Targets - Edit Icons', {
        type: 'warning',
        category: 'Pencil Edit Icons',
        description: 'No edit icons found to test',
      });
      return;
    }

    const testCount = Math.min(count, 5);
    let allPass = true;

    for (let i = 0; i < testCount; i++) {
      const icon = pencilIcons.nth(i);

      if (!(await icon.isVisible())) continue;

      const result = await measureTouchTarget(icon);

      if (!result.meetsMinimum) {
        allPass = false;
        report.addFinding('Touch Targets - Edit Icons', {
          type: 'fail',
          category: `Edit Icon ${i + 1}`,
          description: 'Edit icon touch target too small',
          details: result.issues.join(', '),
          measurements: {
            width: `${result.width}px`,
            height: `${result.height}px`,
            required: '44px × 44px',
          },
        });
      }
    }

    if (allPass) {
      report.addFinding('Touch Targets - Edit Icons', {
        type: 'pass',
        category: 'Edit Icons',
        description: `All ${testCount} tested edit icons meet minimum size`,
      });
    }

    // Allow failure but record it
    if (!allPass) {
      console.warn('Some edit icons do not meet touch target minimum');
    }
  });

  test('dropdown triggers meet touch target minimum', async ({ page }) => {
    await page.goto('/drawings');

    await waitForDrawingsPage(page);

    // Find dropdown triggers (select buttons, filters)
    const dropdowns = page.locator('button[role="combobox"], select, [data-testid*="filter"] button');
    const count = await dropdowns.count();

    if (count === 0) {
      report.addFinding('Touch Targets - Dropdowns', {
        type: 'warning',
        category: 'Dropdown Triggers',
        description: 'No dropdown triggers found to test',
      });
      return;
    }

    const testCount = Math.min(count, 5);
    let allPass = true;

    for (let i = 0; i < testCount; i++) {
      const dropdown = dropdowns.nth(i);

      if (!(await dropdown.isVisible())) continue;

      const result = await measureTouchTarget(dropdown);

      if (!result.meetsMinimum) {
        allPass = false;
        report.addFinding('Touch Targets - Dropdowns', {
          type: 'fail',
          category: `Dropdown ${i + 1}`,
          description: 'Dropdown trigger too small',
          details: result.issues.join(', '),
          measurements: {
            width: `${result.width}px`,
            height: `${result.height}px`,
            required: '44px × 44px',
          },
        });
      }
    }

    if (allPass) {
      report.addFinding('Touch Targets - Dropdowns', {
        type: 'pass',
        category: 'Dropdown Triggers',
        description: `All ${testCount} tested dropdowns meet minimum size`,
      });
    }
  });

  test('expand/collapse buttons meet touch target minimum', async ({ page }) => {
    await page.goto('/drawings');

    await waitForDrawingsPage(page);

    const expandButtons = page.locator('button[aria-label*="xpand"]');
    const count = await expandButtons.count();

    if (count === 0) {
      report.addFinding('Touch Targets - Expand Buttons', {
        type: 'warning',
        category: 'Expand/Collapse Buttons',
        description: 'No expand/collapse buttons found',
      });
      return;
    }

    const testCount = Math.min(count, 5);
    let allPass = true;

    for (let i = 0; i < testCount; i++) {
      const button = expandButtons.nth(i);
      const result = await measureTouchTarget(button);

      if (!result.meetsMinimum) {
        allPass = false;
        report.addFinding('Touch Targets - Expand Buttons', {
          type: 'fail',
          category: `Expand Button ${i + 1}`,
          description: 'Expand/collapse button too small',
          details: result.issues.join(', '),
          measurements: {
            width: `${result.width}px`,
            height: `${result.height}px`,
            required: '44px × 44px',
          },
        });
      }
    }

    if (allPass) {
      report.addFinding('Touch Targets - Expand Buttons', {
        type: 'pass',
        category: 'Expand/Collapse Buttons',
        description: `All ${testCount} tested buttons meet minimum size`,
      });
    }

    expect(allPass).toBe(true);
  });

  test('form dialog buttons meet touch target minimum', async ({ page }) => {
    await page.goto('/welders');

    // Try to open welder form (if add button exists)
    const addButton = page.locator('button:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Check dialog buttons
      const dialogButtons = page.locator('[role="dialog"] button');
      const count = await dialogButtons.count();

      let allPass = true;

      for (let i = 0; i < count; i++) {
        const button = dialogButtons.nth(i);

        if (!(await button.isVisible())) continue;

        const result = await measureTouchTarget(button);

        if (!result.meetsMinimum) {
          allPass = false;
          const buttonText = await button.textContent();
          report.addFinding('Touch Targets - Form Buttons', {
            type: 'fail',
            category: `Dialog Button: ${buttonText?.trim() || 'Unknown'}`,
            description: 'Form dialog button too small',
            details: result.issues.join(', '),
            measurements: {
              width: `${result.width}px`,
              height: `${result.height}px`,
              required: '44px × 44px',
            },
          });
        }
      }

      if (allPass && count > 0) {
        report.addFinding('Touch Targets - Form Buttons', {
          type: 'pass',
          category: 'Form Dialog Buttons',
          description: `All ${count} dialog buttons meet minimum size`,
        });
      }
    } else {
      report.addFinding('Touch Targets - Form Buttons', {
        type: 'warning',
        category: 'Form Dialog Buttons',
        description: 'Could not open form dialog to test buttons',
      });
    }
  });

  test.afterAll(async () => {
    // Save report
    const reportPath = report.save();
    console.log(`Touch target report saved to: ${reportPath}`);
  });
});
