import { Collapsible, Sidebar } from '@ultima/ui';

export default function SidebarNested() {
  return (
    <Sidebar.Root>
      <Sidebar.Panel aria-label="Nested groups">
        <Sidebar.List>
          <Sidebar.Item>
            <Sidebar.Link href="#install">Install</Sidebar.Link>
          </Sidebar.Item>
          <Collapsible.Root defaultOpen render={<Sidebar.Item />}>
            <Collapsible.Trigger render={<Sidebar.Button />}>Components</Collapsible.Trigger>
            <Collapsible.Panel>
              <Sidebar.List>
                <Sidebar.Item>
                  <Sidebar.Link href="#button">Button</Sidebar.Link>
                </Sidebar.Item>
                <Sidebar.Item>
                  <Sidebar.Link href="#card">Card</Sidebar.Link>
                </Sidebar.Item>
                <Sidebar.Item>
                  <Sidebar.Link href="#table">Table</Sidebar.Link>
                </Sidebar.Item>
              </Sidebar.List>
            </Collapsible.Panel>
          </Collapsible.Root>
        </Sidebar.List>
      </Sidebar.Panel>
    </Sidebar.Root>
  );
}
