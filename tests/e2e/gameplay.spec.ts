import { test, expect } from '@playwright/test';
import {
  completeBeginnerPuzzle,
  edgeLocator,
  editableEdgeLocator,
  openModeSelection,
  startQuickPlay,
} from './helpers';

test.describe('Loops gameplay and persistence', () => {
  test('loads Quick Play and cycles an edge through line, X, and empty', async ({ page }) => {
    await openModeSelection(page);
    await startQuickPlay(page);

    const edge = editableEdgeLocator(page).first();
    await expect(edge).toHaveAttribute('data-edge-state', 'unknown');
    await edge.click({ force: true });
    await expect(edge).toHaveAttribute('data-edge-state', 'line');
    await edge.click({ force: true });
    await expect(edge).toHaveAttribute('data-edge-state', 'x');
    await edge.click({ force: true });
    await expect(edge).toHaveAttribute('data-edge-state', 'unknown');
  });

  test('supports undo, redo, reset, hints, and progress checks', async ({ page }) => {
    await openModeSelection(page);
    await startQuickPlay(page);

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
    await expect(page.locator('.game-play__feedback')).toContainText(/Edge|Cell|Vertex|highlighted/);

    await page.getByRole('button', { name: 'Check progress' }).click();
    await expect(page.locator('.game-play__feedback')).toContainText(/need attention|not complete|continuous closed loop/);
  });

  test('completes the real beginner puzzle and shows completion feedback', async ({ page }) => {
    await openModeSelection(page);
    await startQuickPlay(page);
    await completeBeginnerPuzzle(page);
    await expect(page.getByText(/You completed the beginner puzzle/)).toBeVisible();
  });

  test('persists an unfinished move and resumes it through Continue', async ({ page }) => {
    await openModeSelection(page);
    await startQuickPlay(page);

    const edge = editableEdgeLocator(page).first();
    const edgeId = await edge.getAttribute('data-edge-id');
    expect(edgeId).toBeTruthy();
    await edge.click({ force: true });
    await expect(edge).toHaveAttribute('data-edge-state', 'line');

    await page.reload();
    await expect(page.getByRole('heading', { name: /Play at your pace/ })).toBeVisible();
    const continueButton = page.getByRole('button', { name: 'Continue' });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await expect(page.getByRole('heading', { name: /Continue your loop/ })).toBeVisible();
    await page.getByRole('button', { name: /Resume puzzle/ }).click();
    await expect(page.getByRole('heading', { name: /Complete the loop/ })).toBeVisible();
    await expect(edgeLocator(page, edgeId as string)).toHaveAttribute('data-edge-state', 'line');
  });

  test('opens and starts the deterministic Daily Loop', async ({ page }) => {
    await openModeSelection(page);
    await page.getByRole('button', { name: 'Daily Loop' }).click();
    await expect(page.getByRole('heading', { name: /A fresh loop for today/ })).toBeVisible();
    await expect(page.getByText(/Daily Loop · \d{4}-\d{2}-\d{2}/)).toBeVisible();

    await page.getByRole('button', { name: /Start today.s loop/ }).click();
    await expect(page.getByRole('heading', { name: /Complete the loop/ })).toBeVisible();
    await expect(page.locator('.loop-board__svg')).toBeVisible();
  });
});
