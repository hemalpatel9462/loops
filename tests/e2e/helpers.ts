import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

interface PuzzleFixture {
  readonly solutionEdges: readonly string[];
}

interface CatalogFixture {
  readonly puzzles: readonly {
    readonly difficulty: string;
    readonly path: string;
  }[];
}

const catalog = JSON.parse(
  readFileSync(resolve(process.cwd(), 'packages/puzzle-data/catalog.json'), 'utf8'),
) as CatalogFixture;

export const difficulties = ['beginner', 'easy', 'medium', 'hard', 'expert'] as const;

const firstBeginner = catalog.puzzles.find((entry) => entry.difficulty === 'beginner');
if (!firstBeginner) throw new Error('The catalog must contain a beginner puzzle for E2E coverage.');

/** The first validated beginner puzzle in catalog order. */
export const beginnerPuzzle = JSON.parse(
  readFileSync(resolve(process.cwd(), 'packages/puzzle-data', firstBeginner.path), 'utf8'),
) as PuzzleFixture;

/** Reset browser state once at the start of each scenario, then render Start. */
export async function openStartScreen(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: /Find your next loop/ })).toBeVisible();
}

export async function openPuzzleSelection(page: Page): Promise<void> {
  await openStartScreen(page);
  await page.getByRole('button', { name: /^Start$/ }).click();
  await expect(page.getByRole('heading', { name: /Choose a puzzle/ })).toBeVisible();
}

export async function startSelectedPuzzle(page: Page, puzzleNumber = 1): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^Puzzle ${puzzleNumber}:`) }).click();
  await expect(page.getByRole('region', { name: 'Loops puzzle', exact: true })).toBeVisible();

  // SVG groups have no intrinsic layout box. Wait for the measurable board root
  // and mounted edge controls before interacting with the selected puzzle.
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

  await expect(page.getByRole('button', { name: 'Dismiss puzzle complete message' })).toContainText('Puzzle complete!');
  await expect(page.getByRole('button', { name: 'Next puzzle' })).toBeVisible();
}
