import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Command } from '@ultima/ui';
import { useRef } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '24rem',
    inlineSize: 'min(28rem, 100cqi)',
    isolation: 'isolate',
    position: 'relative',
  },
  popup: { width: `calc(5 * ${space['--ult-space-12']})` },
  group: { margin: space['--ult-space-2'] },
});

const ignoreViewportCollisions = { side: 'none', fallbackAxisSide: 'none' } as const;
const groups = [
  { label: 'File', items: ['New file', 'Open report'] },
  { label: 'View', items: ['Toggle sidebar', 'Close window'] },
];

/**
 * Base UI's popup is always modal while the Input sits outside it, as in the anchored arrangement.
 * With the Input inside, Base UI anchors to the Trigger, a button rather than a typeable combobox,
 * and the focus manager follows the root's `modal`, so a non-modal root hides nothing.
 */
export default function CommandAnatomy() {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} {...stylex.props(styles.stage)}>
      <Command.Root open items={groups} modal={false}>
        <Command.Trigger aria-label="Search actions" render={<Button variant="outline" />}>
          Search actions
          <Command.Icon />
        </Command.Trigger>
        <Command.Portal container={stage}>
          <Command.Positioner collisionAvoidance={ignoreViewportCollisions} sideOffset={8} align="start">
            <Command.Popup aria-label="Actions" initialFocus={false} finalFocus={false} style={styles.popup}>
              <Command.Arrow />
              <Command.InputGroup style={styles.group}>
                <Command.Input aria-label="Filter actions" placeholder="Filter actions" />
              </Command.InputGroup>
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
            </Command.Popup>
          </Command.Positioner>
        </Command.Portal>
      </Command.Root>
    </div>
  );
}
