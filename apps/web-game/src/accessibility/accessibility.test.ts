import { describe, expect, it } from 'vitest';
import { applyAccessibilityPreferences } from './preferences.ts';

function fakeRoot() {
  const attributes = new Map<string, string>();
  return {
    attributes,
    setAttribute(name: string, value: string) { attributes.set(name, value); },
    removeAttribute(name: string) { attributes.delete(name); },
  };
}

describe('accessibility preferences', () => {
  it('applies and clears motion and contrast attributes', () => {
    const root = fakeRoot();
    applyAccessibilityPreferences({ reducedMotion: true, highContrast: true }, root);
    expect(root.attributes.get('data-reduced-motion')).toBe('true');
    expect(root.attributes.get('data-high-contrast')).toBe('true');

    applyAccessibilityPreferences({ reducedMotion: false, highContrast: false }, root);
    expect(root.attributes.size).toBe(0);
  });
});
