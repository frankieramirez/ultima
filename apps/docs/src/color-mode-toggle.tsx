import { docsStyles } from './docs-style';
import type { StyleXStyles } from '@stylexjs/stylex';
import { ToggleGroup } from '@ultima/ui';

import { useTheme, type ThemePreference } from './theme';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

/** The site's color-mode switch. The header and the footer each render one, on either side of the breakpoint. */
export function ColorModeToggle({ style }: { style?: StyleXStyles }) {
  const { preference, setPreference } = useTheme();

  return (
    <ToggleGroup.Root
      aria-label="Color mode"
      onValueChange={(next, eventDetails) => {
        const [preferred] = next;
        if (!preferred) {
          eventDetails.cancel();
          return;
        }
        setPreference(preferred);
      }}
      style={style}
      value={[preference]}
    >
      {OPTIONS.map((option) => (
        <ToggleGroup.Item key={option.value} value={option.value} style={docsStyles.square}>
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
