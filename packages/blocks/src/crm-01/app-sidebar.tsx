import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge } from '@ultima/ui/badge';
import { Sidebar } from '@ultima/ui/sidebar';
import type { ComponentType } from 'react';

import { BuildingGlyph, ChartGlyph, ContactGlyph, HandshakeGlyph, InboxGlyph, LogoGlyph, TasksGlyph } from './icons';

const styles = stylex.create({
  workspace: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-4'],
  },
  name: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-none'],
  },
  label: {
    flexGrow: 1,
  },
});

type NavLink = { label: string; href: string; glyph: ComponentType; count?: number; active?: boolean };

const LINKS: NavLink[] = [
  { label: 'Inbox', href: '#inbox', glyph: InboxGlyph, count: 8 },
  { label: 'Contacts', href: '#contacts', glyph: ContactGlyph, active: true },
  { label: 'Companies', href: '#companies', glyph: BuildingGlyph },
  { label: 'Deals', href: '#deals', glyph: HandshakeGlyph, count: 24 },
  { label: 'Tasks', href: '#tasks', glyph: TasksGlyph },
  { label: 'Reports', href: '#reports', glyph: ChartGlyph },
];

export function AppSidebar() {
  return (
    <Sidebar.Panel aria-label="Workspace">
      <div {...stylex.props(styles.workspace)}>
        <LogoGlyph />
        <span {...stylex.props(styles.name)}>Halcyon</span>
      </div>
      <Sidebar.Group>
        <Sidebar.List>
          {LINKS.map(({ label, href, glyph: Glyph, count, active }) => (
            <Sidebar.Item key={href}>
              <Sidebar.Link href={href} active={active} aria-label={count === undefined ? undefined : `${label}, ${count}`}>
                <Glyph />
                <span {...stylex.props(styles.label)}>{label}</span>
                {count !== undefined && <Badge>{count}</Badge>}
              </Sidebar.Link>
            </Sidebar.Item>
          ))}
        </Sidebar.List>
      </Sidebar.Group>
    </Sidebar.Panel>
  );
}
