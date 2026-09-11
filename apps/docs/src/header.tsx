import { ListIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Sidebar, ToggleGroup } from '@ultima/ui';

import { useTheme, type ThemePreference } from './theme';
import { BrandLogo } from './brand-logo';

const styles = stylex.create({
  bar: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-6'],
  },
  brandLogo: {
    display: 'block',
    height: '1.5rem',
    width: 'auto',
  },
  cluster: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-6'],
  },
  trigger: {
    paddingInline: space['--ult-space-4'],
  },
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
        <Sidebar.Trigger
          render={<Button variant="ghost" aria-label="Toggle navigation" style={styles.trigger} />}
        >
          <ListIcon />
        </Sidebar.Trigger>
        <BrandLogo alt="Ultima" width={1287} height={261} style={styles.brandLogo} />
      </div>
      <ToggleGroup.Root
        aria-label="Color mode"
        onValueChange={(next, eventDetails) => {
          const [preferred] = next;
          // Base UI reports [] when the pressed option is pressed again, and honours
          // cancel() before it sets state. Without this a mode would stop being in force.
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
