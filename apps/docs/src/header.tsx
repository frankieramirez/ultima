import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';

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
  control: {
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-md'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    display: 'flex',
    overflow: 'hidden',
  },
  option: {
    appearance: 'none',
    backgroundColor: {
      default: 'transparent',
      ':is([aria-pressed="true"])': color['--ult-color-surface-hover'],
    },
    borderWidth: 0,
    color: {
      default: color['--ult-color-text-muted'],
      ':is([aria-pressed="true"])': color['--ult-color-text'],
    },
    cursor: 'pointer',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
    outlineColor: color['--ult-color-border-focus'],
    outlineOffset: border.focusOffset,
    outlineStyle: { default: 'none', ':focus-visible': 'solid' },
    outlineWidth: border.focus,
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
      <div {...stylex.props(styles.control)} role="group" aria-label="Color mode">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={preference === option.value}
            onClick={() => setPreference(option.value)}
            {...stylex.props(styles.option)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </header>
  );
}
