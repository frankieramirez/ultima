import { Breadcrumb, Button, DropdownMenu } from '@ultima/ui';

export default function CollapsedTrail() {
  return (
    <Breadcrumb.Root aria-label="Collapsed trail">
      <Breadcrumb.List>
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/">Home</Breadcrumb.Link>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              render={<Button variant="ghost" size="sm" aria-label="Show 2 hidden crumbs" />}
            >
              ...
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Positioner sideOffset={8}>
                <DropdownMenu.Popup>
                  <DropdownMenu.LinkItem href="/docs">Documentation</DropdownMenu.LinkItem>
                  <DropdownMenu.LinkItem href="/docs/spec">Specification</DropdownMenu.LinkItem>
                </DropdownMenu.Popup>
              </DropdownMenu.Positioner>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </Breadcrumb.Item>
        <Breadcrumb.Separator />
        <Breadcrumb.Item>
          <Breadcrumb.Link href="/docs/spec/components" active>
            Components
          </Breadcrumb.Link>
        </Breadcrumb.Item>
      </Breadcrumb.List>
    </Breadcrumb.Root>
  );
}
