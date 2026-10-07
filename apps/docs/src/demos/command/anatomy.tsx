import * as stylex from '@stylexjs/stylex';
import { color, radius, space } from '@ultima/tokens/tokens.stylex';
import { Command } from '@ultima/ui';

const styles = stylex.create({
  box: {
    inlineSize: `min(calc(6 * ${space['--ult-space-12']}), 100cqi)`,
  },
  surface: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-md'],
    marginBlockStart: space['--ult-space-3'],
  },
});

const groups = [
  { label: 'File', items: ['New file', 'Open report', 'Export PDF'] },
  { label: 'View', items: ['Toggle sidebar', 'Duplicate tab', 'Close window'] },
];

/**
 * The anchored popup can't be held open here: Base UI hides everything outside an open typeable
 * combobox from assistive tech, modal or not, which would take the legend with it. The inline
 * arrangement renders the same list in flow.
 */
export default function CommandAnatomy() {
  return (
    <div {...stylex.props(styles.box)}>
      <Command.Root open inline items={groups} defaultValue="e">
        <Command.InputGroup>
          <Command.Input aria-label="Actions" placeholder="Search actions" />
          <Command.Clear aria-label="Clear actions" />
        </Command.InputGroup>
        <div {...stylex.props(styles.surface)}>
          <Command.List>
            {(group: { label: string; items: string[] }) => (
              <Command.Group key={group.label} items={group.items}>
                <Command.GroupLabel>{group.label}</Command.GroupLabel>
                <Command.Collection>
                  {(action: string) => (
                    <Command.Item key={action} value={action}>
                      {action}
                    </Command.Item>
                  )}
                </Command.Collection>
              </Command.Group>
            )}
          </Command.List>
        </div>
      </Command.Root>
    </div>
  );
}
