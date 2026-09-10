import { Button, Sidebar } from '@ultima/ui';

export default function SidebarParts() {
  return (
    <Sidebar.Root>
      <Sidebar.Trigger render={<Button variant="ghost" />}>Toggle the parts</Sidebar.Trigger>
      <Sidebar.Panel aria-label="Sidebar parts">
        <Sidebar.Group>
          <Sidebar.GroupLabel>Reference</Sidebar.GroupLabel>
          <Sidebar.List>
            <Sidebar.Item>
              <Sidebar.Link href="#tokens">Tokens</Sidebar.Link>
            </Sidebar.Item>
            <Sidebar.Item>
              <Sidebar.Link href="#palette">Palette</Sidebar.Link>
            </Sidebar.Item>
          </Sidebar.List>
        </Sidebar.Group>
        <Sidebar.Group>
          <Sidebar.GroupLabel>Build</Sidebar.GroupLabel>
          <Sidebar.List>
            <Sidebar.Item>
              <Sidebar.Link href="#install">Install</Sidebar.Link>
            </Sidebar.Item>
            <Sidebar.Item>
              <Sidebar.Button>Copy the manifest</Sidebar.Button>
            </Sidebar.Item>
          </Sidebar.List>
        </Sidebar.Group>
        <Sidebar.Close render={<Button variant="ghost" />}>Close the parts</Sidebar.Close>
      </Sidebar.Panel>
    </Sidebar.Root>
  );
}
