import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Sidebar } from '@ultima/ui/sidebar';
import type { ReactNode } from 'react';

import { ArrowLeftGlyph, BellGlyph, CardGlyph, CodeGlyph, KeyGlyph, ShieldGlyph, UserGlyph, UsersGlyph } from './icons';

const sections: { href: string; label: string; glyph: ReactNode; current?: boolean }[] = [
  { href: '#profile', label: 'Profile', glyph: <UserGlyph /> },
  { href: '#account', label: 'Account', glyph: <KeyGlyph /> },
  { href: '#notifications', label: 'Notifications', glyph: <BellGlyph />, current: true },
  { href: '#billing', label: 'Billing', glyph: <CardGlyph /> },
  { href: '#team', label: 'Team', glyph: <UsersGlyph /> },
  { href: '#security', label: 'Security', glyph: <ShieldGlyph /> },
  { href: '#api-keys', label: 'API keys', glyph: <CodeGlyph /> },
];

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  panel: {
    blockSize: { default: '100%', [DESKTOP]: '100dvh' },
    flexShrink: 0,
    insetBlockStart: 0,
    position: { default: 'static', [DESKTOP]: 'sticky' },
  },
  back: {
    fontSize: text['--ult-text-3'],
  },
  title: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-4'],
  },
});

export function SettingsSidebar() {
  return (
    <Sidebar.Panel aria-label="Settings" style={styles.panel}>
      <Sidebar.Link href="#app" style={styles.back}>
        <ArrowLeftGlyph />
        Back to app
      </Sidebar.Link>
      <p {...stylex.props(styles.title)}>Settings</p>
      <Sidebar.List>
        {sections.map((section) => (
          <Sidebar.Item key={section.href}>
            <Sidebar.Link href={section.href} active={section.current}>
              {section.glyph}
              {section.label}
            </Sidebar.Link>
          </Sidebar.Item>
        ))}
      </Sidebar.List>
    </Sidebar.Panel>
  );
}
