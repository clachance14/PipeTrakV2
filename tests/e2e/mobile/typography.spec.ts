import { test, expect } from '@playwright/test';
import { checkTextReadability, getContrastRatio, measureElement } from '../../support/mobile/measurements';
import { MobileAuditReport } from '../../support/mobile/report-generator';
import { login, selectProject } from '../../support/auth';

test.describe('Mobile Typography', () => {
  const report = new MobileAuditReport();

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await selectProject(page);
  });

  test('drawing numbers are readable', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    const drawingNumberElements = page.locator('[data-testid="drawing-row"] [data-testid="drawing-number"]');
    const count = await drawingNumberElements.count();

    if (count === 0) {
      // Try alternative selector
      const altElements = page.locator('[data-testid="drawing-row"]').first().locator('text=/^[A-Z0-9-]+$/');
      if ((await altElements.count()) > 0) {
        const readability = await checkTextReadability(altElements.first());
        const contrast = await getContrastRatio(altElements.first());

        if (readability.meetsMinimum && contrast.meetsWCAG_AA) {
          report.addFinding('Typography - Drawing Numbers', {
            type: 'pass',
            category: 'Drawing Numbers',
            description: 'Drawing numbers are readable and have adequate contrast',
            measurements: {
              'Font Size': `${readability.fontSize}px`,
              'Line Height': `${readability.lineHeight}px`,
              'Contrast Ratio': `${contrast.ratio.toFixed(2)}:1`,
            },
          });
        } else {
          report.addFinding('Typography - Drawing Numbers', {
            type: 'fail',
            category: 'Drawing Numbers',
            description: 'Drawing numbers may not be readable',
            details: [...readability.issues, !contrast.meetsWCAG_AA ? 'Contrast ratio too low' : ''].filter(Boolean).join(', '),
            measurements: {
              'Font Size': `${readability.fontSize}px`,
              'Line Height': `${readability.lineHeight}px`,
              'Contrast Ratio': `${contrast.ratio.toFixed(2)}:1`,
            },
          });
        }
      } else {
        report.addFinding('Typography - Drawing Numbers', {
          type: 'warning',
          category: 'Drawing Numbers',
          description: 'Could not locate drawing number elements to test',
        });
      }
      return;
    }

    const firstDrawingNumber = drawingNumberElements.first();
    const readability = await checkTextReadability(firstDrawingNumber);
    const contrast = await getContrastRatio(firstDrawingNumber);

    if (readability.meetsMinimum && contrast.meetsWCAG_AA) {
      report.addFinding('Typography - Drawing Numbers', {
        type: 'pass',
        category: 'Drawing Numbers',
        description: 'Drawing numbers are readable with good contrast',
        measurements: {
          'Font Size': `${readability.fontSize}px`,
          'Line Height': `${readability.lineHeight}px`,
          'Contrast Ratio': `${contrast.ratio.toFixed(2)}:1`,
        },
      });
    } else {
      report.addFinding('Typography - Drawing Numbers', {
        type: 'fail',
        category: 'Drawing Numbers',
        description: 'Drawing numbers readability issues',
        details: [...readability.issues, !contrast.meetsWCAG_AA ? `Contrast ${contrast.ratio.toFixed(2)}:1 < 4.5:1` : ''].filter(Boolean).join(', '),
        measurements: {
          'Font Size': `${readability.fontSize}px`,
          'Line Height': `${readability.lineHeight}px`,
          'Contrast Ratio': `${contrast.ratio.toFixed(2)}:1`,
        },
      });
    }
  });

  test('component labels are readable', async ({ page }) => {
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
    if ((await componentRows.count()) === 0) {
      report.addFinding('Typography - Component Labels', {
        type: 'warning',
        category: 'Component Labels',
        description: 'No component rows found to test',
      });
      return;
    }

    // Find component identity or type label
    const componentLabel = componentRows.first().locator('td').first();
    const readability = await checkTextReadability(componentLabel);
    const contrast = await getContrastRatio(componentLabel);

    if (readability.meetsMinimum && contrast.meetsWCAG_AA) {
      report.addFinding('Typography - Component Labels', {
        type: 'pass',
        category: 'Component Labels',
        description: 'Component labels are readable',
        measurements: {
          'Font Size': `${readability.fontSize}px`,
          'Line Height': `${readability.lineHeight}px`,
          'Contrast Ratio': `${contrast.ratio.toFixed(2)}:1`,
        },
      });
    } else {
      report.addFinding('Typography - Component Labels', {
        type: 'warning',
        category: 'Component Labels',
        description: 'Component labels may have readability issues',
        details: [...readability.issues, !contrast.meetsWCAG_AA ? 'Low contrast' : ''].filter(Boolean).join(', '),
        measurements: {
          'Font Size': `${readability.fontSize}px`,
          'Line Height': `${readability.lineHeight}px`,
          'Contrast Ratio': `${contrast.ratio.toFixed(2)}:1`,
        },
      });
    }
  });

  test('form labels meet minimum size', async ({ page }) => {
    await page.goto('/welders');

    const addButton = page.locator('button:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const labels = page.locator('[role="dialog"] label');
      const count = await labels.count();

      if (count === 0) {
        report.addFinding('Typography - Form Labels', {
          type: 'warning',
          category: 'Form Labels',
          description: 'No form labels found to test',
        });
        return;
      }

      const firstLabel = labels.first();
      const readability = await checkTextReadability(firstLabel);

      if (readability.meetsMinimum) {
        report.addFinding('Typography - Form Labels', {
          type: 'pass',
          category: 'Form Labels',
          description: 'Form labels are readable',
          measurements: {
            'Font Size': `${readability.fontSize}px`,
            'Line Height': `${readability.lineHeight}px`,
          },
        });
      } else {
        report.addFinding('Typography - Form Labels', {
          type: 'warning',
          category: 'Form Labels',
          description: 'Form labels may be too small',
          details: readability.issues.join(', '),
          measurements: {
            'Font Size': `${readability.fontSize}px`,
            'Line Height': `${readability.lineHeight}px`,
          },
        });
      }

      // Close dialog
      const closeButton = page.locator('[role="dialog"] button[aria-label*="lose"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      report.addFinding('Typography - Form Labels', {
        type: 'warning',
        category: 'Form Labels',
        description: 'Could not open form to test labels',
      });
    }
  });

  test('input field text is readable (16px minimum for iOS)', async ({ page }) => {
    await page.goto('/welders');

    const addButton = page.locator('button:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);

      const inputs = page.locator('[role="dialog"] input[type="text"], [role="dialog"] input[type="email"]');
      const count = await inputs.count();

      if (count === 0) {
        report.addFinding('Typography - Input Fields', {
          type: 'warning',
          category: 'Input Field Text',
          description: 'No input fields found to test',
        });
        return;
      }

      const firstInput = inputs.first();
      const measurements = await measureElement(firstInput);

      // iOS requires 16px font size to prevent auto-zoom
      const MIN_IOS_FONT_SIZE = 16;

      if (measurements.fontSize >= MIN_IOS_FONT_SIZE) {
        report.addFinding('Typography - Input Fields', {
          type: 'pass',
          category: 'Input Field Text',
          description: 'Input fields meet iOS minimum (prevents auto-zoom)',
          measurements: {
            'Font Size': `${measurements.fontSize}px`,
            'Minimum for iOS': `${MIN_IOS_FONT_SIZE}px`,
          },
        });
      } else {
        report.addFinding('Typography - Input Fields', {
          type: 'fail',
          category: 'Input Field Text',
          description: 'Input font size may trigger iOS auto-zoom',
          details: `Font size ${measurements.fontSize}px is less than ${MIN_IOS_FONT_SIZE}px. iOS will auto-zoom on focus, disrupting UX.`,
          measurements: {
            'Font Size': `${measurements.fontSize}px`,
            'Minimum for iOS': `${MIN_IOS_FONT_SIZE}px`,
          },
        });
      }

      // Close dialog
      const closeButton = page.locator('[role="dialog"] button[aria-label*="lose"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      report.addFinding('Typography - Input Fields', {
        type: 'warning',
        category: 'Input Field Text',
        description: 'Could not open form to test input fields',
      });
    }
  });

  test('dialog headings are appropriately sized', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    const pencilIcon = page.locator('button[aria-label*="Assign"]').first();

    if (await pencilIcon.isVisible()) {
      await pencilIcon.click();
      await page.waitForTimeout(500);

      // Find dialog heading (h2, h3, or [role="heading"])
      const heading = page.locator('[role="dialog"] h2, [role="dialog"] h3, [role="dialog"] [role="heading"]').first();

      if (await heading.isVisible()) {
        const measurements = await measureElement(heading);

        // Dialog headings should be larger than body text (18px+)
        const MIN_HEADING_SIZE = 18;

        if (measurements.fontSize >= MIN_HEADING_SIZE) {
          report.addFinding('Typography - Dialog Headings', {
            type: 'pass',
            category: 'Dialog Headings',
            description: 'Dialog heading is appropriately sized',
            measurements: {
              'Font Size': `${measurements.fontSize}px`,
              'Line Height': `${measurements.lineHeight}px`,
            },
          });
        } else {
          report.addFinding('Typography - Dialog Headings', {
            type: 'warning',
            category: 'Dialog Headings',
            description: 'Dialog heading may be too small',
            details: `Expected >= ${MIN_HEADING_SIZE}px, got ${measurements.fontSize}px`,
            measurements: {
              'Font Size': `${measurements.fontSize}px`,
              'Line Height': `${measurements.lineHeight}px`,
            },
          });
        }
      } else {
        report.addFinding('Typography - Dialog Headings', {
          type: 'warning',
          category: 'Dialog Headings',
          description: 'No dialog heading found to test',
        });
      }

      // Close dialog
      const closeButton = page.locator('[role="dialog"] button[aria-label*="lose"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      report.addFinding('Typography - Dialog Headings', {
        type: 'warning',
        category: 'Dialog Headings',
        description: 'Could not open dialog to test heading',
      });
    }
  });

  test.afterAll(async () => {
    const reportPath = report.save();
    console.log(`Typography report saved to: ${reportPath}`);
  });
});
