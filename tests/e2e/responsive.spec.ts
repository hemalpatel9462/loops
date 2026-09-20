import { test, expect } from '@playwright/test';
import { openPuzzleSelection, openStartScreen, startSelectedPuzzle } from './helpers';

async function expectNoViewportOverflow(page: import('@playwright/test').Page): Promise<void> {
  const pageSize = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(pageSize.scrollWidth).toBeLessThanOrEqual(pageSize.clientWidth + 1);
  expect(pageSize.scrollHeight).toBeLessThanOrEqual(pageSize.clientHeight + 1);
}

test('renders the revised start and selection screens without viewport overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'reduced-motion', 'Responsive coverage is asserted in phone, tablet, and desktop projects.');
  expect(['phone', 'tablet', 'desktop']).toContain(testInfo.project.name);

  await openStartScreen(page);
  await expectNoViewportOverflow(page);
  await expect(page.getByRole('link', { name: 'Play' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'How to play' })).toHaveCount(0);
  const startScreen = page.getByRole('region', { name: /Find your next loop/ });
  await expect(startScreen).toBeVisible();
  const startBox = await startScreen.boundingBox();
  const viewport = page.viewportSize();
  expect(startBox).not.toBeNull();
  expect(startBox?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);

  await page.getByRole('button', { name: /^Start$/ }).click();
  await expect(page.getByRole('heading', { name: /Choose a puzzle/ })).toBeVisible();
  await expectNoViewportOverflow(page);
  await expect(page.getByRole('button', { name: 'How to play' })).toBeVisible();
  const selectionScreen = page.getByRole('region', { name: /Choose a puzzle/ });
  await expect(selectionScreen).toBeVisible();
  const selectionBox = await selectionScreen.boundingBox();
  expect(selectionBox).not.toBeNull();
  expect(selectionBox?.width ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual((viewport?.width ?? 0) + 1);
});

test('keeps the gameplay board square across responsive viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'reduced-motion', 'Responsive coverage is asserted in phone, tablet, and desktop projects.');
  expect(['phone', 'tablet', 'desktop']).toContain(testInfo.project.name);

  await openPuzzleSelection(page);
  await startSelectedPuzzle(page);
  await expectNoViewportOverflow(page);

  const boardBox = await page.locator('.loop-board').boundingBox();
  expect(boardBox).not.toBeNull();
  expect(Math.abs((boardBox?.width ?? 0) - (boardBox?.height ?? 0))).toBeLessThanOrEqual(1);
});
