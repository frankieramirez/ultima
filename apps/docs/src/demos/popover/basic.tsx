import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Popover } from '@ultima/ui';

const styles = stylex.create({
  body: {
    display: 'grid',
    gap: space['--ult-space-4'],
    justifyItems: 'start',
  },
});

export default function BasicPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger render={<Button />}>Share report</Popover.Trigger>
      <Popover.Portal>
        <Popover.Backdrop />
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup>
            <Popover.Arrow />
            <div {...stylex.props(styles.body)}>
              <Popover.Title>Share this report</Popover.Title>
              <Popover.Description>
                Anyone with the link can read the report. Nobody can edit it.
              </Popover.Description>
              <Popover.Close render={<Button variant="ghost" size="sm" />}>Done</Popover.Close>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
