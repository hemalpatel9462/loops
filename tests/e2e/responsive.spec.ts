import { test, expect } from '@playwright/test';
import { openModeSelection, startQuickPlay } from './helpers';

test('renders the gameplay board within phone, tablet, and desktop viewports', async ({ page }, testInfo) => {
  await openModeSelection(page);
  await startQuickPlay(page);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(['phone', 'tablet', 'desktop', 'reduced-motion']).toContain(testInfo.project.name);

  const board = page.locator('.loop-board');
  const boardBox = await board.boundingBox();
  expect(boardBox).not.toBeNull();
  expect(boardBox?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);

  const pageWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth + 1);
});
