import { Button, DropdownMenu, Menubar } from '@ultima/ui';

export default function MenubarDocument() {
  return (
    <Menubar aria-label="Document">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" />}>File</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Positioner sideOffset={8}>
            <DropdownMenu.Popup>
              <DropdownMenu.Item>
                New
                <DropdownMenu.Shortcut>⌘N</DropdownMenu.Shortcut>
              </DropdownMenu.Item>
              <DropdownMenu.SubmenuRoot>
                <DropdownMenu.SubmenuTrigger>Open recent</DropdownMenu.SubmenuTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Positioner>
                    <DropdownMenu.Popup>
                      <DropdownMenu.Item>Quarterly report</DropdownMenu.Item>
                      <DropdownMenu.Item>Release notes</DropdownMenu.Item>
                    </DropdownMenu.Popup>
                  </DropdownMenu.Positioner>
                </DropdownMenu.Portal>
              </DropdownMenu.SubmenuRoot>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>
                Save
                <DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>
              </DropdownMenu.Item>
            </DropdownMenu.Popup>
          </DropdownMenu.Positioner>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" />}>Edit</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Positioner sideOffset={8}>
            <DropdownMenu.Popup>
              <DropdownMenu.Item>
                Undo
                <DropdownMenu.Shortcut>⌘Z</DropdownMenu.Shortcut>
              </DropdownMenu.Item>
              <DropdownMenu.Item disabled>
                Redo
                <DropdownMenu.Shortcut>⇧⌘Z</DropdownMenu.Shortcut>
              </DropdownMenu.Item>
            </DropdownMenu.Popup>
          </DropdownMenu.Positioner>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" />}>View</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Positioner sideOffset={8}>
            <DropdownMenu.Popup>
              <DropdownMenu.CheckboxItem defaultChecked>
                <DropdownMenu.CheckboxItemIndicator />
                Show sidebar
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.Item>
                Zoom in
                <DropdownMenu.Shortcut>⌘+</DropdownMenu.Shortcut>
              </DropdownMenu.Item>
              <DropdownMenu.Item>
                Zoom out
                <DropdownMenu.Shortcut>⌘−</DropdownMenu.Shortcut>
              </DropdownMenu.Item>
            </DropdownMenu.Popup>
          </DropdownMenu.Positioner>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" />}>Help</DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Positioner sideOffset={8}>
            <DropdownMenu.Popup>
              <DropdownMenu.LinkItem href="https://base-ui.com/react/components/menubar">Base UI docs</DropdownMenu.LinkItem>
              <DropdownMenu.Item>About</DropdownMenu.Item>
            </DropdownMenu.Popup>
          </DropdownMenu.Positioner>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </Menubar>
  );
}
