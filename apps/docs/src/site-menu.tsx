import { XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { Link } from '@tanstack/react-router';
import { font, space } from '@ultima/tokens/tokens.stylex';
import { Button, Sidebar } from '@ultima/ui';

import { navigation, type NavLink } from './navigation';

export const MENU_LABEL = 'Ultima';

const styles = stylex.create({
  panel: { blockSize: '100%', flexShrink: 0, '--sidebar-scrollbar-width': 'none' },
  dismiss: { display: 'flex', justifyContent: 'flex-end' },
  close: { paddingInline: space['--ult-space-4'] },
  groupLabel: { fontFamily: font['--ult-font-mono'] },
  list: { paddingInlineStart: space['--ult-space-4'] },
});

export function SiteMenu() {
  return (
    <Sidebar.Panel aria-label={MENU_LABEL} style={styles.panel}>
      <div {...stylex.props(styles.dismiss)}>
        <Sidebar.Close
          render={<Button variant="ghost" aria-label="Close navigation" style={styles.close} />}
        >
          <XIcon />
        </Sidebar.Close>
      </div>
      {navigation.map((group) => (
        <Sidebar.Group key={group.label}>
          <Sidebar.GroupLabel style={styles.groupLabel}>{group.label}</Sidebar.GroupLabel>
          <Sidebar.List style={styles.list}>
            {group.links.map((link) => <MenuLink key={link.label} link={link} />)}
          </Sidebar.List>
        </Sidebar.Group>
      ))}
    </Sidebar.Panel>
  );
}

function MenuLink({ link: { label, ...destination } }: { link: NavLink }) {
  return (
    <Sidebar.Item>
      <Sidebar.Link render={<Link {...destination} activeOptions={{ exact: true }} />}>
        {label}
      </Sidebar.Link>
    </Sidebar.Item>
  );
}
