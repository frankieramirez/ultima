import {
  BracketsAngleIcon,
  DesktopIcon,
  DownloadSimpleIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PaintBrushIcon,
  SquaresFourIcon,
  StackIcon,
  SunIcon,
  SwatchesIcon,
  TerminalWindowIcon,
} from '@phosphor-icons/react';
import { useNavigate } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import type { StyleXStyles } from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge, Button, Card, Command, Dialog, ScrollArea, Separator } from '@ultima/ui';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import { useEffect, useMemo, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';

import { BlockFrame } from './block-frame';
import { breakpoints } from './breakpoints.stylex';
import { CataloguePreview } from './catalogue-preview';
import { components } from './components';
import { docsStyles } from './docs-style';
import { blocks } from './generated/blocks';
import { HighlightedCode } from './highlighted-code';
import { LandingCommand } from './landing-command';
import type { NavLink } from './navigation';
import { emptyGroups, groupLabel, matchTier, TAG_OR_DESCRIPTION, recordRecent, searchGroups, type SearchGroup, type SearchResult } from './search-index';
import { useTheme } from './theme';

/** `breakpoints.WIDE` and `breakpoints.DESKTOP`, for the parts that are absent below them rather than restyled. */
const WIDE_QUERY = '(min-width: 48rem)';
const DESKTOP_QUERY = '(min-width: 64rem)';

const WORD_JOINER = '⁠';

/** About six result rows, the height `CekIX` gives the results and the preview pane. */
const listHeight = 'min(55dvh, 24rem)';

const styles = stylex.create({
  trigger: {
    borderRadius: 0,
    justifyContent: { default: 'center', [breakpoints.DESKTOP]: 'space-between' },
    height: { default: space['--ult-space-10'], [breakpoints.DESKTOP]: space['--ult-space-9'] },
    inlineSize: { default: space['--ult-space-10'], [breakpoints.DESKTOP]: '16.25rem' },
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
    padding: { default: 0, [breakpoints.WIDE]: space['--ult-space-6'] },
    placeItems: { default: 'stretch', [breakpoints.WIDE]: 'start center' },
    paddingBlockStart: { default: 0, [breakpoints.WIDE]: '15vh' },
  },
  popup: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: 0,
    width: '100%',
    maxWidth: '40rem',
  },
  results: { maxWidth: { default: '40rem', [breakpoints.DESKTOP]: '55rem' } },
  fullscreen: { blockSize: '100dvh', borderRadius: 0, borderWidth: 0, maxWidth: 'none' },
  inputGroup: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    flexShrink: 0,
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-5'],
    minBlockSize: space['--ult-space-11'],
    paddingInlineStart: space['--ult-space-6'],
    paddingInlineEnd: space['--ult-space-4'],
  },
  close: { marginInlineStart: 'auto', fontFamily: { default: font['--ult-font-sans'], [breakpoints.WIDE]: font['--ult-font-mono'] } },
  body: { display: 'flex', flexGrow: 1, minBlockSize: 0 },
  fixedResultsBody: { blockSize: { default: 'auto', [breakpoints.WIDE]: listHeight } },
  scroll: { flexGrow: 1, minInlineSize: 0 },
  scrollViewport: { blockSize: '100%', maxBlockSize: { default: 'none', [breakpoints.WIDE]: listHeight } },
  list: { padding: space['--ult-space-4'] },
  groupLabel: {
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    letterSpacing: '0.04em',
    paddingBlockEnd: space['--ult-space-2'],
    paddingBlockStart: space['--ult-space-5'],
    paddingInline: space['--ult-space-5'],
    textTransform: 'uppercase',
  },
  item: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
    minBlockSize: space['--ult-space-9'],
    paddingInline: space['--ult-space-5'],
  },
  glyph: {
    alignItems: 'center',
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    flexShrink: 0,
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    inlineSize: space['--ult-space-8'],
  },
  text: { display: 'flex', flexDirection: 'column', flexGrow: 1, gap: space['--ult-space-1'], minInlineSize: 0 },
  description: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-3'] },
  match: { color: color['--ult-color-highlight-text'], fontWeight: font['--ult-font-weight-semibold'] },
  aside: { color: color['--ult-color-text-subtle'], flexShrink: 0, fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'] },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-3'],
    paddingBlock: space['--ult-space-2'],
    paddingInlineStart: space['--ult-space-11'],
  },
  chip: { display: 'inline-flex', paddingInline: space['--ult-space-2'] },
  chipBadge: { alignItems: 'center', display: 'inline-flex', gap: space['--ult-space-3'] },
  pane: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: space['--ult-space-5'],
    inlineSize: '21.25rem',
    overflowY: 'auto',
    padding: space['--ult-space-6'],
  },
  paneHead: {
    color: color['--ult-color-text-muted'],
    display: 'flex',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    justifyContent: 'space-between',
  },
  paneSubtle: { color: color['--ult-color-text-subtle'] },
  paneText: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-3'], margin: 0 },
  stage: { overflow: 'hidden' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-3'] },
  hints: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-3'] },
  hint: { color: color['--ult-color-text-muted'], display: 'flex', fontSize: text['--ult-text-3'], justifyContent: 'space-between' },
  footer: {
    alignItems: 'center',
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    flexShrink: 0,
    fontSize: text['--ult-text-2'],
    gap: space['--ult-space-6'],
    paddingBlock: space['--ult-space-4'],
    paddingInline: space['--ult-space-6'],
  },
  kbd: { color: color['--ult-color-text-muted'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'], marginInlineEnd: space['--ult-space-2'] },
  credit: { fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'], marginInlineStart: 'auto', textTransform: 'uppercase' },
});

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent);
const MOD = isMac ? '⌘' : 'Ctrl';

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}

const PAGE_ICONS: Record<string, ReactNode> = {
  '/components': <SquaresFourIcon aria-hidden />,
  '/blocks': <StackIcon aria-hidden />,
  '/install': <DownloadSimpleIcon aria-hidden />,
  '/cli': <TerminalWindowIcon aria-hidden />,
  '/tokens': <SwatchesIcon aria-hidden />,
  '/theme-studio': <PaintBrushIcon aria-hidden />,
};

const ACTION_ICONS = { dark: <MoonIcon aria-hidden />, light: <SunIcon aria-hidden />, system: <DesktopIcon aria-hidden /> };

const PAGE_COUNTS: Record<string, number> = { '/components': components.length, '/blocks': blocks.length };

const COMMAND_NUMBER = components.find(({ item }) => item === 'command')?.number;

function HighlightFirstMatch({ text: value, query }: { text: string; query: string }) {
  const at = query ? value.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) return value;
  return (
    <>
      {value.slice(0, at)}
      <span {...stylex.props(styles.match)}>{value.slice(at, at + query.length)}</span>
      {value.slice(at + query.length)}
    </>
  );
}

function glyph(result: SearchResult) {
  switch (result.kind) {
    case 'component':
    case 'block':
      return result.number;
    case 'element':
      return <BracketsAngleIcon aria-hidden />;
    case 'page':
      return PAGE_ICONS[result.id] ?? <FileTextIcon aria-hidden />;
    case 'action':
      return ACTION_ICONS[result.id];
  }
}

function aside(result: SearchResult) {
  switch (result.kind) {
    case 'component':
      return groupLabel(result.entry);
    case 'block':
      return 'Block';
    case 'element':
      return `<${result.tag}>`;
    case 'page':
      return PAGE_COUNTS[result.id];
    case 'action':
      return null;
  }
}

function Row({ result, query }: { result: SearchResult; query: string }) {
  const described = query && 'description' in result;
  const tier = query ? matchTier(result, query) : null;
  return (
    <>
      <span aria-hidden {...stylex.props(styles.glyph)}>
        {glyph(result)}
      </span>
      <span {...stylex.props(styles.text)}>
        <span>{tier === TAG_OR_DESCRIPTION ? result.title : <HighlightFirstMatch text={result.title} query={query.trim()} />}</span>
        {described && (
          <span {...stylex.props(styles.description)}>
            {tier === TAG_OR_DESCRIPTION ? <HighlightFirstMatch text={result.description} query={query.trim()} /> : result.description}
          </span>
        )}
      </span>
      <span {...stylex.props(styles.aside)}>{aside(result)}</span>
    </>
  );
}

function Hint({ label, keys }: { label: string; keys: string[] }) {
  return (
    <span>
      {keys.map((key) => (
        <kbd key={key} {...stylex.props(styles.kbd)}>
          {key}
        </kbd>
      ))}
      {label}
    </span>
  );
}

type Previewable = Extract<SearchResult, { kind: 'component' | 'element' | 'block' }>;

const previewable = (result: SearchResult | undefined): result is Previewable =>
  result?.kind === 'component' || result?.kind === 'element' || result?.kind === 'block';

function PreviewPane({ result }: { result: Previewable }) {
  const head = (
    <div {...stylex.props(styles.paneHead)}>
      <span>{result.kind === 'element' ? `<${result.tag}>` : `${result.number} · ${result.title.toUpperCase()}`}</span>
      <span {...stylex.props(styles.paneSubtle)}>
        {(result.kind === 'component' ? `${groupLabel(result.entry)} · ${result.entry.release}` : result.kind).toUpperCase()}
      </span>
    </div>
  );
  if (result.kind === 'element')
    return (
      <aside aria-label={`${result.title} preview`} {...stylex.props(styles.pane)}>
        {head}
        <p {...stylex.props(styles.paneText)}>Tag family</p>
        <div {...stylex.props(styles.tags)}>
          {result.entry.tags.map((tag) => (
            <Badge key={tag}>{`<${tag}>`}</Badge>
          ))}
        </div>
        <HighlightedCode code={result.entry.example} lang="html" />
      </aside>
    );
  return (
    <aside aria-label={`${result.title} preview`} {...stylex.props(styles.pane)}>
      {head}
      {result.kind === 'component' ? (
        <CataloguePreview item={result.id} />
      ) : (
        <Card.Root style={styles.stage}>
          <BlockFrame block={result.entry} thumbnail />
        </Card.Root>
      )}
      <p {...stylex.props(styles.paneText)}>{result.description}</p>
      {result.kind === 'block' && (
        <p {...stylex.props(styles.paneText)}>
          Built from {result.entry.builtFrom.map(({ title }) => title).join(', ')}
        </p>
      )}
      <LandingCommand commands={[result.install]} label={`Copy the ${result.title} install command`} />
      <div aria-hidden {...stylex.props(styles.hints)}>
        <span {...stylex.props(styles.hint)}>
          Open the {result.title} page <kbd {...stylex.props(styles.kbd)}>↵</kbd>
        </span>
        <span {...stylex.props(styles.hint)}>
          Copy the install command <kbd {...stylex.props(styles.kbd)}>{`${MOD} ↵`}</kbd>
        </span>
      </div>
    </aside>
  );
}

const install = (result: SearchResult | undefined) => (result && 'install' in result ? result.install : undefined);

export function SiteSearch({ style }: { style?: StyleXStyles }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState<SearchResult>();
  const [announcement, setAnnouncement] = useState('');
  const wide = useMedia(WIDE_QUERY);
  const desktop = useMedia(DESKTOP_QUERY);
  const navigate = useNavigate();
  const { setPreference } = useTheme();
  // Keyed on `open` so Recent is read again each time the palette opens.
  const groups = useMemo<SearchGroup[]>(() => (query.trim() ? searchGroups(query) : open ? emptyGroups() : []), [query, open]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        const isComponentPreview = (event.target as Element | null)?.closest('[data-component-preview]');
        if (isComponentPreview) return;
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, []);
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery('');
      setAnnouncement('');
    }
  };
  const run = (result: SearchResult) => {
    changeOpen(false);
    if (result.kind === 'action') return setPreference(result.id);
    recordRecent(result);
    if (result.kind === 'component') void navigate({ to: '/components/$name', params: { name: result.id } });
    else if (result.kind === 'element') void navigate({ to: '/components/$name', params: { name: result.id }, hash: 'web-component' });
    else if (result.kind === 'block') void navigate({ to: '/blocks/$id', params: { id: result.id } });
    else void navigate({ to: result.id as NavLink['to'] });
  };
  const command = wide ? install(highlighted) : undefined;
  const copy = async (text: string) => {
    let result = `Copied ${text}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      result = 'Copy failed';
    }
    setAnnouncement((current) => (current === result ? `${result}${WORD_JOINER}` : result));
  };
  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement> & { preventBaseUIHandler: () => void }) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
    event.preventBaseUIHandler();
    event.preventDefault();
    if (command) void copy(command);
  };
  const searching = Boolean(query.trim());
  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger render={<Button aria-label="Search Ultima" variant="outline" size="sm" style={[styles.trigger, style]} />}>
        <MagnifyingGlassIcon aria-hidden {...stylex.props(styles.searchIcon)} />
        <span {...stylex.props(styles.label)}>Search Ultima…</span>
        <kbd {...stylex.props(styles.shortcut)}>{`${MOD} K`}</kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender />
        <Dialog.Viewport style={styles.viewport}>
          <Dialog.Popup style={[styles.popup, searching && styles.results, !wide && styles.fullscreen]}>
            <Dialog.Title style={visuallyHidden}>Search Ultima</Dialog.Title>
            <Command.Root
              open
              inline
              value={query}
              onValueChange={setQuery}
              items={groups}
              filter={null}
              itemToStringValue={(result: SearchResult) => result.title}
              onItemHighlighted={(result: SearchResult | undefined) => setHighlighted(result)}
              autoHighlight="always"
              keepHighlight
            >
              <Command.InputGroup style={styles.inputGroup}>
                <MagnifyingGlassIcon aria-hidden />
                <Command.Input
                  aria-label="Search components, blocks and docs"
                  placeholder="Search components, blocks and docs"
                  onKeyDown={onInputKeyDown}
                />
                <Dialog.Close render={<Button variant="ghost" size="sm" style={[docsStyles.square, styles.close]} />}>
                  {wide ? 'Esc' : 'Cancel'}
                </Dialog.Close>
              </Command.InputGroup>
              <Separator />
              <div {...stylex.props(styles.body, searching && styles.fixedResultsBody)}>
                <ScrollArea.Root style={styles.scroll}>
                  <ScrollArea.Viewport style={styles.scrollViewport}>
                    <ScrollArea.Content>
                      <Command.Empty>No components, blocks or pages match that search.</Command.Empty>
                      <Command.List style={styles.list}>
                        {(group: SearchGroup) => (
                          <Command.Group key={group.label} items={group.items}>
                            <Command.GroupLabel style={styles.groupLabel}>
                              {searching ? `${group.label} · ${group.items.length}` : group.label}
                            </Command.GroupLabel>
                            {group.label.startsWith('Blocks using') ? (
                              <div {...stylex.props(styles.chips)}>
                                <Command.Collection>
                                  {(result: SearchResult) => (
                                    <Command.Item key={result.id} value={result} style={styles.chip} onClick={() => run(result)}>
                                      <Badge style={styles.chipBadge}>
                                        <StackIcon aria-hidden />
                                        {result.title}
                                      </Badge>
                                    </Command.Item>
                                  )}
                                </Command.Collection>
                              </div>
                            ) : (
                              <Command.Collection>
                                {(result: SearchResult) => (
                                  <Command.Item key={`${result.kind}:${result.id}`} value={result} style={styles.item} onClick={() => run(result)}>
                                    <Row result={result} query={query} />
                                  </Command.Item>
                                )}
                              </Command.Collection>
                            )}
                          </Command.Group>
                        )}
                      </Command.List>
                    </ScrollArea.Content>
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar>
                    <ScrollArea.Thumb />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>
                {desktop && searching && previewable(highlighted) && (
                  <>
                    <Separator orientation="vertical" />
                    <PreviewPane result={highlighted} />
                  </>
                )}
              </div>
            </Command.Root>
            {wide && (
              <>
                <Separator />
                <div {...stylex.props(styles.footer)}>
                  <Hint keys={['↑', '↓']} label="Navigate" />
                  <Hint keys={['↵']} label="Open" />
                  {command && <Hint keys={[MOD, '↵']} label="Copy install" />}
                  <Hint keys={['Esc']} label="Close" />
                  <span {...stylex.props(styles.credit)}>Command · {COMMAND_NUMBER}</span>
                </div>
              </>
            )}
            <span role="status" aria-atomic="true" {...stylex.props(visuallyHidden)}>
              {announcement}
            </span>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
