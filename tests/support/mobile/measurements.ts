import { Locator, Page } from '@playwright/test';

export interface ElementMeasurements {
  width: number;
  height: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  fontSize: number;
  lineHeight: number;
  x: number;
  y: number;
}

/**
 * Measures an element's dimensions, spacing, and typography
 */
export async function measureElement(locator: Locator): Promise<ElementMeasurements> {
  const box = await locator.boundingBox();

  if (!box) {
    throw new Error('Element not found or not visible');
  }

  const styles = await locator.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      paddingTop: parseFloat(computed.paddingTop),
      paddingRight: parseFloat(computed.paddingRight),
      paddingBottom: parseFloat(computed.paddingBottom),
      paddingLeft: parseFloat(computed.paddingLeft),
      marginTop: parseFloat(computed.marginTop),
      marginRight: parseFloat(computed.marginRight),
      marginBottom: parseFloat(computed.marginBottom),
      marginLeft: parseFloat(computed.marginLeft),
      fontSize: parseFloat(computed.fontSize),
      lineHeight: parseFloat(computed.lineHeight),
    };
  });

  return {
    width: box.width,
    height: box.height,
    x: box.x,
    y: box.y,
    ...styles,
  };
}

/**
 * Checks if element meets minimum touch target size (44x44px WCAG 2.1)
 */
export async function measureTouchTarget(locator: Locator): Promise<{
  width: number;
  height: number;
  meetsMinimum: boolean;
  issues: string[];
}> {
  const MIN_SIZE = 44;
  const measurements = await measureElement(locator);
  const issues: string[] = [];

  if (measurements.width < MIN_SIZE) {
    issues.push(`Width ${measurements.width}px is less than ${MIN_SIZE}px minimum`);
  }

  if (measurements.height < MIN_SIZE) {
    issues.push(`Height ${measurements.height}px is less than ${MIN_SIZE}px minimum`);
  }

  return {
    width: measurements.width,
    height: measurements.height,
    meetsMinimum: issues.length === 0,
    issues,
  };
}

/**
 * Measures spacing between two elements
 */
export async function measureSpacingBetween(
  locator1: Locator,
  locator2: Locator
): Promise<{ horizontal: number; vertical: number }> {
  const box1 = await locator1.boundingBox();
  const box2 = await locator2.boundingBox();

  if (!box1 || !box2) {
    throw new Error('One or both elements not found');
  }

  // Calculate horizontal spacing (gap between right edge of 1 and left edge of 2)
  const horizontal = Math.abs(box2.x - (box1.x + box1.width));

  // Calculate vertical spacing (gap between bottom edge of 1 and top edge of 2)
  const vertical = Math.abs(box2.y - (box1.y + box1.height));

  return { horizontal, vertical };
}

/**
 * Verifies no horizontal scrolling on mobile
 */
export async function verifyNoHorizontalScroll(page: Page): Promise<{
  hasHorizontalScroll: boolean;
  viewportWidth: number;
  contentWidth: number;
}> {
  const { viewportWidth, contentWidth } = await page.evaluate(() => {
    return {
      viewportWidth: window.innerWidth,
      contentWidth: document.documentElement.scrollWidth,
    };
  });

  return {
    hasHorizontalScroll: contentWidth > viewportWidth,
    viewportWidth,
    contentWidth,
  };
}

/**
 * Checks if element's text is readable (font size, line height)
 */
export async function checkTextReadability(locator: Locator): Promise<{
  fontSize: number;
  lineHeight: number;
  meetsMinimum: boolean;
  issues: string[];
}> {
  const MIN_FONT_SIZE = 14; // Minimum readable font size
  const MIN_LINE_HEIGHT_RATIO = 1.4; // Minimum line height ratio for readability

  const measurements = await measureElement(locator);
  const issues: string[] = [];

  if (measurements.fontSize < MIN_FONT_SIZE) {
    issues.push(`Font size ${measurements.fontSize}px is less than ${MIN_FONT_SIZE}px minimum`);
  }

  const lineHeightRatio = measurements.lineHeight / measurements.fontSize;
  if (lineHeightRatio < MIN_LINE_HEIGHT_RATIO) {
    issues.push(
      `Line height ratio ${lineHeightRatio.toFixed(2)} is less than ${MIN_LINE_HEIGHT_RATIO} minimum`
    );
  }

  return {
    fontSize: measurements.fontSize,
    lineHeight: measurements.lineHeight,
    meetsMinimum: issues.length === 0,
    issues,
  };
}

/**
 * Gets color contrast ratio between text and background
 */
export async function getContrastRatio(locator: Locator): Promise<{
  ratio: number;
  meetsWCAG_AA: boolean;
  textColor: string;
  backgroundColor: string;
}> {
  const colors = await locator.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      textColor: computed.color,
      backgroundColor: computed.backgroundColor,
    };
  });

  // Helper function to convert rgb/rgba to relative luminance
  const getLuminance = (rgb: string): number => {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return 0;

    const [r, g, b] = [
      parseInt(match[1]) / 255,
      parseInt(match[2]) / 255,
      parseInt(match[3]) / 255,
    ];

    const [rL, gL, bL] = [r, g, b].map((c) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
  };

  const textLuminance = getLuminance(colors.textColor);
  const bgLuminance = getLuminance(colors.backgroundColor);

  const lighter = Math.max(textLuminance, bgLuminance);
  const darker = Math.min(textLuminance, bgLuminance);

  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio,
    meetsWCAG_AA: ratio >= 4.5, // WCAG AA requires 4.5:1 for normal text
    textColor: colors.textColor,
    backgroundColor: colors.backgroundColor,
  };
}
