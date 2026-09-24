import { ArrowUpRightIcon, ListIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, NavigationMenu, Separator, Sidebar } from '@ultima/ui';

import { BrandLogo } from './brand-logo';
import { breakpoints } from './breakpoints.stylex';
import { ColorModeToggle } from './color-mode-toggle';
import { layoutStyles } from './layout';
import { Kicker } from './page';
import { TextLink } from './text-link';

const styles = stylex.create({
  chrome: {
    backgroundColor: color['--ult-color-surface'],
    insetBlockStart: 0,
    position: 'sticky',
    zIndex: 1,
  },
  bar: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: space['--ult-space-10'],
    inlineSize: '100%',
    paddingBlock: space['--ult-space-8'],
  },
  brandLogo: { display: 'block', height: text['--ult-text-5'], width: 'auto' },
  cluster: { display: 'flex', alignItems: 'center', gap: space['--ult-space-4'] },
  trigger: { display: { default: 'inline-flex', [breakpoints.WIDE]: 'none' }, paddingInline: space['--ult-space-4'] },
  links: {
    alignItems: 'center',
    display: { default: 'none', [breakpoints.WIDE]: 'flex' },
    flexGrow: 1,
  },
  // Gives way to the mode control between the two breakpoints, where the bar has room for one of them.
  status: { display: { default: 'none', [breakpoints.DESKTOP]: 'block' } },
  // The footer's copy serves narrow viewports; this one covers the Studio, which renders no footer.
  mode: { display: { default: 'none', [breakpoints.WIDE]: 'inline-flex' }, flexShrink: 0 },
  github: {
    fontSize: text['--ult-text-4'],
    marginInlineStart: 'auto',
  },
});

const LINKS = [
  { label: 'Install', to: '/install' },
  { label: 'Components', to: '/components' },
  { label: 'Tokens', to: '/tokens' },
  { label: 'Studio', to: '/theme-studio' },
] as const;

export function Header({ wide = false }: { wide?: boolean }) {
  return (
    <header {...stylex.props(styles.chrome)}>
      <div {...stylex.props(wide ? layoutStyles.gutterWide : layoutStyles.gutter, styles.bar)}>
        <div {...stylex.props(styles.cluster)}>
          <TextLink variant="muted" render={<Link to="/" aria-label="Ultima home" />}>
            <BrandLogo alt="" width={140} height={20} style={styles.brandLogo} />
          </TextLink>
          <Sidebar.Trigger render={<Button variant="ghost" aria-label="Toggle navigation" style={styles.trigger} />}>
            <ListIcon aria-hidden />
          </Sidebar.Trigger>
        </div>
        <NavigationMenu.Root aria-label="Site" style={styles.links}>
          <NavigationMenu.List>
            {LINKS.map((link) => (
              <NavigationMenu.Item key={link.to}>
                <NavigationMenu.Link render={<Link to={link.to} />}>
                  {link.label}
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            ))}
          </NavigationMenu.List>
        </NavigationMenu.Root>
        <Kicker style={styles.status}>v0 / IN DEVELOPMENT</Kicker>
        <ColorModeToggle style={styles.mode} />
        <TextLink variant="muted" style={styles.github} href="https://github.com/frankieramirez/ultima">
          GitHub <ArrowUpRightIcon aria-hidden />
        </TextLink>
      </div>
      <Separator />
    </header>
  );
}
