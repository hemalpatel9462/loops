import { useEffect, useState } from 'react';
import type { AccessibilityPreferences } from './types.ts';
import { DEFAULT_ACCESSIBILITY_PREFERENCES } from './types.ts';

type AttributeRoot = Pick<HTMLElement, 'setAttribute' | 'removeAttribute'>;

export function applyAccessibilityPreferences(
  preferences: AccessibilityPreferences,
  root: AttributeRoot,
): void {
  const attributes: Array<[string, boolean]> = [
    ['data-reduced-motion', preferences.reducedMotion],
  ];
  for (const [name, enabled] of attributes) {
    if (enabled) root.setAttribute(name, 'true');
    else root.removeAttribute(name);
  }
}

export function useAccessibilityPreferences(
  initial: AccessibilityPreferences = DEFAULT_ACCESSIBILITY_PREFERENCES,
) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(initial);

  useEffect(() => {
    if (typeof document !== 'undefined') applyAccessibilityPreferences(preferences, document.documentElement);
    return () => {
      if (typeof document !== 'undefined') applyAccessibilityPreferences(DEFAULT_ACCESSIBILITY_PREFERENCES, document.documentElement);
    };
  }, [preferences]);

  return [preferences, setPreferences] as const;
}
