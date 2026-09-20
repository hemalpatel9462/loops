import type { ChangeEvent } from 'react';
import { useId } from 'react';
import type { AccessibilityPreferences } from './types.ts';

export interface AccessibilitySettingsProps {
  readonly preferences: AccessibilityPreferences;
  readonly onChange: (preferences: AccessibilityPreferences) => void;
  readonly className?: string;
}

export function AccessibilitySettings({ preferences, onChange, className = '' }: AccessibilitySettingsProps) {
  const legendId = useId();
  const classNames = ['accessibility-settings', className].filter(Boolean).join(' ');
  const update = (key: keyof AccessibilityPreferences) => (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...preferences, [key]: event.target.checked });
  };

  return (
    <fieldset aria-labelledby={legendId} className={classNames}>
      <legend id={legendId}>Accessibility</legend>
      <label className="accessibility-settings__option">
        <input checked={preferences.reducedMotion} onChange={update('reducedMotion')} type="checkbox" />
        <span>
          <strong>Reduce motion</strong>
          <small>Minimize animation and movement.</small>
        </span>
      </label>
    </fieldset>
  );
}

export default AccessibilitySettings;
