import { ArrowUpRightIcon, ListIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, NavigationMenu, Separator, Sidebar } from '@ultima/ui';

import { BrandLogo } from './brand-logo';
import { layoutStyles } from './layout';
import { TextLink } from './text-link';

const WIDE = '@media (min-width: 48rem)';

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
  brandLogo: { display: 'block', height: '0.8rem', width: 'auto' },
  cluster: { display: 'flex', alignItems: 'center', gap: space['--ult-space-4'] },
  trigger: { display: { default: 'inline-flex', [WIDE]: 'none' }, paddingInline: space['--ult-space-4'] },
  links: {
    alignItems: 'center',
    display: { default: 'none', [WIDE]: 'flex' },
    flexGrow: 1,
  },
  status: {
    color: color['--ult-color-text-subtle'],
    display: { default: 'none', [WIDE]: 'block' },
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
  },
  github: {
    fontSize: text['--ult-text-4'],
    marginInlineStart: 'auto',
  },
});

const LINKS = [
  { label: 'Components', to: '/components' },
  { label: 'Tokens', to: '/tokens' },
  { label: 'Documentation', to: '/install' },
  { label: 'Studio', to: '/theme-studio' },
] as const;

export function Header() {
  return (
    <header {...stylex.props(styles.chrome)}>
      <div {...stylex.props(layoutStyles.gutter, styles.bar)}>
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
        <span {...stylex.props(styles.status)}>v0 / IN DEVELOPMENT</span>
        <TextLink variant="muted" style={styles.github} href="https://github.com/frankieramirez/ultima">
          GitHub <ArrowUpRightIcon aria-hidden />
        </TextLink>
      </div>
      <Separator />
    </header>
  );
}
