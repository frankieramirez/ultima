import { ArrowUpRightIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { ToggleGroup } from '@ultima/ui';

import { layoutStyles } from './layout';
import { TextLink } from './text-link';
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
  identity: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
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
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    gap: space['--ult-space-6'],
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
      <span {...stylex.props(styles.identity)}>ULTIMA / THE FINAL SPELL FOR YOUR INTERFACES</span>
      <div {...stylex.props(styles.cluster)}>
        <div {...stylex.props(styles.links)}>
          <TextLink variant="muted" render={<Link to="/install" />}>
            Documentation <ArrowUpRightIcon aria-hidden />
          </TextLink>
          <TextLink variant="muted" href="https://github.com/frankieramirez/ultima">
            GitHub <ArrowUpRightIcon aria-hidden />
          </TextLink>
          <TextLink variant="muted" href="https://github.com/frankieramirez/ultima/blob/main/LICENSE">
            MIT license
          </TextLink>
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
