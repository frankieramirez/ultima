import * as stylex from '@stylexjs/stylex';
import { Button, Sidebar } from '@ultima/ui';

const styles = stylex.create({
  panel: {
    blockSize: '12rem',
  },
});

const pages = [
  'Button',
  'Badge',
  'Card',
  'Table',
  'Tabs',
  'Meter',
  'Stat',
  'Code',
  'Tooltip',
  'Dialog',
  'Dropdown Menu',
  'Select',
  'Input',
  'Switch',
  'Sidebar',
  'Collapsible',
];

export default function SidebarScroll() {
  return (
    <Sidebar.Root>
      <Sidebar.Trigger render={<Button variant="ghost" />}>Toggle the catalogue</Sidebar.Trigger>
      <Sidebar.Panel aria-label="Scrolling catalogue" style={styles.panel}>
        <Sidebar.List>
          {pages.map((page) => (
            <Sidebar.Item key={page}>
              <Sidebar.Link href={`#${page.toLowerCase().replace(' ', '-')}`}>{page}</Sidebar.Link>
            </Sidebar.Item>
          ))}
        </Sidebar.List>
      </Sidebar.Panel>
    </Sidebar.Root>
  );
}
