import { docsStyles } from './docs-style';
import { ArrowUpRightIcon, MenuIcon } from 'lucide-react';
import { GithubMarkIcon } from './github-mark';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Icon, NavigationMenu, Separator, Sidebar } from '@ultima/ui';

import { BrandLogo } from './brand-logo';
import { breakpoints } from './breakpoints.stylex';
import { ColorModeToggle } from './color-mode-toggle';
import { shell } from './shell.stylex';
import { SiteSearch } from './site-search';
import { TextLink } from './text-link';

const styles = stylex.create({
  chrome: {
    backgroundColor: color['--ult-color-surface'],
    blockSize: { default: shell.narrowChromeBlock, [breakpoints.DESKTOP]: shell.chromeBlock },
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    insetBlockStart: 0,
    position: 'sticky',
    zIndex: 2,
  },
  bar: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: { default: space['--ult-space-4'], [breakpoints.WIDE]: space['--ult-space-7'] },
    flexGrow: 1,
    inlineSize: '100%',
    paddingBlock: space['--ult-space-4'],
    paddingInlineStart: { default: shell.narrowEdge, [breakpoints.DESKTOP]: shell.edge },
    paddingInlineEnd: { default: space['--ult-space-4'], [breakpoints.DESKTOP]: shell.edge },
  },
  brandLogo: { display: 'block', height: text['--ult-text-8'], width: 'auto' },
  search: { marginInlineStart: { default: 'auto', [breakpoints.DESKTOP]: 0 } },
  trigger: {
    height: space['--ult-space-10'],
    display: { default: 'inline-flex', [breakpoints.DESKTOP]: 'none' },
    inlineSize: space['--ult-space-10'],
    paddingInline: 0,
  },
  links: {
    alignItems: 'center',
    display: { default: 'none', [breakpoints.DESKTOP]: 'flex' },
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
  mode: { display: { default: 'none', [breakpoints.DESKTOP]: 'inline-flex' }, flexShrink: 0 },
  github: {
    display: { default: 'none', [breakpoints.WIDE]: 'inline-flex' },
    fontSize: text['--ult-text-4'],
  },
  githubAlways: { display: 'inline-flex' },
  githubMark: { display: { default: 'inline', [breakpoints.WIDE]: 'none' } },
  githubLabel: { display: { default: 'none', [breakpoints.WIDE]: 'inline' } },
});

const LINKS = [
  { label: 'Components', to: '/components' },
  { label: 'Tokens', to: '/tokens' },
  { label: 'Studio', to: '/theme-studio' },
  { label: 'Documentation', to: '/install' },
] as const;

/** `footer` says whether the route renders the footer, which carries GitHub where the header drops it. */
export function Header({ footer }: { footer: boolean }) {
  return (
    <header {...stylex.props(styles.chrome)}>
      <div {...stylex.props(styles.bar)}>
        <TextLink variant="muted" render={<Link to="/" aria-label="Ultima home" />}>
          <BrandLogo alt="" style={styles.brandLogo} />
        </TextLink>
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
        <SiteSearch style={styles.search} />
        <ColorModeToggle style={styles.mode} />
        <TextLink
          variant="muted"
          aria-label="GitHub"
          style={[styles.github, !footer && styles.githubAlways]}
          href="https://github.com/frankieramirez/ultima"
        >
          <Icon style={styles.githubMark}><GithubMarkIcon /></Icon>
          <span {...stylex.props(styles.githubLabel)}>
            GitHub <Icon><ArrowUpRightIcon /></Icon>
          </span>
        </TextLink>
        <Sidebar.Trigger render={<Button variant="ghost" aria-label="Toggle navigation" style={[docsStyles.square, styles.trigger]} />}>
          <Icon><MenuIcon /></Icon>
        </Sidebar.Trigger>
      </div>
      <Separator />
    </header>
  );
}
