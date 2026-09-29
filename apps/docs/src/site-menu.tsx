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
});

export function SiteMenu() {
  return (
    <Sidebar.Panel aria-label={MENU_LABEL} style={[styles.panel, styles.fillRow]}>
      <ScrollArea.Root style={styles.scroll}>
        <ScrollArea.Viewport>
          <ScrollArea.Content style={styles.content}>
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
                  {group.links.map((link) => (
                    <MenuLink key={link.label} link={link} />
                  ))}
                </Sidebar.List>
              </Sidebar.Group>
            ))}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Sidebar.Panel>
  );
}

function MenuLink({ link: { label, ...destination } }: { link: NavLink }) {
  return (
    <Sidebar.Item>
      <Sidebar.Link render={<Link {...destination} activeOptions={{ exact: true }} />}>{label}</Sidebar.Link>
    </Sidebar.Item>
  );
}
