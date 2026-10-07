import { docsStyles } from './docs-style';
import { ArrowUpRightIcon, GithubLogoIcon, ListIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, NavigationMenu, Separator, Sidebar } from '@ultima/ui';

import { BrandLogo } from './brand-logo';
import { breakpoints } from './breakpoints.stylex';
import { ColorModeToggle } from './color-mode-toggle';
import { shell } from './shell.stylex';
import { SiteSearch } from './site-search';
import { TextLink } from './text-link';

const styles = stylex.create({
  chrome: {
    backgroundColor: color['--ult-color-surface'],
    blockSize: { default: shell.narrowChromeBlock, [breakpoints.WIDE]: shell.chromeBlock },
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
    gap: { default: space['--ult-space-4'], [breakpoints.DESKTOP]: space['--ult-space-7'] },
    flexGrow: 1,
    inlineSize: '100%',
    paddingBlock: space['--ult-space-4'],
    paddingInlineStart: { default: shell.narrowEdge, [breakpoints.WIDE]: shell.edge },
    paddingInlineEnd: { default: space['--ult-space-4'], [breakpoints.WIDE]: shell.edge },
  },
  brandLogo: { display: 'block', height: text['--ult-text-5'], width: 'auto' },
  search: { marginInlineStart: { default: 'auto', [breakpoints.WIDE]: 0 } },
  trigger: {
    height: space['--ult-space-10'],
    display: { default: 'inline-flex', [breakpoints.WIDE]: 'none' },
    inlineSize: space['--ult-space-10'],
    paddingInline: 0,
  },
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
    display: { default: 'none', [breakpoints.DESKTOP]: 'inline-flex' },
    fontSize: text['--ult-text-4'],
  },
  githubAlways: { display: 'inline-flex' },
  githubMark: { display: { default: 'inline', [breakpoints.DESKTOP]: 'none' } },
  githubLabel: { display: { default: 'none', [breakpoints.DESKTOP]: 'inline' } },
});

const LINKS = [
  { label: 'Components', to: '/components' },
  { label: 'Blocks', to: '/blocks' },
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
          <BrandLogo alt="" width={140} height={20} style={styles.brandLogo} />
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
          <GithubLogoIcon aria-hidden {...stylex.props(styles.githubMark)} />
          <span {...stylex.props(styles.githubLabel)}>
            GitHub <ArrowUpRightIcon aria-hidden />
          </span>
        </TextLink>
        <Sidebar.Trigger render={<Button variant="ghost" aria-label="Toggle navigation" style={[docsStyles.square, styles.trigger]} />}>
          <ListIcon aria-hidden />
        </Sidebar.Trigger>
      </div>
      <Separator />
    </header>
  );
}
