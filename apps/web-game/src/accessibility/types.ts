export interface AccessibilityPreferences {
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  reducedMotion: false,
  highContrast: false,
};
