import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Command, Field } from '@ultima/ui';

const styles = stylex.create({
  box: {
    maxWidth: `calc(6 * ${space['--ult-space-12']})`,
  },
});

const actions = [
  'Open report',
  'Duplicate tab',
  'Toggle sidebar',
  'New file',
  'Close window',
  'Export PDF',
];

export default function CommandAnchored() {
  return (
    <div {...stylex.props(styles.box)}>
      <Field.Root name="actions">
        <Field.Label>Actions</Field.Label>
        <Command.Root items={actions}>
          <Command.InputGroup>
            <Command.Input placeholder="Search actions" />
            <Command.Clear aria-label="Clear actions" />
            <Command.Trigger aria-label="Open actions">
              <Command.Icon />
            </Command.Trigger>
          </Command.InputGroup>
          <Command.Portal>
            <Command.Positioner sideOffset={4}>
              <Command.Popup>
                <Command.Arrow />
                <Command.Empty>No action matches that search.</Command.Empty>
                <Command.List>
                  {(action: string) => (
                    <Command.Item key={action} value={action}>
                      {action}
                    </Command.Item>
                  )}
                </Command.List>
              </Command.Popup>
            </Command.Positioner>
          </Command.Portal>
        </Command.Root>
        <Field.Description>Typing filters the list in the popup; Enter runs the highlighted action.</Field.Description>
      </Field.Root>
    </div>
  );
}
