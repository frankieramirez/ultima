import { ArchiveIcon, DotsThreeIcon, LinkSimpleIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, ContextMenu, DropdownMenu } from '@ultima/ui';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
    justifyContent: 'space-between',
  },
  target: {
    fontSize: text['--ult-text-4'],
    userSelect: 'none',
  },
  hint: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
  },
});

export default function ContextMenuActions() {
  return (
    <div {...stylex.props(styles.row)}>
      <ContextMenu.Root>
        <ContextMenu.Trigger {...stylex.props(styles.target)}>
          Quarterly report
          <span {...stylex.props(styles.hint)}> — right click me</span>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Backdrop />
          <ContextMenu.Positioner>
            <ContextMenu.Popup aria-label="Quarterly report">
              <ContextMenu.Item>
                <PencilSimpleIcon />
                Rename
              </ContextMenu.Item>
              <ContextMenu.LinkItem href="https://base-ui.com/react/components/context-menu">
                <LinkSimpleIcon />
                Base UI docs
              </ContextMenu.LinkItem>
              <ContextMenu.Separator />
              <ContextMenu.Item>
                <ArchiveIcon />
                Archive
              </ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger render={<Button variant="ghost" size="sm" aria-label="Quarterly report actions" />}>
          <DotsThreeIcon />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Positioner sideOffset={8}>
            <DropdownMenu.Popup>
              <DropdownMenu.Item>
                <PencilSimpleIcon />
                Rename
              </DropdownMenu.Item>
              <DropdownMenu.LinkItem href="https://base-ui.com/react/components/context-menu">
                <LinkSimpleIcon />
                Base UI docs
              </DropdownMenu.LinkItem>
              <DropdownMenu.Separator />
              <DropdownMenu.Item>
                <ArchiveIcon />
                Archive
              </DropdownMenu.Item>
            </DropdownMenu.Popup>
          </DropdownMenu.Positioner>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
