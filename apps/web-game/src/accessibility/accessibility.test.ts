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
  it('applies and clears the reduced-motion attribute', () => {
    const root = fakeRoot();
    applyAccessibilityPreferences({ reducedMotion: true }, root);
    expect(root.attributes.get('data-reduced-motion')).toBe('true');

    applyAccessibilityPreferences({ reducedMotion: false }, root);
    expect(root.attributes.size).toBe(0);
  });
});
