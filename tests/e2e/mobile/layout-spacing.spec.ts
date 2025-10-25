import { test, expect } from '@playwright/test';
import { measureElement, verifyNoHorizontalScroll } from '../../support/mobile/measurements';
import { MobileAuditReport } from '../../support/mobile/report-generator';
import { login, selectProject, waitForDrawingsPage } from '../../support/auth';

test.describe('Mobile Layout & Spacing', () => {
  const report = new MobileAuditReport();

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await selectProject(page);
  });

  test('drawing table has no horizontal scroll', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    const scrollCheck = await verifyNoHorizontalScroll(page);

    if (scrollCheck.hasHorizontalScroll) {
      report.addFinding('Layout & Spacing - Horizontal Scroll', {
        type: 'fail',
        category: 'Drawing Table Horizontal Scroll',
        description: 'Drawing table has horizontal scrolling on mobile',
        details: `Content width (${scrollCheck.contentWidth}px) exceeds viewport (${scrollCheck.viewportWidth}px)`,
        measurements: {
          'Viewport Width': `${scrollCheck.viewportWidth}px`,
          'Content Width': `${scrollCheck.contentWidth}px`,
          'Overflow': `${scrollCheck.contentWidth - scrollCheck.viewportWidth}px`,
        },
      });
    } else {
      report.addFinding('Layout & Spacing - Horizontal Scroll', {
        type: 'pass',
        category: 'Drawing Table Horizontal Scroll',
        description: 'No horizontal scrolling detected',
        measurements: {
          'Viewport Width': `${scrollCheck.viewportWidth}px`,
          'Content Width': `${scrollCheck.contentWidth}px`,
        },
      });
    }

    expect(scrollCheck.hasHorizontalScroll).toBe(false);
  });

  test('drawing rows have consistent padding', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    const rows = page.locator('[data-testid="drawing-row"]');
    const count = await rows.count();

    if (count === 0) {
      report.addFinding('Layout & Spacing - Drawing Row Padding', {
        type: 'warning',
        category: 'Drawing Row Padding',
        description: 'No drawing rows found to test',
      });
      return;
    }

    const testCount = Math.min(count, 3);
    const paddings: number[] = [];

    for (let i = 0; i < testCount; i++) {
      const row = rows.nth(i);
      const measurements = await measureElement(row);
      paddings.push(measurements.paddingLeft);
    }

    // Check if all paddings are the same
    const allSame = paddings.every((p) => p === paddings[0]);

    if (allSame) {
      report.addFinding('Layout & Spacing - Drawing Row Padding', {
        type: 'pass',
        category: 'Drawing Row Padding',
        description: `Consistent padding across ${testCount} rows`,
        measurements: {
          'Padding Left': `${paddings[0]}px`,
        },
      });
    } else {
      report.addFinding('Layout & Spacing - Drawing Row Padding', {
        type: 'warning',
        category: 'Drawing Row Padding',
        description: 'Inconsistent padding detected',
        details: `Padding values: ${paddings.join('px, ')}px`,
      });
    }
  });

  test('component rows have proper indentation', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    // Expand first drawing
    const firstDrawing = page.locator('[data-testid="drawing-row"]').first();
    const expandButton = firstDrawing.locator('button[aria-label*="xpand"]').first();

    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(500);
    }

    const componentRows = page.locator('[data-testid="component-row"]');
    const count = await componentRows.count();

    if (count === 0) {
      report.addFinding('Layout & Spacing - Component Indentation', {
        type: 'warning',
        category: 'Component Row Indentation',
        description: 'No component rows found to test',
      });
      return;
    }

    // Measure indentation of component vs drawing
    const drawingMeasurements = await measureElement(firstDrawing);
    const componentMeasurements = await measureElement(componentRows.first());

    const indentation = componentMeasurements.paddingLeft - drawingMeasurements.paddingLeft;

    // Components should be indented more than drawings
    if (indentation >= 16) {
      report.addFinding('Layout & Spacing - Component Indentation', {
        type: 'pass',
        category: 'Component Row Indentation',
        description: 'Component rows properly indented',
        measurements: {
          'Drawing Padding': `${drawingMeasurements.paddingLeft}px`,
          'Component Padding': `${componentMeasurements.paddingLeft}px`,
          'Indentation': `${indentation}px`,
        },
      });
    } else {
      report.addFinding('Layout & Spacing - Component Indentation', {
        type: 'warning',
        category: 'Component Row Indentation',
        description: 'Component indentation may be insufficient',
        details: `Expected >= 16px, got ${indentation}px`,
        measurements: {
          'Drawing Padding': `${drawingMeasurements.paddingLeft}px`,
          'Component Padding': `${componentMeasurements.paddingLeft}px`,
          'Indentation': `${indentation}px`,
        },
      });
    }
  });

  test('dialog padding is appropriate for mobile', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    // Try to open a dialog (metadata assignment)
    const pencilIcon = page.locator('button[aria-label*="Assign"]').first();

    if (await pencilIcon.isVisible()) {
      await pencilIcon.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const dialogMeasurements = await measureElement(dialog);

      // Dialog should have minimum 16px padding on mobile
      const minPadding = 16;
      const paddingOK =
        dialogMeasurements.paddingLeft >= minPadding &&
        dialogMeasurements.paddingRight >= minPadding;

      if (paddingOK) {
        report.addFinding('Layout & Spacing - Dialog Padding', {
          type: 'pass',
          category: 'Dialog Padding',
          description: 'Dialog has appropriate padding for mobile',
          measurements: {
            'Padding Left': `${dialogMeasurements.paddingLeft}px`,
            'Padding Right': `${dialogMeasurements.paddingRight}px`,
            'Padding Top': `${dialogMeasurements.paddingTop}px`,
            'Padding Bottom': `${dialogMeasurements.paddingBottom}px`,
          },
        });
      } else {
        report.addFinding('Layout & Spacing - Dialog Padding', {
          type: 'warning',
          category: 'Dialog Padding',
          description: 'Dialog padding may be insufficient',
          details: `Expected >= ${minPadding}px on each side`,
          measurements: {
            'Padding Left': `${dialogMeasurements.paddingLeft}px`,
            'Padding Right': `${dialogMeasurements.paddingRight}px`,
          },
        });
      }

      // Close dialog
      const closeButton = dialog.locator('button[aria-label*="lose"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      report.addFinding('Layout & Spacing - Dialog Padding', {
        type: 'warning',
        category: 'Dialog Padding',
        description: 'Could not open dialog to test padding',
      });
    }
  });

  test('form field margins provide adequate spacing', async ({ page }) => {
    await page.goto('/welders');

    const addButton = page.locator('button:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      // Find form fields
      const formFields = page.locator('[role="dialog"] input, [role="dialog"] select');
      const count = await formFields.count();

      if (count >= 2) {
        // Measure spacing between first two fields
        const field1 = formFields.nth(0);
        const field2 = formFields.nth(1);

        const field1Measurements = await measureElement(field1);
        const field2Measurements = await measureElement(field2);

        const verticalSpacing = field2Measurements.y - (field1Measurements.y + field1Measurements.height);

        // Minimum 12px spacing between form fields recommended
        const minSpacing = 12;

        if (verticalSpacing >= minSpacing) {
          report.addFinding('Layout & Spacing - Form Field Margins', {
            type: 'pass',
            category: 'Form Field Spacing',
            description: 'Adequate spacing between form fields',
            measurements: {
              'Vertical Spacing': `${verticalSpacing.toFixed(1)}px`,
              'Minimum': `${minSpacing}px`,
            },
          });
        } else {
          report.addFinding('Layout & Spacing - Form Field Margins', {
            type: 'warning',
            category: 'Form Field Spacing',
            description: 'Form fields may be too close together',
            details: `Expected >= ${minSpacing}px, got ${verticalSpacing.toFixed(1)}px`,
            measurements: {
              'Vertical Spacing': `${verticalSpacing.toFixed(1)}px`,
              'Minimum': `${minSpacing}px`,
            },
          });
        }
      } else {
        report.addFinding('Layout & Spacing - Form Field Margins', {
          type: 'warning',
          category: 'Form Field Spacing',
          description: 'Not enough form fields found to test spacing',
        });
      }

      // Close dialog
      const closeButton = page.locator('[role="dialog"] button[aria-label*="lose"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      report.addFinding('Layout & Spacing - Form Field Margins', {
        type: 'warning',
        category: 'Form Field Spacing',
        description: 'Could not open form to test field spacing',
      });
    }
  });

  test.afterAll(async () => {
    const reportPath = report.save();
    console.log(`Layout & spacing report saved to: ${reportPath}`);
  });
});
