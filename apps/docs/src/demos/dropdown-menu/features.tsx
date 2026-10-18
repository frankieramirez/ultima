import { ArchiveIcon, CopyIcon, LinkIcon, PencilIcon, TrashIcon } from 'lucide-react';
import { Button, DropdownMenu, Icon } from '@ultima/ui';

export default function MenuFeatures() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger render={<Button />}>Actions</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Backdrop />
        <DropdownMenu.Positioner sideOffset={8}>
          <DropdownMenu.Popup>
            <DropdownMenu.Arrow />
            <DropdownMenu.Viewport>
              <DropdownMenu.Group>
                <DropdownMenu.GroupLabel>Document</DropdownMenu.GroupLabel>
                <DropdownMenu.Item>
                  <Icon><PencilIcon /></Icon>
                  Rename
                  <DropdownMenu.Shortcut>F2</DropdownMenu.Shortcut>
                </DropdownMenu.Item>
                <DropdownMenu.Item disabled>
                  <Icon><CopyIcon /></Icon>
                  Duplicate
                  <DropdownMenu.Shortcut>⌘D</DropdownMenu.Shortcut>
                </DropdownMenu.Item>
                <DropdownMenu.LinkItem href="https://base-ui.com/react/components/menu">
                  <Icon><LinkIcon /></Icon>
                  Base UI docs
                </DropdownMenu.LinkItem>
              </DropdownMenu.Group>
              <DropdownMenu.Separator />
              <DropdownMenu.CheckboxItem defaultChecked>
                Show archived
                <DropdownMenu.Shortcut>⇧⌘A</DropdownMenu.Shortcut>
                <DropdownMenu.CheckboxItemIndicator />
              </DropdownMenu.CheckboxItem>
              <DropdownMenu.RadioGroup defaultValue="comfortable">
                <DropdownMenu.RadioItem value="comfortable">
                  Comfortable
                  <DropdownMenu.RadioItemIndicator />
                </DropdownMenu.RadioItem>
                <DropdownMenu.RadioItem value="compact">
                  Compact
                  <DropdownMenu.RadioItemIndicator />
                </DropdownMenu.RadioItem>
              </DropdownMenu.RadioGroup>
              <DropdownMenu.Separator />
              <DropdownMenu.SubmenuRoot>
                <DropdownMenu.SubmenuTrigger>
                  <Icon><ArchiveIcon /></Icon>
                  Move to
                </DropdownMenu.SubmenuTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Positioner sideOffset={4}>
                    <DropdownMenu.Popup>
                      <DropdownMenu.Item>Archive</DropdownMenu.Item>
                      <DropdownMenu.Item>Backlog</DropdownMenu.Item>
                    </DropdownMenu.Popup>
                  </DropdownMenu.Positioner>
                </DropdownMenu.Portal>
              </DropdownMenu.SubmenuRoot>
              <DropdownMenu.Separator />
              <DropdownMenu.Item tone="danger">
                <Icon><TrashIcon /></Icon>
                Delete
                <DropdownMenu.Shortcut>⌘⌫</DropdownMenu.Shortcut>
              </DropdownMenu.Item>
            </DropdownMenu.Viewport>
          </DropdownMenu.Popup>
        </DropdownMenu.Positioner>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
