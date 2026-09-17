import * as stylex from '@stylexjs/stylex';
import { space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Popover } from '@ultima/ui';

const styles = stylex.create({
  list: {
    display: 'grid',
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-2'],
    margin: 0,
    paddingInlineStart: space['--ult-space-5'],
  },
});

export default function UnnamedPopover() {
  return (
    <Popover.Root>
      <Popover.Trigger render={<Button variant="outline" />}>Active filters</Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup aria-label="Active filters">
            <Popover.Arrow />
            <ul {...stylex.props(styles.list)}>
              <li>Released in v0.2</li>
              <li>Has a documented demo</li>
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
