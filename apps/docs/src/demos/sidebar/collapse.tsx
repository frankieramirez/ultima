import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Sidebar } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'start',
    display: 'flex',
    gap: space['--ult-space-6'],
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-4'],
    minInlineSize: 0,
  },
});

export default function SidebarCollapse() {
  return (
    <Sidebar.Root style={styles.row}>
      <Sidebar.Panel aria-label="Collapsing navigation">
        <Sidebar.List>
          <Sidebar.Item>
            <Sidebar.Link href="#tokens" active>
              Tokens
            </Sidebar.Link>
          </Sidebar.Item>
          <Sidebar.Item>
            <Sidebar.Link href="#palette">Palette</Sidebar.Link>
          </Sidebar.Item>
        </Sidebar.List>
      </Sidebar.Panel>
      <div {...stylex.props(styles.content)}>
        <Sidebar.Trigger render={<Button variant="ghost" />}>Toggle the collapsing navigation</Sidebar.Trigger>
        <p>
          The panel animates its inline size, so collapsing it reflows the page beside it rather than sliding a box off
          the edge.
        </p>
      </div>
    </Sidebar.Root>
  );
}
