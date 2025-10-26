import { Page, Locator } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

export interface ScreenshotOptions {
  name: string;
  fullPage?: boolean;
  annotations?: Array<{
    locator: Locator;
    label: string;
    color?: string;
  }>;
}

/**
 * Captures a screenshot with optional annotations
 */
export async function captureAnnotatedScreenshot(
  page: Page,
  options: ScreenshotOptions
): Promise<string> {
  const screenshotDir = path.join(process.cwd(), 'test-results', 'mobile-audit', 'screenshots');

  // Ensure directory exists
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshotPath = path.join(screenshotDir, `${options.name}.png`);

  // Take screenshot
  await page.screenshot({
    path: screenshotPath,
    fullPage: options.fullPage ?? false,
  });

  // TODO: Add annotation logic if needed (would require image manipulation library)
  // For now, just capture the screenshot

  return screenshotPath;
}

/**
 * Captures a component screenshot
 */
export async function captureComponentScreenshot(
  page: Page,
  selector: string,
  name: string
): Promise<string> {
  const element = page.locator(selector).first();
  const screenshotDir = path.join(process.cwd(), 'test-results', 'mobile-audit', 'screenshots');

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshotPath = path.join(screenshotDir, `${name}.png`);

  await element.screenshot({ path: screenshotPath });

  return screenshotPath;
}

/**
 * Creates a screenshot comparison grid (before/after or mobile/desktop)
 */
export async function createComparisonScreenshots(
  page: Page,
  name: string,
  viewports: Array<{ width: number; height: number; label: string }>
): Promise<string[]> {
  const screenshots: string[] = [];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500); // Wait for reflow

    const screenshot = await captureAnnotatedScreenshot(page, {
      name: `${name}-${viewport.label}`,
      fullPage: true,
    });

    screenshots.push(screenshot);
  }

  return screenshots;
}
