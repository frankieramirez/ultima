import { docsStyles } from './docs-style';
import { XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { Link } from '@tanstack/react-router';
import { font, space } from '@ultima/tokens/tokens.stylex';
import { Button, ScrollArea, Sidebar } from '@ultima/ui';

import { breakpoints } from './breakpoints.stylex';
import { navigation, type NavLink } from './navigation';
import { shell } from './shell.stylex';

export const MENU_LABEL = 'Ultima';

const styles = stylex.create({
  panel: {
    borderInlineEndWidth: 0,
    alignSelf: 'flex-start',
    blockSize: '100%',
    flexShrink: 0,
    insetBlockStart: { default: 'auto', [breakpoints.WIDE]: shell.chromeBlock },
    position: { default: 'static', [breakpoints.WIDE]: 'sticky' },
  },
  fillRow: {
    alignSelf: { default: null, [breakpoints.WIDE]: 'stretch' },
    blockSize: { default: null, [breakpoints.WIDE]: 'auto' },
    contain: { default: null, [breakpoints.WIDE]: 'size' },
    maxBlockSize: { default: null, [breakpoints.WIDE]: `calc(100dvh - ${shell.chromeBlock})` },
  },
  scroll: { blockSize: '100%' },
  content: { paddingBlock: space['--ult-space-8'], paddingInline: space['--ult-space-4'] },
  dismiss: { display: 'flex', justifyContent: 'flex-end' },
  close: { paddingInline: space['--ult-space-4'] },
  groupLabel: { fontFamily: font['--ult-font-mono'] },
  list: { paddingInlineStart: space['--ult-space-4'] },
  subgroup: { paddingBlockEnd: 0, paddingInlineStart: space['--ult-space-4'] },
});

export function SiteMenu() {
  return (
    <Sidebar.Panel aria-label={MENU_LABEL} style={[styles.panel, styles.fillRow]}>
      <ScrollArea.Root style={styles.scroll}>
        <ScrollArea.Viewport>
          <ScrollArea.Content style={styles.content}>
            <div {...stylex.props(styles.dismiss)}>
              <Sidebar.Close
                render={<Button variant="ghost" aria-label="Close navigation" style={[docsStyles.square, styles.close]} />}
              >
                <XIcon />
              </Sidebar.Close>
            </div>
            {navigation.map((group) => (
              <Sidebar.Group key={group.label}>
                <Sidebar.GroupLabel style={styles.groupLabel}>{group.label}</Sidebar.GroupLabel>
                {group.links.length > 0 && <MenuList links={group.links} />}
                {group.groups?.map((subgroup) => (
                  <Sidebar.Group key={subgroup.label} style={styles.subgroup}>
                    <Sidebar.GroupLabel render={<h4 />}>{subgroup.label}</Sidebar.GroupLabel>
                    <MenuList links={subgroup.links} />
                  </Sidebar.Group>
                ))}
              </Sidebar.Group>
            ))}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Sidebar.Panel>
  );
}

function MenuList({ links }: { links: NavLink[] }) {
  return (
    <Sidebar.List style={styles.list}>
      {links.map((link) => (
        <MenuLink key={link.label} link={link} />
      ))}
    </Sidebar.List>
  );
}

function MenuLink({ link: { label, ...destination } }: { link: NavLink }) {
  return (
    <Sidebar.Item>
      <Sidebar.Link aria-label={label} render={<Link {...destination} activeOptions={{ exact: true }} />}>
        --{label.toLowerCase().replace(/\s+/g, '-')}
      </Sidebar.Link>
    </Sidebar.Item>
  );
}
