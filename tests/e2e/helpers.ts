import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

interface PuzzleFixture {
  readonly solutionEdges: readonly string[];
}

/** The default Quick Play puzzle is the checked-in beginner fixture. */
export const beginnerPuzzle = JSON.parse(
  readFileSync(
    resolve(process.cwd(), 'packages/puzzle-data/puzzles/beginner/loop-beginner-catalog-beginner-0.json'),
    'utf8',
  ),
) as PuzzleFixture;

export async function openModeSelection(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const resetKey = '__loops_e2e_storage_reset__';
    if (window.sessionStorage.getItem(resetKey) === 'true') return;
    window.localStorage.clear();
    window.sessionStorage.setItem(resetKey, 'true');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Play at your pace/ })).toBeVisible();
}

export async function startQuickPlay(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Quick Play/ }).click();
  await expect(page.getByRole('heading', { name: /Complete the loop/ })).toBeVisible();

  // SVG groups containing individual edges have no intrinsic layout box, so
  // Playwright correctly reports them as hidden even when their child lines
  // are rendered. Wait on the measurable board root instead, then retain a
  // readiness check that the edge groups have been mounted.
  const boardSvg = page.locator('.loop-board__svg');
  await expect(boardSvg).toBeVisible();
  await expect.poll(async () => {
    const box = await boardSvg.boundingBox();
    return Boolean(box && box.width > 0 && box.height > 0);
  }).toBe(true);
  await expect.poll(async () => page.locator('[data-edge-id]').count()).toBeGreaterThan(0);
}

export function edgeLocator(page: Page, edgeId: string) {
  return page.locator(`[data-edge-id="${edgeId}"]`);
}

export function editableEdgeLocator(page: Page) {
  return page.locator('[data-edge-id][data-fixed="false"]');
}

export async function completeBeginnerPuzzle(page: Page): Promise<void> {
  for (const edgeId of beginnerPuzzle.solutionEdges) {
    const edge = edgeLocator(page, edgeId);
    if (await edge.getAttribute('data-fixed') === 'true') continue;
    if (await edge.getAttribute('data-edge-state') !== 'line') {
      await edge.click({ force: true });
    }
    await expect(edge).toHaveAttribute('data-edge-state', 'line');
  }

  await page.getByRole('button', { name: 'Complete loop' }).click();
  await expect(page.getByRole('heading', { name: 'Beautifully done.' })).toBeVisible();
}
