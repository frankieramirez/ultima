import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Avatar } from '@ultima/ui/avatar';
import { Badge } from '@ultima/ui/badge';
import { DropdownMenu } from '@ultima/ui/dropdown-menu';
import { Separator } from '@ultima/ui/separator';
import { Sidebar } from '@ultima/ui/sidebar';
import type { ComponentType } from 'react';

import {
  AnalyticsGlyph,
  BoxGlyph,
  CartGlyph,
  ChevronsUpDownGlyph,
  HelpGlyph,
  LogoGlyph,
  MegaphoneGlyph,
  OverviewGlyph,
  SettingsGlyph,
  UsersGlyph,
} from './icons';

type Destination = { label: string; href: string; glyph: ComponentType; count?: number; current?: boolean };

const primary: Destination[] = [
  { label: 'Overview', href: '#overview', glyph: OverviewGlyph, current: true },
  { label: 'Orders', href: '#orders', glyph: CartGlyph, count: 12 },
  { label: 'Products', href: '#products', glyph: BoxGlyph },
  { label: 'Customers', href: '#customers', glyph: UsersGlyph },
  { label: 'Analytics', href: '#analytics', glyph: AnalyticsGlyph },
  { label: 'Campaigns', href: '#campaigns', glyph: MegaphoneGlyph },
];

const secondary: Destination[] = [
  { label: 'Settings', href: '#settings', glyph: SettingsGlyph },
  { label: 'Help', href: '#help', glyph: HelpGlyph },
];

const styles = stylex.create({
  panel: {
    blockSize: '100dvh',
    boxSizing: 'border-box',
    flexShrink: 0,
    insetBlockStart: 0,
    position: 'sticky',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    minBlockSize: '100%',
  },
  switcher: {
    gap: space['--ult-space-5'],
  },
  workspace: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-1'],
    minInlineSize: 0,
  },
  workspaceName: {
    color: color['--ult-color-text'],
    fontWeight: font['--ult-font-weight-semibold'],
    lineHeight: font['--ult-font-leading-none'],
  },
  plan: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-none'],
  },
  label: {
    flexGrow: 1,
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    marginBlockStart: 'auto',
  },
  user: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
  person: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-1'],
    minInlineSize: 0,
  },
  personName: {
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-snug'],
  },
  email: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
    overflowWrap: 'anywhere',
  },
});

function Links({ destinations }: { destinations: Destination[] }) {
  return (
    <Sidebar.List>
      {destinations.map(({ label, href, glyph: Glyph, count, current }) => (
        <Sidebar.Item key={href}>
          <Sidebar.Link href={href} active={current} aria-label={count === undefined ? undefined : `${label}, ${count}`}>
            <Glyph />
            <span {...stylex.props(styles.label)}>{label}</span>
            {count === undefined ? null : <Badge>{count}</Badge>}
          </Sidebar.Link>
        </Sidebar.Item>
      ))}
    </Sidebar.List>
  );
}

function WorkspaceSwitcher() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger render={<Sidebar.Button style={styles.switcher} />}>
        <LogoGlyph />
        <span {...stylex.props(styles.workspace)}>
          <span {...stylex.props(styles.workspaceName)}>Northwind</span>
          <span {...stylex.props(styles.plan)}>Pro plan</span>
        </span>
        <ChevronsUpDownGlyph />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Positioner align="start" sideOffset={4}>
          <DropdownMenu.Popup>
            <DropdownMenu.RadioGroup defaultValue="northwind">
              <DropdownMenu.RadioItem value="northwind">
                Northwind
                <DropdownMenu.RadioItemIndicator />
              </DropdownMenu.RadioItem>
            </DropdownMenu.RadioGroup>
            <DropdownMenu.Separator />
            <DropdownMenu.Item>Create workspace</DropdownMenu.Item>
          </DropdownMenu.Popup>
        </DropdownMenu.Positioner>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function AppSidebar() {
  return (
    <Sidebar.Panel aria-label="Workspace" style={styles.panel}>
      <div {...stylex.props(styles.column)}>
        <WorkspaceSwitcher />
        <Links destinations={primary} />
        <div {...stylex.props(styles.footer)}>
          <Links destinations={secondary} />
          <Separator />
          <div {...stylex.props(styles.user)}>
            <Avatar.Root aria-hidden="true">
              <Avatar.Fallback>AK</Avatar.Fallback>
            </Avatar.Root>
            <span {...stylex.props(styles.person)}>
              <span {...stylex.props(styles.personName)}>Ada Kim</span>
              <span {...stylex.props(styles.email)}>ada@northwind.co</span>
            </span>
          </div>
        </div>
      </div>
    </Sidebar.Panel>
  );
}
