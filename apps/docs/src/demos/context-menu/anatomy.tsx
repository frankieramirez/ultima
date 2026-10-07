import { ArchiveIcon, LinkSimpleIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import * as stylex from '@stylexjs/stylex';
import { color, text } from '@ultima/tokens/tokens.stylex';
import { ContextMenu, DropdownMenu } from '@ultima/ui';
import { useRef } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '16rem',
    inlineSize: 'min(28rem, 100cqi)',
    isolation: 'isolate',
    position: 'relative',
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

const ignoreViewportCollisions = { side: 'none', fallbackAxisSide: 'none' } as const;

/**
 * A context menu's popup is always modal, so Dropdown Menu's root, which shares its parts, holds the
 * popup open beside a closed context menu's trigger without trapping focus.
 */
export default function ContextMenuAnatomy() {
  const stage = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} {...stylex.props(styles.stage)}>
      <ContextMenu.Root>
        <ContextMenu.Trigger ref={trigger} {...stylex.props(styles.target)}>
          Quarterly report
          <span {...stylex.props(styles.hint)}> — right click me</span>
        </ContextMenu.Trigger>
      </ContextMenu.Root>
      <DropdownMenu.Root open modal={false}>
        <ContextMenu.Portal container={stage}>
          <ContextMenu.Positioner
            anchor={trigger}
            align="start"
            sideOffset={8}
            collisionAvoidance={ignoreViewportCollisions}
          >
            <ContextMenu.Popup aria-label="Quarterly report" finalFocus={false}>
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
      </DropdownMenu.Root>
    </div>
  );
}
