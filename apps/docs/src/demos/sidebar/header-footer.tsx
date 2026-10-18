import { ChevronsUpDownIcon, HouseIcon, InboxIcon, LayersIcon } from 'lucide-react';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Avatar, Button, Icon, Sidebar } from '@ultima/ui';

const styles = stylex.create({
  panel: { blockSize: `calc(6 * ${space['--ult-space-12']})` },
  grow: { flexGrow: 1, minInlineSize: 0 },
  brand: { color: color['--ult-color-text'], flexGrow: 1, fontWeight: font['--ult-font-weight-semibold'] },
  name: { color: color['--ult-color-text'] },
  person: { display: 'flex', flexDirection: 'column', flexGrow: 1, minInlineSize: 0 },
  email: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
    overflowWrap: 'anywhere',
  },
});

export default function SidebarHeaderFooter() {
  return (
    <Sidebar.Root>
      <Sidebar.Trigger render={<Button variant="ghost" />}>Toggle the workspace</Sidebar.Trigger>
      <Sidebar.Panel aria-label="Workspace" style={styles.panel}>
        <Sidebar.Header>
          <Sidebar.Button aria-label="Switch workspace, Acme">
            <Icon><LayersIcon /></Icon>
            <span {...stylex.props(styles.brand)}>Acme</span>
            <Icon><ChevronsUpDownIcon /></Icon>
          </Sidebar.Button>
        </Sidebar.Header>
        <Sidebar.Group>
          <Sidebar.List>
            <Sidebar.Item>
              <Sidebar.Link href="#home" active>
                <Icon><HouseIcon /></Icon>
                <span {...stylex.props(styles.grow)}>Home</span>
              </Sidebar.Link>
            </Sidebar.Item>
            <Sidebar.Item>
              <Sidebar.Link href="#inbox">
                <Icon><InboxIcon /></Icon>
                <span {...stylex.props(styles.grow)}>Inbox</span>
              </Sidebar.Link>
            </Sidebar.Item>
          </Sidebar.List>
        </Sidebar.Group>
        <Sidebar.Footer>
          <Sidebar.Button aria-label="Account, Frankie">
            <Avatar.Root aria-hidden="true">
              <Avatar.Fallback>FR</Avatar.Fallback>
            </Avatar.Root>
            <span {...stylex.props(styles.person)}>
              <span {...stylex.props(styles.name)}>Frankie</span>
              <span {...stylex.props(styles.email)}>frankie@ultima.systems</span>
            </span>
            <Icon><ChevronsUpDownIcon /></Icon>
          </Sidebar.Button>
        </Sidebar.Footer>
      </Sidebar.Panel>
    </Sidebar.Root>
  );
}
