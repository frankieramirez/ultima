import { ListIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, space } from '@ultima/tokens/tokens.stylex';
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
    paddingInline: space['--ult-space-6'],
  },
  brandLogo: { display: 'block', height: '0.8rem', width: 'auto' },
  brand: {
    display: 'inline-flex', alignItems: 'center', minHeight: space['--ult-space-10'],
    ':focus-visible': { outline: `${border.focus} solid ${color['--ult-color-border-focus']}`, outlineOffset: border.focusOffset },
  },
  cluster: { display: 'flex', alignItems: 'center', gap: space['--ult-space-4'] },
  trigger: { display: { default: 'inline-flex', '@media (min-width: 48rem)': 'none' }, paddingInline: space['--ult-space-4'] },
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
      <div {...stylex.props(styles.cluster)}>
        <Link to="/" aria-label="Ultima home" {...stylex.props(styles.brand)}>
          <BrandLogo alt="" width={140} height={20} style={styles.brandLogo} />
        </Link>
        <Sidebar.Trigger render={<Button variant="ghost" aria-label="Toggle navigation" style={styles.trigger} />}>
          <ListIcon aria-hidden />
        </Sidebar.Trigger>
      </div>
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
