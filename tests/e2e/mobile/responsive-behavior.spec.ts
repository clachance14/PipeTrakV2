import { test, expect } from '@playwright/test';
import { MobileAuditReport } from '../../support/mobile/report-generator';
import { login, selectProject, waitForDrawingsPage } from '../../support/auth';

test.describe('Mobile Responsive Behavior', () => {
  const report = new MobileAuditReport();

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page);
    await selectProject(page);
  });

  test('milestone columns adapt to mobile viewport', async ({ page }) => {
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
      report.addFinding('Responsive Behavior - Milestone Columns', {
        type: 'warning',
        category: 'Milestone Columns',
        description: 'No component rows found to test milestone column behavior',
      });
      return;
    }

    // Count visible milestone columns
    const firstComponent = componentRows.first();
    const milestoneColumns = firstComponent.locator('[data-testid*="milestone"], [aria-label*="milestone"]');
    const visibleCount = await milestoneColumns.count();

    // On mobile, we expect fewer columns or a different layout (like carousel/more button)
    // Desktop might show 5-8 milestones, mobile should show 2-3 or use overflow pattern

    const moreButton = firstComponent.locator('button:has-text("More"), button:has-text("...")');
    const hasMoreButton = await moreButton.count() > 0;

    if (visibleCount <= 3 || hasMoreButton) {
      report.addFinding('Responsive Behavior - Milestone Columns', {
        type: 'pass',
        category: 'Milestone Columns',
        description: 'Milestone columns adapt appropriately for mobile',
        details: hasMoreButton
          ? `Shows ${visibleCount} columns with "More" overflow`
          : `Shows ${visibleCount} columns (appropriate for mobile)`,
      });
    } else {
      report.addFinding('Responsive Behavior - Milestone Columns', {
        type: 'warning',
        category: 'Milestone Columns',
        description: 'May show too many milestone columns on mobile',
        details: `Showing ${visibleCount} columns without overflow pattern. Consider hiding some or using a carousel.`,
      });
    }
  });

  test('filters collapse to mobile-friendly UI', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    // Look for filter UI elements
    const filterButtons = page.locator('[data-testid*="filter"] button, button[aria-label*="filter"]');
    const filterDropdowns = page.locator('[data-testid*="filter"] select, select[aria-label*="filter"]');
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');

    const hasFilters = (await filterButtons.count()) > 0 || (await filterDropdowns.count()) > 0;
    const hasSearch = (await searchInput.count()) > 0;

    if (!hasFilters && !hasSearch) {
      report.addFinding('Responsive Behavior - Filters', {
        type: 'warning',
        category: 'Filter UI',
        description: 'No filter UI elements found to test',
      });
      return;
    }

    // Check if filters are in a single row or stacked vertically
    if (hasSearch && (await searchInput.first().isVisible())) {
      const searchBox = await searchInput.first().boundingBox();

      if (searchBox && searchBox.width >= 300) {
        report.addFinding('Responsive Behavior - Filters', {
          type: 'pass',
          category: 'Search Input',
          description: 'Search input is appropriately sized for mobile',
          measurements: {
            'Search Width': `${searchBox.width}px`,
          },
        });
      } else if (searchBox) {
        report.addFinding('Responsive Behavior - Filters', {
          type: 'warning',
          category: 'Search Input',
          description: 'Search input may be too narrow',
          details: `Width ${searchBox.width}px is less than recommended 300px`,
        });
      }
    }

    if (hasFilters) {
      report.addFinding('Responsive Behavior - Filters', {
        type: 'pass',
        category: 'Filter Controls',
        description: 'Filter controls are present and accessible',
      });
    }
  });

  test('dialogs use full screen or near-full screen on mobile', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    const pencilIcon = page.locator('button[aria-label*="Assign"]').first();

    if (await pencilIcon.isVisible()) {
      await pencilIcon.click();
      await page.waitForTimeout(500);

      const dialog = page.locator('[role="dialog"]');
      const dialogBox = await dialog.boundingBox();

      if (!dialogBox) {
        report.addFinding('Responsive Behavior - Dialogs', {
          type: 'warning',
          category: 'Dialog Sizing',
          description: 'Could not measure dialog dimensions',
        });
        return;
      }

      const viewportWidth = 375;
      const viewportHeight = 667;

      // Dialog should use most of the screen on mobile (90%+ width or height)
      const widthRatio = dialogBox.width / viewportWidth;
      const heightRatio = dialogBox.height / viewportHeight;

      const isFullScreen = widthRatio >= 0.9 || heightRatio >= 0.7;

      if (isFullScreen) {
        report.addFinding('Responsive Behavior - Dialogs', {
          type: 'pass',
          category: 'Dialog Sizing',
          description: 'Dialog appropriately sized for mobile (near full-screen)',
          measurements: {
            'Dialog Width': `${dialogBox.width}px`,
            'Dialog Height': `${dialogBox.height}px`,
            'Width Ratio': `${(widthRatio * 100).toFixed(1)}%`,
            'Height Ratio': `${(heightRatio * 100).toFixed(1)}%`,
          },
        });
      } else {
        report.addFinding('Responsive Behavior - Dialogs', {
          type: 'warning',
          category: 'Dialog Sizing',
          description: 'Dialog may not use enough screen space on mobile',
          details: 'Consider making dialogs larger on mobile for better usability',
          measurements: {
            'Dialog Width': `${dialogBox.width}px`,
            'Dialog Height': `${dialogBox.height}px`,
            'Width Ratio': `${(widthRatio * 100).toFixed(1)}%`,
            'Height Ratio': `${(heightRatio * 100).toFixed(1)}%`,
          },
        });
      }

      // Close dialog
      const closeButton = dialog.locator('button[aria-label*="lose"]').first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      report.addFinding('Responsive Behavior - Dialogs', {
        type: 'warning',
        category: 'Dialog Sizing',
        description: 'Could not open dialog to test sizing',
      });
    }
  });

  test('table uses mobile-appropriate layout', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    // Check if table has horizontal scroll
    const table = page.locator('table').first();
    const hasHorizontalScroll = await table.evaluate((el) => {
      return el.scrollWidth > el.clientWidth;
    });

    if (hasHorizontalScroll) {
      report.addFinding('Responsive Behavior - Table Layout', {
        type: 'warning',
        category: 'Table Scrolling',
        description: 'Table has horizontal scrolling',
        details: 'Consider using card layout or showing fewer columns on mobile',
      });
    } else {
      report.addFinding('Responsive Behavior - Table Layout', {
        type: 'pass',
        category: 'Table Layout',
        description: 'Table fits within viewport without horizontal scroll',
      });
    }
  });

  test('navigation and toolbars are accessible on mobile', async ({ page }) => {
    await page.goto('/drawings');
    await page.waitForLoadState('networkidle');

    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    const hasNav = (await nav.count()) > 0;

    if (hasNav) {
      const navBox = await nav.first().boundingBox();

      if (navBox) {
        // Nav should be full width on mobile
        const viewportWidth = 375;
        const navWidthRatio = navBox.width / viewportWidth;

        if (navWidthRatio >= 0.95) {
          report.addFinding('Responsive Behavior - Navigation', {
            type: 'pass',
            category: 'Navigation Bar',
            description: 'Navigation is full-width on mobile',
            measurements: {
              'Nav Width': `${navBox.width}px`,
              'Width Ratio': `${(navWidthRatio * 100).toFixed(1)}%`,
            },
          });
        } else {
          report.addFinding('Responsive Behavior - Navigation', {
            type: 'warning',
            category: 'Navigation Bar',
            description: 'Navigation may not span full width',
            measurements: {
              'Nav Width': `${navBox.width}px`,
              'Expected': `${viewportWidth}px`,
            },
          });
        }
      }
    } else {
      report.addFinding('Responsive Behavior - Navigation', {
        type: 'warning',
        category: 'Navigation Bar',
        description: 'No navigation element found',
      });
    }
  });

  test('content reflows properly without text truncation issues', async ({ page }) => {
    await page.goto('/drawings');
    await waitForDrawingsPage(page);

    // Check for ellipsis or truncated text in key areas
    const drawingRows = page.locator('[data-testid="drawing-row"]');
    const firstRow = drawingRows.first();

    // Check if text is being truncated with ellipsis
    const hasEllipsis = await firstRow.evaluate((el) => {
      const allElements = el.querySelectorAll('*');
      for (const elem of allElements) {
        const style = window.getComputedStyle(elem);
        if (style.textOverflow === 'ellipsis') {
          // Check if text is actually overflowing
          if (elem.scrollWidth > elem.clientWidth) {
            return true;
          }
        }
      }
      return false;
    });

    if (!hasEllipsis) {
      report.addFinding('Responsive Behavior - Text Reflow', {
        type: 'pass',
        category: 'Text Truncation',
        description: 'No problematic text truncation detected',
      });
    } else {
      report.addFinding('Responsive Behavior - Text Reflow', {
        type: 'warning',
        category: 'Text Truncation',
        description: 'Some text is being truncated with ellipsis',
        details: 'Verify that truncated text is intentional and not critical information',
      });
    }
  });

  test.afterAll(async () => {
    const reportPath = report.save();
    console.log(`Responsive behavior report saved to: ${reportPath}`);
  });
});
