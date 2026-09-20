import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Command, Dialog, ScrollArea } from '@ultima/ui';
import { useEffect, useState } from 'react';

const styles = stylex.create({
  demo: {
    display: 'grid',
    gap: space['--ult-space-3'],
    justifyItems: 'start',
  },
  viewport: {
    placeItems: 'start center',
    paddingBlockStart: space['--ult-space-9'],
  },
  popup: {
    maxWidth: `min(calc(6 * ${space['--ult-space-12']}), 100%)`,
    overflow: 'hidden',
    padding: 0,
    position: 'relative',
    width: '100%',
  },
  hiddenTitle: {
    borderWidth: 0,
    clip: 'rect(0 0 0 0)',
    height: '1px',
    margin: '-1px',
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  },
  close: {
    clip: { default: 'rect(0 0 0 0)', ':focus': 'auto' },
    height: { default: '1px', ':focus': 'auto' },
    margin: { default: '-1px', ':focus': 0 },
    overflow: { default: 'hidden', ':focus': 'visible' },
    position: 'absolute',
    insetBlockStart: space['--ult-space-3'],
    insetInlineEnd: space['--ult-space-3'],
    whiteSpace: { default: 'nowrap', ':focus': 'normal' },
    width: { default: '1px', ':focus': 'auto' },
    zIndex: 1,
  },
  inputRow: {
    padding: space['--ult-space-3'],
  },
  scrollArea: {
    maxHeight: `calc(4 * ${space['--ult-space-12']})`,
  },
  footer: {
    borderTopColor: color['--ult-color-border'],
    borderTopStyle: 'solid',
    borderTopWidth: border.hairline,
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-4'],
  },
  hint: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: space['--ult-space-2'],
  },
  kbd: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    paddingBlock: space['--ult-space-1'],
    paddingInline: space['--ult-space-2'],
  },
  lastRun: {
    color: color['--ult-color-text-muted'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
});

const groups = [
  { label: 'File', items: ['New file', 'Open report', 'Export PDF'] },
  { label: 'View', items: ['Toggle sidebar', 'Duplicate tab', 'Close window'] },
  { label: 'Go to', items: ['Components', 'Tokens', 'Palette', 'Accessibility'] },
];

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

export default function CommandDialog() {
  const [open, setOpen] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function run(action: string) {
    setLastRun(action);
    setOpen(false);
  }

  return (
    <div {...stylex.props(styles.demo)}>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger render={<Button variant="outline" />}>
          <span {...stylex.props(styles.hint)}>
            Search actions
            <kbd {...stylex.props(styles.kbd)}>{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
          </span>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop forceRender />
          <Dialog.Viewport style={styles.viewport}>
            <Dialog.Popup style={styles.popup}>
              <Dialog.Title style={styles.hiddenTitle}>Command menu</Dialog.Title>
              <Command.Root open inline items={groups} autoHighlight="always" keepHighlight>
                <div {...stylex.props(styles.inputRow)}>
                  <Command.InputGroup>
                    <Command.Input aria-label="Search actions" placeholder="Search actions" />
                  </Command.InputGroup>
                </div>
                <Dialog.Close render={<Button variant="ghost" size="sm" style={styles.close} />}>
                  Close
                </Dialog.Close>
                <ScrollArea.Root>
                  <ScrollArea.Viewport style={styles.scrollArea}>
                    <ScrollArea.Content>
                      <Command.Empty>No action matches that search.</Command.Empty>
                      <Command.List>
                        {(group: { label: string; items: string[] }) => (
                          <Command.Group key={group.label} items={group.items}>
                            <Command.GroupLabel>{group.label}</Command.GroupLabel>
                            <Command.Collection>
                              {(action: string) => (
                                <Command.Item key={action} value={action} onClick={() => run(action)}>
                                  {action}
                                </Command.Item>
                              )}
                            </Command.Collection>
                          </Command.Group>
                        )}
                      </Command.List>
                    </ScrollArea.Content>
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar>
                    <ScrollArea.Thumb />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>
              </Command.Root>
              <div {...stylex.props(styles.footer)}>
                <span {...stylex.props(styles.hint)}>
                  <kbd {...stylex.props(styles.kbd)}>Enter</kbd> Activate
                </span>
                <span {...stylex.props(styles.hint)}>
                  <kbd {...stylex.props(styles.kbd)}>Esc</kbd> Close
                </span>
              </div>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
      <p {...stylex.props(styles.lastRun)}>
        {lastRun ? `Ran “${lastRun}”` : 'No action run yet.'}
      </p>
    </div>
  );
}
