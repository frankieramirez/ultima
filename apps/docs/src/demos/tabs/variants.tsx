import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Tabs } from '@ultima/ui';

const styles = stylex.create({
  stack: {
    display: 'grid',
    gap: space['--ult-space-8'],
  },
});

export default function Variants() {
  return (
    <div {...stylex.props(styles.stack)}>
      <Tabs.Root defaultValue="overview">
        <Tabs.List aria-label="Underline example">
          <Tabs.Tab value="overview">Overview</Tabs.Tab>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
          <Tabs.Tab value="settings" disabled>Settings</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Panel value="overview">A quick view of the project.</Tabs.Panel>
        <Tabs.Panel value="activity">Recent project activity.</Tabs.Panel>
        <Tabs.Panel value="settings">Project settings.</Tabs.Panel>
      </Tabs.Root>

      <Tabs.Root variant="segmented" defaultValue="monthly">
        <Tabs.List aria-label="Segmented example">
          <Tabs.Tab value="weekly">Weekly</Tabs.Tab>
          <Tabs.Tab value="monthly">Monthly</Tabs.Tab>
          <Tabs.Tab value="yearly">Yearly</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
        <Tabs.Panel value="weekly">Weekly usage.</Tabs.Panel>
        <Tabs.Panel value="monthly">Monthly usage.</Tabs.Panel>
        <Tabs.Panel value="yearly">Yearly usage.</Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
