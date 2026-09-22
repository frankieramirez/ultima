import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, motion, space, text } from '@ultima/tokens/tokens.stylex';
import { ToggleGroup } from '@ultima/ui';

import { layoutStyles } from './layout';
import { Kicker } from './page';
import { useTheme, type ThemePreference } from './theme';

const styles = stylex.create({
  bar: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: space['--ult-space-8'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-8'],
  },
  cluster: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-8'],
  },
  links: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-6'],
  },
  link: {
    alignItems: 'center',
    color: { default: color['--ult-color-text-muted'], ':hover': color['--ult-color-text'] },
    display: 'inline-flex',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    gap: space['--ult-space-1'],
    textDecoration: 'none',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'color',
    ':focus-visible': { outline: `${border.focus} solid ${color['--ult-color-border-focus']}`, outlineOffset: border.focusOffset },
  },
});

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export function SiteFooter() {
  const { preference, setPreference } = useTheme();

  return (
    <footer {...stylex.props(layoutStyles.gutter, styles.bar)}>
      <Kicker>ULTIMA / THE FINAL SPELL FOR YOUR INTERFACES</Kicker>
      <div {...stylex.props(styles.cluster)}>
        <div {...stylex.props(styles.links)}>
          <Link to="/install" {...stylex.props(styles.link)}>
            Documentation <ArrowUpRightIcon aria-hidden />
          </Link>
          <a href="https://github.com/frankieramirez/ultima" {...stylex.props(styles.link)}>
            GitHub <ArrowUpRightIcon aria-hidden />
          </a>
          <a href="https://github.com/frankieramirez/ultima/blob/main/LICENSE" {...stylex.props(styles.link)}>
            MIT license
          </a>
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
      </div>
    </footer>
  );
}
