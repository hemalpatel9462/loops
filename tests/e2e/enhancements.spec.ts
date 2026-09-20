import { test, expect } from '@playwright/test';
import { openStartScreen } from './helpers';

test.describe('enhanced navigation and global settings', () => {
  test('persists the global gameplay mode and omits removed appearance controls', async ({ page }) => {
    await openStartScreen(page);
    await page.getByRole('button', { name: 'Open settings' }).click();

    let settings = page.getByRole('dialog', { name: 'Settings' });
    await expect(settings).toBeVisible();
    await settings.getByRole('radio', { name: /Assisted/ }).check();
    await expect(settings.getByRole('radio', { name: /Assisted/ })).toBeChecked();
    await expect(settings.getByText(/Dark Mode|High Contrast/i)).toHaveCount(0);
    await expect(page.getByText(/Dark Mode|High Contrast/i)).toHaveCount(0);
    await settings.getByRole('button', { name: 'Close settings' }).click();

    await page.reload();
    await page.getByRole('button', { name: 'Open settings' }).click();
    settings = page.getByRole('dialog', { name: 'Settings' });
    await expect(settings.getByRole('radio', { name: /Assisted/ })).toBeChecked();
    await expect(settings.getByRole('radio', { name: /Relaxed/ })).not.toBeChecked();
  });

  test('opens How to play and reaches its controls with keyboard navigation', async ({ page }) => {
    await openStartScreen(page);
    await page.getByRole('button', { name: /^Start$/ }).click();
    await expect(page.getByRole('heading', { name: /Choose a puzzle/ })).toBeVisible();
    const trigger = page.getByRole('button', { name: 'How to play' });
    await trigger.focus();
    await page.keyboard.press('Enter');

    const tutorial = page.getByRole('dialog');
    await expect(tutorial).toBeVisible();
    await expect(tutorial.getByRole('heading', { name: 'Make one perfect loop' })).toBeVisible();
    await expect(tutorial.getByRole('button', { name: 'Close tutorial' })).toBeFocused();

    await tutorial.getByRole('button', { name: 'Skip tutorial' }).focus();
    await expect(tutorial.getByRole('button', { name: 'Skip tutorial' })).toBeFocused();
    await page.keyboard.press('Tab');
    await tutorial.getByRole('button', { name: 'Next' }).focus();
    await expect(tutorial.getByRole('button', { name: 'Next' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tutorial.getByRole('heading', { name: 'Read the clues' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(tutorial).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('closes How to play through Skip and final completion without starting a puzzle', async ({ page }) => {
    await openStartScreen(page);
    await page.getByRole('button', { name: /^Start$/ }).click();
    await expect(page.getByRole('heading', { name: /Choose a puzzle/ })).toBeVisible();
    const trigger = page.getByRole('button', { name: 'How to play' });

    await trigger.click();
    let tutorial = page.getByRole('dialog');
    await tutorial.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(tutorial).toBeHidden();
    await expect(page.getByRole('heading', { name: /Choose a puzzle/ })).toBeVisible();

    await trigger.click();
    tutorial = page.getByRole('dialog');
    for (let step = 0; step < 5; step += 1) {
      await tutorial.getByRole('button', { name: 'Next' }).click();
    }
    await expect(tutorial.getByRole('button', { name: 'Start puzzle' })).toBeVisible();
    await tutorial.getByRole('button', { name: 'Start puzzle' }).click();
    await expect(tutorial).toBeHidden();
    await expect(page.getByRole('heading', { name: /Choose a puzzle/ })).toBeVisible();
  });
});
