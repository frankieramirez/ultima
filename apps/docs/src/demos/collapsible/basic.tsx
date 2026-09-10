import { Button, Collapsible } from '@ultima/ui';

export default function BasicCollapsible() {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger render={<Button variant="ghost" />}>Recent changes</Collapsible.Trigger>
      <Collapsible.Panel>
        <p>Meter moved its tone onto Root. Table gained a scroll region. Sidebar landed.</p>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
