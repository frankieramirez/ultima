import * as stylex from '@stylexjs/stylex';
import { color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { Command } from '@ultima/ui';

const styles = stylex.create({
  box: {
    maxWidth: `calc(6 * ${space['--ult-space-12']})`,
  },
  label: {
    display: 'grid',
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    gap: space['--ult-space-3'],
    marginBlockEnd: space['--ult-space-3'],
  },
  surface: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderRadius: radius['--ult-radius-md'],
  },
});

const groups = [
  { label: 'File', items: ['New file', 'Open report', 'Export PDF'] },
  { label: 'View', items: ['Toggle sidebar', 'Duplicate tab', 'Close window'] },
];

export default function CommandInline() {
  return (
    <div {...stylex.props(styles.box)}>
      <label htmlFor="inline-actions" {...stylex.props(styles.label)}>
        Actions
      </label>
      <Command.Root open inline items={groups}>
        <Command.InputGroup>
          <Command.Input id="inline-actions" placeholder="Search actions" />
          <Command.Clear aria-label="Clear actions" />
        </Command.InputGroup>
        <div {...stylex.props(styles.surface)}>
          <Command.Empty>No action matches that search.</Command.Empty>
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
