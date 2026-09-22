import { ArrowUpRightIcon, ListIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { border, color, font, motion, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Separator, Sidebar } from '@ultima/ui';

import { BrandLogo } from './brand-logo';
import { layoutStyles } from './layout';

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
  brand: {
    display: 'inline-flex', alignItems: 'center',
    ':focus-visible': { outline: `${border.focus} solid ${color['--ult-color-border-focus']}`, outlineOffset: border.focusOffset },
  },
  cluster: { display: 'flex', alignItems: 'center', gap: space['--ult-space-4'] },
  trigger: { display: { default: 'inline-flex', [WIDE]: 'none' }, paddingInline: space['--ult-space-4'] },
  links: {
    alignItems: 'center',
    display: { default: 'none', [WIDE]: 'flex' },
    flexGrow: 1,
    gap: space['--ult-space-8'],
  },
  link: {
    color: { default: color['--ult-color-text-muted'], ':hover': color['--ult-color-text'] },
    fontSize: text['--ult-text-4'],
    textDecoration: 'none',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'color',
    ':focus-visible': { outline: `${border.focus} solid ${color['--ult-color-border-focus']}`, outlineOffset: border.focusOffset },
  },
  status: {
    color: color['--ult-color-text-subtle'],
    display: { default: 'none', [WIDE]: 'block' },
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
  },
  github: {
    alignItems: 'center',
    color: { default: color['--ult-color-text'], ':hover': color['--ult-color-text-muted'] },
    display: 'inline-flex',
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-1'],
    marginInlineStart: 'auto',
    textDecoration: 'none',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'color',
    ':focus-visible': { outline: `${border.focus} solid ${color['--ult-color-border-focus']}`, outlineOffset: border.focusOffset },
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
          <Link to="/" aria-label="Ultima home" {...stylex.props(styles.brand)}>
            <BrandLogo alt="" width={140} height={20} style={styles.brandLogo} />
          </Link>
          <Sidebar.Trigger render={<Button variant="ghost" aria-label="Toggle navigation" style={styles.trigger} />}>
            <ListIcon aria-hidden />
          </Sidebar.Trigger>
        </div>
        <nav aria-label="Site" {...stylex.props(styles.links)}>
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to} {...stylex.props(styles.link)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <span {...stylex.props(styles.status)}>v0 / IN DEVELOPMENT</span>
        <a href="https://github.com/frankieramirez/ultima" {...stylex.props(styles.github)}>
          GitHub <ArrowUpRightIcon aria-hidden />
        </a>
      </div>
      <Separator />
    </header>
  );
}
