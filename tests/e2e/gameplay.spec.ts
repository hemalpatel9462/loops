import { test, expect } from '@playwright/test';
import {
  completeBeginnerPuzzle,
  difficulties,
  edgeLocator,
  editableEdgeLocator,
  openPuzzleSelection,
  openStartScreen,
  startSelectedPuzzle,
} from './helpers';

test.describe('Loops gameplay and persistence', () => {
  test('starts a selected puzzle and cycles an edge through line, X, and empty', async ({ page }) => {
    await openPuzzleSelection(page);
    await startSelectedPuzzle(page);
    await expect(page.locator('.game-play__meta')).toHaveText('beginner · relaxed · 1/25');
    await expect(page.getByRole('timer')).toContainText(/\d{2}:\d{2}/);

    const edge = editableEdgeLocator(page).first();
    await expect(edge).toHaveAttribute('data-edge-state', 'unknown');
    await edge.click({ force: true });
    await expect(edge).toHaveAttribute('data-edge-state', 'line');
    await edge.click({ force: true });
    await expect(edge).toHaveAttribute('data-edge-state', 'x');
    await edge.click({ force: true });
    await expect(edge).toHaveAttribute('data-edge-state', 'unknown');
  });

  test('returns to puzzle selection from gameplay', async ({ page }) => {
    await openPuzzleSelection(page);
    await startSelectedPuzzle(page);

    await page.getByRole('button', { name: 'Back to modes' }).click();
    await expect(page.getByRole('heading', { name: /Choose a puzzle/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to start' })).toBeVisible();
  });

  test('supports undo, redo, reset, and hints', async ({ page }) => {
    await openPuzzleSelection(page);
    await startSelectedPuzzle(page);

    const edge = editableEdgeLocator(page).first();
    const edgeId = await edge.getAttribute('data-edge-id');
    expect(edgeId).toBeTruthy();
    await edge.click({ force: true });
    await expect(edge).toHaveAttribute('data-edge-state', 'line');

    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(edge).toHaveAttribute('data-edge-state', 'unknown');
    await page.getByRole('button', { name: 'Redo' }).click();
    await expect(edge).toHaveAttribute('data-edge-state', 'line');

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(edge).toHaveAttribute('data-edge-state', 'unknown');

    await page.getByRole('button', { name: 'Hint' }).click();
    const hintedEdge = page.locator('[data-hint-state="line"]');
    await expect(hintedEdge).toHaveCount(1);
    const hintedEdgeId = await hintedEdge.getAttribute('data-edge-id');
    expect(hintedEdgeId).toBeTruthy();
    await hintedEdge.click({ force: true });
    const confirmedEdge = page.locator(`[data-edge-id="${hintedEdgeId}"]`);
    await expect(confirmedEdge).toHaveAttribute('data-edge-state', 'line');
    await expect(confirmedEdge).not.toHaveAttribute('data-hint-state', 'line');
    await expect(page.getByRole('button', { name: 'Apply engine suggestion' })).toHaveCount(0);

  });

  test('shows one-based counts, locks puzzle 2, and unlocks it after puzzle 1 completes', async ({ page }) => {
    await openPuzzleSelection(page);

    for (const difficulty of difficulties) {
      await expect(page.getByRole('button', { name: `${difficulty[0].toUpperCase()}${difficulty.slice(1)}` })).toBeVisible();
    }
    await expect(page.locator('.puzzle-list > .puzzle-list__item')).toHaveCount(25);

    const puzzleOne = page.getByRole('button', { name: /^Puzzle 1: Available$/ });
    const puzzleTwo = page.getByRole('button', { name: /^Puzzle 2: Locked/ });
    await expect(puzzleOne).toBeEnabled();
    await expect(puzzleTwo).toBeDisabled();
    await expect(page.getByRole('button', { name: /^Puzzle 0/ })).toHaveCount(0);
    await expect(page.getByText(/Play at your pace|validated locally and works offline/i)).toHaveCount(0);
    await expect(page.getByText(/Quick Play/i)).toHaveCount(0);
    await expect(page.getByText(/Relaxed|Assisted/)).toHaveCount(0);

    await startSelectedPuzzle(page);
    await completeBeginnerPuzzle(page);
    const completionMessage = page.getByRole('button', { name: 'Dismiss puzzle complete message' });
    await completionMessage.click();
    await expect(completionMessage).toHaveCount(0);
    await page.getByRole('button', { name: 'Next puzzle' }).click();
    await expect(page.getByText('beginner · relaxed · 2/25', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to modes' }).click();
    await expect(page.getByRole('heading', { name: /Choose a puzzle/ })).toBeVisible();

    const completedPuzzle = page.getByRole('button', { name: /^Puzzle 1: Completed$/ });
    await expect(completedPuzzle).toBeVisible();
    await expect(completedPuzzle.locator('xpath=ancestor::li[1]')).toHaveClass(/puzzle-list__item--completed/);
    await expect(completedPuzzle).toHaveAttribute('aria-label', 'Puzzle 1: Completed');
    await expect(page.getByRole('button', { name: /^Puzzle 2:/ })).toBeEnabled();

    await completedPuzzle.click();
    await expect(page.getByRole('region', { name: 'Loops puzzle', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next puzzle' })).toBeVisible();
    await expect.poll(async () => page.locator('[data-edge-state="line"]').count()).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.getByRole('button', { name: 'Next puzzle' })).toHaveCount(0);
    await expect(page.locator('[data-edge-id][data-fixed="false"][data-edge-state="line"]')).toHaveCount(0);
  });

  test('does not expose Continue on the start screen after an unfinished puzzle', async ({ page }) => {
    await openPuzzleSelection(page);
    await startSelectedPuzzle(page);

    const edge = editableEdgeLocator(page).first();
    const edgeId = await edge.getAttribute('data-edge-id');
    expect(edgeId).toBeTruthy();
    await edge.click({ force: true });
    await expect(edge).toHaveAttribute('data-edge-state', 'line');

    await page.reload();
    await expect(page.getByRole('heading', { name: /Find your next loop/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toHaveCount(0);
  });

  test('opens and starts the manually curated Daily Loop while Quick Play is absent', async ({ page }) => {
    await openStartScreen(page);
    await expect(page.getByText(/Quick Play/i)).toHaveCount(0);
    await page.getByRole('button', { name: 'Daily Loop' }).click();
    await expect(page.getByRole('heading', { name: /A fresh loop for today/ })).toBeVisible();
    await expect(page.getByText(/Daily Loop · \d{4}-\d{2}-\d{2}/)).toBeVisible();

    await page.getByRole('button', { name: /Start today.?s loop/ }).click();
    await expect(page.getByRole('region', { name: 'Loops puzzle', exact: true })).toBeVisible();
    await expect(page.locator('.loop-board__svg')).toBeVisible();
  });

  test('applies the saved gameplay mode to a new puzzle', async ({ page }) => {
    await openStartScreen(page);
    await page.getByRole('button', { name: 'Open settings' }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('radio', { name: 'Assisted' }).check();
    await settings.getByRole('button', { name: 'Close settings' }).click();

    await page.getByRole('button', { name: /^Start$/ }).click();
    await startSelectedPuzzle(page);
    await expect(page.getByText('beginner · assisted · 1/25', { exact: true })).toBeVisible();

    const edge = editableEdgeLocator(page).first();
    await edge.click({ force: true });
    await expect(page.getByText('beginner · assisted · 1/25', { exact: true })).toBeVisible();
  });
});
