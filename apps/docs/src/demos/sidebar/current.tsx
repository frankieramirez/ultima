import { Sidebar } from '@ultima/ui';

export default function SidebarCurrent() {
  return (
    <Sidebar.Root>
      <Sidebar.Panel aria-label="Current page">
        <Sidebar.List>
          <Sidebar.Item>
            <Sidebar.Link href="#tokens">Tokens</Sidebar.Link>
          </Sidebar.Item>
          <Sidebar.Item>
            <Sidebar.Link href="#palette" active>
              Palette
            </Sidebar.Link>
          </Sidebar.Item>
          <Sidebar.Item>
            <Sidebar.Link href="#components">Components</Sidebar.Link>
          </Sidebar.Item>
        </Sidebar.List>
      </Sidebar.Panel>
    </Sidebar.Root>
  );
}
