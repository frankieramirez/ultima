import { ArrowUpRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button, Command, Dialog, ScrollArea, Separator } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { useEffect, useMemo, useState } from 'react';

import { breakpoints } from './breakpoints.stylex';
import { components } from './components';
import { docsStyles } from './docs-style';
import { pages } from './navigation';
import { useTheme, type ThemePreference } from './theme';

const styles = stylex.create({
  trigger: {
    borderRadius: 0,
    justifyContent: { default: 'center', [breakpoints.DESKTOP]: 'space-between' },
    inlineSize: { default: '2rem', [breakpoints.DESKTOP]: '16.25rem' },
    fontSize: text['--ult-text-4'],
    color: color['--ult-color-text-muted'],
    paddingInline: { default: space['--ult-space-2'], [breakpoints.DESKTOP]: space['--ult-space-5'] },
    flexShrink: 0,
  },
  searchIcon: { inlineSize: space['--ult-space-7'], blockSize: space['--ult-space-7'], flexShrink: 0 },
  label: { display: { default: 'none', [breakpoints.DESKTOP]: 'inline' } },
  shortcut: {
    display: { default: 'none', [breakpoints.DESKTOP]: 'inline' },
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
  },
  viewport: {
    placeItems: 'start center',
    paddingBlockStart: {
      default: space['--ult-space-9'],
      [breakpoints.WIDE]: '15vh',
    },
  },
  popup: {
    borderRadius: 0,
    padding: 0,
    width: '100%',
    maxWidth: '43.75rem',
    overflow: 'hidden',
  },
  input: { borderRadius: 0, fontSize: text['--ult-text-6'] },
  inputGroup: {
    borderRadius: 0,
    borderWidth: 0,
    padding: space['--ult-space-6'],
    gap: space['--ult-space-5'],
    minBlockSize: space['--ult-space-12'],
  },
  list: { padding: space['--ult-space-4'] },
  groupLabel: {
    paddingInline: space['--ult-space-5'],
    paddingBlock: space['--ult-space-4'],
    fontSize: text['--ult-text-2'],
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space['--ult-space-5'],
    minBlockSize: space['--ult-space-10'],
    paddingInline: space['--ult-space-5'],
    paddingBlock: space['--ult-space-4'],
    borderRadius: 0,
  },
  scroll: { maxBlockSize: 'min(55dvh, 30rem)' },
  footer: {
    display: 'flex',
    gap: space['--ult-space-7'],
    padding: space['--ult-space-6'],
    fontSize: text['--ult-text-2'],
    color: color['--ult-color-text-muted'],
  },
  escape: {
    marginInlineStart: 'auto',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
  },
});

type SearchItem = { label: string; to?: string; preference?: ThemePreference };
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/i.test(navigator.userAgent);

export function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { setPreference } = useTheme();
  const groups = useMemo(
    () => [
      {
        label: 'Go to',
        items: pages
          .filter(
            ({ to }) =>
              query.trim() ||
              ['/install', '/components', '/theme-studio', '/tokens'].includes(
                to,
              ),
          )
          .map(({ label, to }) => ({
            label:
              label === 'Install'
                ? 'Installation guide'
                : label === 'Studio'
                  ? 'Theme studio'
                  : label,
            to,
          })),
      },
      {
        label: 'Components',
        items: (query.trim() ? [...components] : [])
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(({ name, item }) => ({
            label: name,
            to: `/components/${item}`,
          })),
      },
      {
        label: 'Appearance',
        items: [
          { label: 'Use dark mode', preference: 'dark' },
          { label: 'Use light mode', preference: 'light' },
          { label: 'Use system appearance', preference: 'system' },
        ] as SearchItem[],
      },
    ],
    [query],
  );
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        const isComponentPreview = (event.target as Element | null)?.closest(
          '[data-component-preview]',
        );
        if (isComponentPreview) return;
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, []);
  const run = (item: SearchItem) => {
    setOpen(false);
    setQuery('');
    if (item.preference) setPreference(item.preference);
    else if (item.to) void navigate({ to: item.to });
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            aria-label="Search Ultima"
            variant="outline"
            size="sm"
            style={styles.trigger}
          />
        }
      >
        <MagnifyingGlassIcon aria-hidden {...stylex.props(styles.searchIcon)} />
        <span {...stylex.props(styles.label)}>Search Ultima…</span>
        <kbd {...stylex.props(styles.shortcut)}>{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender />
        <Dialog.Viewport style={styles.viewport}>
          <Dialog.Popup style={styles.popup}>
            <Dialog.Title style={visuallyHidden}>Search Ultima</Dialog.Title>
            <Command.Root
              open
              inline
              value={query}
              onValueChange={setQuery}
              items={groups}
              itemToStringValue={(item: SearchItem) => item.label}
              autoHighlight="always"
              keepHighlight
            >
              <Command.InputGroup style={styles.inputGroup}>
                <MagnifyingGlassIcon aria-hidden />
                <Command.Input
                  aria-label="Search pages and components"
                  placeholder="Search pages and components…"
                  style={styles.input}
                />
                <Dialog.Close
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      style={[docsStyles.square, styles.escape]}
                    />
                  }
                >
                  Esc
                </Dialog.Close>
              </Command.InputGroup>
              <Separator />
              <ScrollArea.Root>
                <ScrollArea.Viewport style={styles.scroll}>
                  <ScrollArea.Content>
                    <Command.Empty>
                      No pages or components match that search.
                    </Command.Empty>
                    <Command.List style={styles.list}>
                      {(group: { label: string; items: SearchItem[] }) => (
                        <Command.Group key={group.label} items={group.items}>
                          <Command.GroupLabel style={styles.groupLabel}>
                            {group.label}
                          </Command.GroupLabel>
                          <Command.Collection>
                            {(item: SearchItem) => (
                              <Command.Item
                                key={item.label}
                                value={item}
                                style={styles.item}
                                onClick={() => run(item)}
                              >
                                {item.label}
                                <ArrowUpRightIcon aria-hidden />
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
            <Separator />
            <div {...stylex.props(styles.footer)}>
              <span>↑ ↓ Navigate</span>
              <span>↵ Open</span>
              <span>Esc Close</span>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
