import { docsStyles } from './docs-style';
import { XIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { Link } from '@tanstack/react-router';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, ScrollArea, Separator, Sidebar } from '@ultima/ui';

import { BrandLogo } from './brand-logo';
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
    paddingBlock: 0,
    paddingInline: 0,
    position: { default: 'static', [breakpoints.WIDE]: 'sticky' },
  },
  fillRow: {
    alignSelf: { default: null, [breakpoints.WIDE]: 'stretch' },
    blockSize: { default: null, [breakpoints.WIDE]: 'auto' },
    contain: { default: null, [breakpoints.WIDE]: 'size' },
    maxBlockSize: { default: null, [breakpoints.WIDE]: `calc(100dvh - ${shell.chromeBlock})` },
  },
  frame: { blockSize: '100%', display: 'flex', flexDirection: 'column' },
  head: { display: { default: 'block', [breakpoints.WIDE]: 'none' }, flexShrink: 0 },
  headBar: {
    alignItems: 'center',
    blockSize: shell.narrowChromeBlock,
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    paddingInlineEnd: space['--ult-space-4'],
    paddingInlineStart: shell.narrowEdge,
  },
  wordmark: { display: 'block', height: text['--ult-text-4'], width: 'auto' },
  close: { height: space['--ult-space-10'], inlineSize: space['--ult-space-10'], paddingInline: 0 },
  scroll: { flexGrow: 1, minBlockSize: 0 },
  content: {
    paddingBlockEnd: space['--ult-space-10'],
    paddingBlockStart: space['--ult-space-8'],
    paddingInline: `calc(${shell.edge} - ${space['--ult-space-4']})`,
  },
  groupLabel: { fontFamily: font['--ult-font-mono'] },
});

export function SiteMenu() {
  return (
    <Sidebar.Panel aria-label={MENU_LABEL} style={[styles.panel, styles.fillRow]}>
      <div {...stylex.props(styles.frame)}>
        <div {...stylex.props(styles.head)}>
          <div {...stylex.props(styles.headBar)}>
            <BrandLogo alt="" width={140} height={20} style={styles.wordmark} />
            <Sidebar.Close
              render={<Button variant="ghost" aria-label="Close navigation" style={[docsStyles.square, styles.close]} />}
            >
              <XIcon />
            </Sidebar.Close>
          </div>
          <Separator />
        </div>
        <ScrollArea.Root style={styles.scroll}>
          <ScrollArea.Viewport>
            <ScrollArea.Content style={styles.content}>
              {navigation.map((group) => (
                <Sidebar.Group key={group.label}>
                  <Sidebar.GroupLabel style={styles.groupLabel}>{group.label}</Sidebar.GroupLabel>
                  <Sidebar.List>
                    {group.links.map((link) => (
                      <MenuLink key={link.label} link={link} />
                    ))}
                  </Sidebar.List>
                </Sidebar.Group>
              ))}
            </ScrollArea.Content>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </div>
    </Sidebar.Panel>
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
