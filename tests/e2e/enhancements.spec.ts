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

  test('opens How to play from the start screen and shows the guide GIF', async ({ page }) => {
    await openStartScreen(page);
    const trigger = page.getByRole('button', { name: 'How to play' });
    await trigger.focus();
    await page.keyboard.press('Enter');

    const tutorial = page.getByRole('dialog');
    await expect(tutorial).toBeVisible();
    await expect(tutorial.getByRole('heading', { name: 'How to play' })).toBeVisible();
    await expect(tutorial.getByRole('img', { name: /animated demonstration/i })).toBeVisible();
    await expect(tutorial.getByRole('button', { name: 'Close tutorial' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(tutorial).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('opens Game Rules in the shared information modal', async ({ page }) => {
    await openStartScreen(page);
    const trigger = page.getByRole('button', { name: 'Game Rules' });
    await trigger.click();

    const rules = page.getByRole('dialog');
    await expect(rules).toBeVisible();
    await expect(rules.getByRole('heading', { name: 'Game Rules' })).toBeVisible();
    await expect(rules.getByRole('heading', { name: 'Read the clues' })).toBeVisible();
    await expect(rules.getByRole('heading', { name: 'Keep lines continuous' })).toBeVisible();
    await expect(rules.getByRole('heading', { name: 'Make one loop' })).toBeVisible();
    await rules.getByRole('button', { name: 'Close game rules' }).click();
    await expect(rules).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
