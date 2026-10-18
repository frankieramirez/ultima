import { docsStyles } from './docs-style';
import { XIcon } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { Link } from '@tanstack/react-router';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Icon, ScrollArea, Separator, Sidebar } from '@ultima/ui';

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
    insetBlockStart: { default: 'auto', [breakpoints.DESKTOP]: shell.chromeBlock },
    paddingBlock: 0,
    paddingInline: 0,
    position: { default: 'static', [breakpoints.DESKTOP]: 'sticky' },
  },
  fillRow: {
    alignSelf: { default: null, [breakpoints.DESKTOP]: 'stretch' },
    blockSize: { default: null, [breakpoints.DESKTOP]: 'auto' },
    contain: { default: null, [breakpoints.DESKTOP]: 'size' },
    maxBlockSize: { default: null, [breakpoints.DESKTOP]: `calc(100dvh - ${shell.chromeBlock})` },
  },
  frame: { blockSize: '100%', display: 'flex', flexDirection: 'column' },
  head: { display: { default: 'block', [breakpoints.DESKTOP]: 'none' }, flexShrink: 0 },
  headBar: {
    alignItems: 'center',
    blockSize: shell.narrowChromeBlock,
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    paddingInlineEnd: space['--ult-space-4'],
    paddingInlineStart: shell.narrowEdge,
  },
  wordmark: { display: 'block', height: text['--ult-text-8'], width: 'auto' },
  close: { height: space['--ult-space-10'], inlineSize: space['--ult-space-10'], paddingInline: 0 },
  scroll: { flexGrow: 1, minBlockSize: 0 },
  content: {
    paddingBlockEnd: space['--ult-space-10'],
    paddingBlockStart: space['--ult-space-8'],
    paddingInline: `calc(${shell.edge} - ${space['--ult-space-4']})`,
  },
  groupLabel: { fontFamily: font['--ult-font-mono'] },
  number: {
    color: color['--ult-color-text-subtle'],
    flexShrink: 0,
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
  },
});

export function SiteMenu() {
  return (
    <Sidebar.Panel aria-label={MENU_LABEL} style={[styles.panel, styles.fillRow]}>
      <div {...stylex.props(styles.frame)}>
        <div {...stylex.props(styles.head)}>
          <div {...stylex.props(styles.headBar)}>
            <BrandLogo alt="" style={styles.wordmark} />
            <Sidebar.Close
              render={<Button variant="ghost" aria-label="Close navigation" style={[docsStyles.square, styles.close]} />}
            >
              <Icon><XIcon /></Icon>
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
                  <MenuList links={group.links} />
                </Sidebar.Group>
              ))}
            </ScrollArea.Content>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </div>
    </Sidebar.Panel>
  );
}

function MenuList({ links }: { links: NavLink[] }) {
  return (
    <Sidebar.List>
      {links.map((link) => (
        <MenuLink key={link.label} link={link} />
      ))}
    </Sidebar.List>
  );
}

function MenuLink({ link: { label, number, ...destination } }: { link: NavLink }) {
  return (
    <Sidebar.Item>
      <Sidebar.Link render={<Link {...destination} activeOptions={{ exact: true }} />}>
        {number && (
          <span aria-hidden {...stylex.props(styles.number)}>
            {number}
          </span>
        )}
        {label}
      </Sidebar.Link>
    </Sidebar.Item>
  );
}
