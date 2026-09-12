import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Sidebar, ToggleGroup } from '@ultima/ui';

import { BrandLogo } from './brand-logo';
import { useTheme, type ThemePreference } from './theme';

const styles = stylex.create({
  bar: {
    boxSizing: 'border-box',
    inlineSize: '100%',
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    minHeight: '4.25rem',
    paddingInline: { default: space['--ult-space-6'], '@media (min-width: 48rem)': '1.75rem' },
  },
  brandLogo: { display: 'block', height: '0.8rem', width: 'auto' },
  trigger: { paddingInline: 0 },
});

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export function Header() {
  const { preference, setPreference } = useTheme();

  return (
    <header {...stylex.props(styles.bar)}>
      <Sidebar.Trigger
        render={<Button variant="ghost" aria-label="Toggle navigation" style={styles.trigger} />}
      >
        <BrandLogo alt="Ultima" width={140} height={20} style={styles.brandLogo} />
      </Sidebar.Trigger>
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
        value={[preference]}
      >
        {OPTIONS.map((option) => (
          <ToggleGroup.Item key={option.value} value={option.value}>
            {option.label}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
    </header>
  );
}
