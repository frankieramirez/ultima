import { CaretRightIcon, XIcon } from '@phosphor-icons/react';
import { Link, useRouterState } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { motion, space } from '@ultima/tokens/tokens.stylex';
import { Button, Collapsible, Sidebar } from '@ultima/ui';
import { useEffect, useState } from 'react';

import { navigation, type NavGroup, type NavLink } from './navigation';

export const MENU_LABEL = 'Ultima';

const styles = stylex.create({
  panel: {
    blockSize: '100%',
  },
  dismiss: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  close: {
    paddingInline: space['--ult-space-4'],
  },
  caret: {
    rotate: '0deg',
    transitionDuration: motion['--ult-motion-fast'],
    transitionProperty: 'rotate',
  },
  turned: {
    rotate: '90deg',
  },
  nested: {
    paddingBlockStart: space['--ult-space-2'],
  },
});

export function SiteMenu() {
  return (
    <Sidebar.Panel aria-label={MENU_LABEL} style={styles.panel}>
      {/* Sidebar.Close renders null above the breakpoint, so this row has no height there. */}
      <div {...stylex.props(styles.dismiss)}>
        <Sidebar.Close render={<Button variant="ghost" aria-label="Close navigation" style={styles.close} />}>
          <XIcon />
        </Sidebar.Close>
      </div>
      {navigation.map((group) => (
        <Sidebar.Group key={group.label}>
          <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
          <Sidebar.List>
            {group.links.map((link) => (
              <MenuLink key={link.label} link={link} />
            ))}
            {group.nested ? <NestedSet nested={group.nested} /> : null}
          </Sidebar.List>
        </Sidebar.Group>
      ))}
    </Sidebar.Panel>
  );
}

/** TanStack Router matches a link by prefix unless told otherwise, and `/` is a prefix of every path. */
function MenuLink({ link: { label, ...destination } }: { link: NavLink }) {
  return (
    <Sidebar.Item>
      <Sidebar.Link render={<Link {...destination} activeOptions={{ exact: true }} />}>{label}</Sidebar.Link>
    </Sidebar.Item>
  );
}

function NestedSet({ nested }: { nested: NonNullable<NavGroup['nested']> }) {
  const holdsCurrentPage = useRouterState({
    select: (state) => state.location.pathname.startsWith('/components/'),
  });
  const [open, setOpen] = useState(holdsCurrentPage);

  useEffect(() => {
    if (holdsCurrentPage) setOpen(true);
  }, [holdsCurrentPage]);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} render={<Sidebar.Item />}>
      <Collapsible.Trigger render={<Sidebar.Button />}>
        <CaretRightIcon aria-hidden {...stylex.props(styles.caret, open && styles.turned)} />
        {nested.label}
      </Collapsible.Trigger>
      <Collapsible.Panel>
        <Sidebar.List style={styles.nested}>
          {nested.links.map((link) => (
            <MenuLink key={link.label} link={link} />
          ))}
        </Sidebar.List>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
