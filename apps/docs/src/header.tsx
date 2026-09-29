import { docsStyles } from './docs-style';
import { ArrowUpRightIcon, ListIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, NavigationMenu, Sidebar } from '@ultima/ui';

import { BrandLogo } from './brand-logo';
import { breakpoints } from './breakpoints.stylex';
import { ColorModeToggle } from './color-mode-toggle';
import { layoutStyles } from './layout';
import { SiteSearch } from './site-search';
import { TextLink } from './text-link';

const styles = stylex.create({
  chrome: {
    backgroundColor: color['--ult-color-surface'],
    insetBlockStart: 0,
    position: 'sticky',
    zIndex: 2,
  },
  bar: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: { default: space['--ult-space-4'], [breakpoints.WIDE]: space['--ult-space-7'] },
    inlineSize: '100%',
    blockSize: space['--ult-space-12'],
    paddingBlock: space['--ult-space-4'],
  },
  brandLogo: { display: 'block', height: text['--ult-text-5'], width: 'auto' },
  cluster: { display: 'flex', alignItems: 'center', gap: space['--ult-space-4'] },
  trigger: { display: { default: 'inline-flex', [breakpoints.WIDE]: 'none' }, paddingInline: space['--ult-space-4'] },
  links: {
    alignItems: 'center',
    display: { default: 'none', [breakpoints.WIDE]: 'flex' },
    flexGrow: 1,
  },
  link: {
    color: {
      default: color['--ult-color-text-muted'],
      ':is([data-active], [aria-current="page"])': color['--ult-color-accent-text'],
      ':is([data-active], [aria-current="page"]):hover': color['--ult-color-accent-text'],
    },
    fontWeight: { default: font['--ult-font-weight-regular'], ':is([data-active], [aria-current="page"])': font['--ult-font-weight-semibold'] },
    textDecorationLine: { default: 'none', ':is([data-active], [aria-current="page"])': 'underline' },
    textDecorationThickness: border.focus,
    textUnderlineOffset: space['--ult-space-3'],
  },
  // The footer's copy serves narrow viewports; this one covers the Studio, which renders no footer.
  mode: { display: { default: 'none', [breakpoints.WIDE]: 'inline-flex' }, flexShrink: 0 },
  github: {
    fontSize: text['--ult-text-4'],
    marginInlineStart: 'auto',
  },
});

const LINKS = [
  { label: 'Components', to: '/components' },
  { label: 'Tokens', to: '/tokens' },
  { label: 'Studio', to: '/theme-studio' },
  { label: 'Documentation', to: '/install' },
] as const;

export function Header() {
  return (
    <header {...stylex.props(styles.chrome)}>
      <div {...stylex.props(layoutStyles.gutter, styles.bar)}>
        <div {...stylex.props(styles.cluster)}>
          <Sidebar.Trigger render={<Button variant="ghost" aria-label="Toggle navigation" style={[docsStyles.square, styles.trigger]} />}>
            <ListIcon aria-hidden />
          </Sidebar.Trigger>
          <TextLink variant="muted" render={<Link to="/" aria-label="Ultima home" />}>
            <BrandLogo alt="" width={140} height={20} style={styles.brandLogo} />
          </TextLink>
        </div>
        <NavigationMenu.Root aria-label="Site" style={styles.links}>
          <NavigationMenu.List>
            {LINKS.map((link) => (
              <NavigationMenu.Item key={link.to}>
                <NavigationMenu.Link render={<Link to={link.to} />} style={styles.link}>
                  {link.label}
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            ))}
          </NavigationMenu.List>
        </NavigationMenu.Root>
        <SiteSearch />
        <ColorModeToggle style={styles.mode} />
        <TextLink variant="muted" style={styles.github} href="https://github.com/frankieramirez/ultima">
          GitHub <ArrowUpRightIcon aria-hidden />
        </TextLink>
      </div>
    </header>
  );
}
