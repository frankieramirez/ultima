import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { ToggleGroup } from '@ultima/ui';

import { useTheme, type ThemePreference } from './theme';
import { BrandLogo } from './brand-logo';

const styles = stylex.create({
  bar: {
    alignItems: 'center',
    borderBottomColor: color['--ult-color-border'],
    borderBottomStyle: 'solid',
    borderBottomWidth: border.hairline,
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-6'],
  },
  brand: {
    alignItems: 'center',
    display: 'flex',
    textDecoration: 'none',
  },
  brandLogo: {
    display: 'block',
    height: '1.5rem',
    width: 'auto',
  },
  nav: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
  },
  link: {
    color: {
      default: color['--ult-color-text-muted'],
      ':hover': color['--ult-color-text'],
      ':is([data-status="active"])': color['--ult-color-text'],
    },
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    textDecoration: 'none',
  },
  cluster: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-6'],
  },
});

const NAV = [
  { to: '/install' as const, label: 'Install' },
  { to: '/tokens' as const, label: 'Tokens' },
  { to: '/palette' as const, label: 'Palette' },
  { to: '/components' as const, label: 'Components' },
  { to: '/rationale' as const, label: 'Rationale' },
];

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
        <Link to="/" {...stylex.props(styles.brand)}>
          <BrandLogo alt="Ultima" width={1287} height={261} style={styles.brandLogo} />
        </Link>
        <nav {...stylex.props(styles.nav)} aria-label="Primary">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to} {...stylex.props(styles.link)}>
              {item.label}
            </Link>
          ))}
        </nav>
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
