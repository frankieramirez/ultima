import { ArchiveIcon, LinkSimpleIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import { Button, DropdownMenu } from '@ultima/ui';

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
                  <PencilSimpleIcon />
                  Rename
                </DropdownMenu.Item>
                <DropdownMenu.LinkItem href="https://base-ui.com/react/components/menu">
                  <LinkSimpleIcon />
                  Base UI docs
                </DropdownMenu.LinkItem>
                <DropdownMenu.Item disabled>Delete</DropdownMenu.Item>
              </DropdownMenu.Group>
              <DropdownMenu.Separator />
              <DropdownMenu.CheckboxItem defaultChecked>
                Show archived
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
                  <ArchiveIcon />
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
            </DropdownMenu.Viewport>
          </DropdownMenu.Popup>
        </DropdownMenu.Positioner>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
