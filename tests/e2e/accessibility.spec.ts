import { test, expect } from '@playwright/test';
import { editableEdgeLocator, openModeSelection, startQuickPlay } from './helpers';

test('supports keyboard activation for an editable edge', async ({ page }) => {
  await openModeSelection(page);
  await startQuickPlay(page);

  const edge = editableEdgeLocator(page).first();
  await edge.focus();
  await expect(edge).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(edge).toHaveAttribute('data-edge-state', 'line');
  await page.keyboard.press('Space');
  await expect(edge).toHaveAttribute('data-edge-state', 'x');
});

test('honors the reduced-motion browser preference', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'reduced-motion', 'Runs in the reduced-motion project only.');
  await openModeSelection(page);
  await startQuickPlay(page);

  const prefersReducedMotion = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  expect(prefersReducedMotion).toBe(true);

  const transitionDurationMilliseconds = await page.locator('.loop-edge__line').first().evaluate((element) => {
    const duration = getComputedStyle(element).transitionDuration;
    if (duration.endsWith('ms')) return Number.parseFloat(duration);
    if (duration.endsWith('s')) return Number.parseFloat(duration) * 1_000;
    return Number.NaN;
  });
  // The checked-in accessibility CSS uses 0.01ms (or zero from `none`);
  // browsers may serialize 0.01ms as 1e-05s, so compare normalized values.
  expect([0, 0.01]).toContain(transitionDurationMilliseconds);
});
