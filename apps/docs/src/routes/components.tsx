import { ArrowUpRightIcon, ListIcon, MagnifyingGlassIcon, SquaresFourIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge, Button, Card, Empty, Field, InputGroup, Separator, Switch, ToggleGroup } from '@ultima/ui';
import { useEffect, useRef, useState, type FocusEvent } from 'react';

import { breakpoints } from '../breakpoints.stylex';
import { CataloguePreview } from '../catalogue-preview';
import { GROUPS, components, type ComponentEntry, type ComponentGroup } from '../components';
import { docsStyles } from '../docs-style';
import { DocumentLayout } from '../document-layout';
import { elements } from '../elements';
import { shell } from '../shell.stylex';
import { TextLink } from '../text-link';
import { headings } from '../typography';

const HEADING_FONT = 'Space Grotesk, Figtree, ui-sans-serif, system-ui, sans-serif';

const summaries: Record<string, string> = {
  accordion: 'Reveal supporting content, one section at a time.',
  alert: 'Bring an in-page message to someone’s attention.',
  'alert-dialog': 'Ask for confirmation before an action continues.',
  'aspect-ratio': 'Keep media at a consistent width-to-height ratio.',
  avatar: 'Represent a person with an image or fallback.',
  badge: 'Give a status or category a compact label.',
  breadcrumb: 'Show where a page sits in the navigation.',
  button: 'Trigger an action with solid, outline, or ghost styling.',
};

const GROUP_SUMMARIES: Record<ComponentGroup, string> = {
  forms: 'Controls that take input or trigger an action.',
  overlays: 'Surfaces that open above the page.',
  'data-display': 'Ways to present content and numbers.',
  navigation: 'Ways to move between and within pages.',
  feedback: 'Status, progress and the absence of content.',
  layout: 'Structure for the space between things.',
};

const RESOURCES = [
  { title: 'Recipes', to: '/recipes', description: 'Copy compositions with their dependencies' },
  { title: 'Installation', to: '/install', description: 'Add your first component' },
  { title: 'Theme Studio', to: '/theme-studio', description: 'Make the components your own' },
  { title: 'Tokens', to: '/tokens', description: 'The values behind the UI' },
] as const;

const withElement = new Set(elements.map((element) => element.item));

type View = 'grid' | 'list';
type Chip = ComponentGroup | 'all';

const styles = stylex.create({
  runningHead: {
    color: color['--ult-color-text-subtle'],
    display: 'flex',
    fontFamily: font['--ult-font-mono'],
    fontSize: { default: '0.625rem', [breakpoints.WIDE]: text['--ult-text-1'] },
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
    paddingBlockEnd: { default: space['--ult-space-4'], [breakpoints.WIDE]: space['--ult-space-5'] },
    textTransform: 'uppercase',
  },
  libraries: { display: { default: 'none', [breakpoints.WIDE]: 'inline' } },
  titleBlock: {
    alignItems: 'flex-end',
    columnGap: space['--ult-space-11'],
    display: 'flex',
    flexWrap: 'wrap',
    marginBlockStart: { default: space['--ult-space-9'], [breakpoints.WIDE]: space['--ult-space-11'] },
    rowGap: space['--ult-space-7'],
  },
  titleCopy: {
    display: 'flex',
    flexBasis: 0,
    flexDirection: 'column',
    flexGrow: 1,
    gap: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-6'] },
    minInlineSize: { default: '100%', [breakpoints.WIDE]: '20rem' },
  },
  title: {
    color: color['--ult-color-text'],
    fontFamily: HEADING_FONT,
    fontSize: { default: '3.75rem', [breakpoints.INDEX]: '6rem' },
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tightest'],
    lineHeight: 0.95,
    margin: 0,
  },
  lede: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-6'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
    maxInlineSize: '35rem',
  },
  resources: {
    flexBasis: { default: '100%', [breakpoints.WIDE]: '20rem' },
    flexGrow: 0,
    flexShrink: 0,
  },
  resourceList: { listStyle: 'none', margin: 0, padding: 0 },
  resource: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-5'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-4'],
    textDecoration: 'none',
    inlineSize: '100%',
  },
  resourceText: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-1'] },
  resourceTitle: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-semibold'],
  },
  resourceDescription: { color: color['--ult-color-text-subtle'], fontSize: text['--ult-text-2'] },
  toolbar: {
    backgroundColor: color['--ult-color-surface'],
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    insetBlockStart: shell.chromeBlock,
    marginBlockStart: space['--ult-space-11'],
    paddingBlockStart: space['--ult-space-6'],
    position: { default: 'static', [breakpoints.DESKTOP]: 'sticky' },
    zIndex: 1,
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
  },
  search: { inlineSize: { default: '100%', [breakpoints.WIDE]: '27.5rem' } },
  input: { fontSize: text['--ult-text-4'] },
  key: { display: { default: 'none', [breakpoints.DESKTOP]: 'inline' }, fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'] },
  controls: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-6'] },
  switch: {
    alignItems: 'center',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-4'],
  },
  chips: { flexWrap: 'wrap' },
  chipCount: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    fontWeight: font['--ult-font-weight-regular'],
    marginInlineStart: space['--ult-space-2'],
  },
  status: { alignItems: 'center', display: 'flex', gap: space['--ult-space-5'] },
  empty: { marginBlockStart: space['--ult-space-9'] },
  count: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-3'], margin: 0 },
  groupHead: {
    alignItems: 'flex-end',
    columnGap: space['--ult-space-8'],
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBlockEnd: space['--ult-space-6'],
    marginBlockStart: space['--ult-space-11'],
    rowGap: space['--ult-space-3'],
  },
  group: { alignItems: 'baseline', display: 'flex', gap: space['--ult-space-5'], marginBottom: 0, marginTop: 0 },
  groupMark: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-regular'],
    letterSpacing: font['--ult-font-tracking-normal'],
  },
  groupSummary: { color: color['--ult-color-text-muted'], fontSize: text['--ult-text-4'], margin: 0 },
  grid: {
    display: 'grid',
    gap: space['--ult-space-6'],
    gridTemplateColumns: `repeat(auto-fill, minmax(max(15rem, calc((100% - 3 * ${space['--ult-space-6']}) / 4)), 1fr))`,
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  list: { listStyle: 'none', margin: 0, padding: 0 },
  card: { blockSize: '100%', overflow: 'hidden', position: 'relative' },
  preview: { blockSize: '9.375rem' },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
    paddingBlockEnd: space['--ult-space-6'],
    paddingBlockStart: space['--ult-space-5'],
    paddingInline: space['--ult-space-6'],
  },
  line: {
    columnGap: space['--ult-space-9'],
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr)', [breakpoints.WIDE]: '15rem minmax(0, 1fr)' },
    paddingBlock: space['--ult-space-6'],
    position: 'relative',
    rowGap: space['--ult-space-3'],
  },
  heading: { alignItems: 'center', display: 'flex', gap: space['--ult-space-4'], minInlineSize: 0 },
  stretchedLink: {
    alignItems: 'baseline',
    color: { default: color['--ult-color-text'], ':hover': color['--ult-color-text'] },
    display: 'flex',
    flexGrow: 1,
    gap: space['--ult-space-4'],
    minInlineSize: 0,
    textDecoration: 'none',
    '::after': { content: '""', inset: 0, position: 'absolute' },
  },
  number: { color: color['--ult-color-text-subtle'], fontFamily: font['--ult-font-mono'], fontSize: text['--ult-text-1'] },
  name: {
    fontFamily: HEADING_FONT,
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-tight'],
  },
  element: {
    flexShrink: 0,
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    fontWeight: font['--ult-font-weight-regular'],
    paddingBlock: space['--ult-space-1'],
    textTransform: 'uppercase',
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
});

function Entry({ entry, view }: { entry: ComponentEntry; view: View }) {
  const described = `summary-${entry.item}`;
  const body = (
    <>
      <div {...stylex.props(styles.heading)}>
        <TextLink
          render={<Link to="/components/$name" params={{ name: entry.item }} />}
          aria-describedby={described}
          style={styles.stretchedLink}
        >
          <span {...stylex.props(styles.number)}>{entry.number}</span> <span {...stylex.props(styles.name)}>{entry.name}</span>
        </TextLink>
        {withElement.has(entry.item) && <Badge style={styles.element}>Element</Badge>}
      </div>
      <p id={described} {...stylex.props(styles.description)}>
        {summaries[entry.item] ?? entry.description}
      </p>
    </>
  );
  if (view === 'list')
    return (
      <li>
        <Separator />
        <div {...stylex.props(styles.line)}>{body}</div>
      </li>
    );
  return (
    <li>
      <Card.Root style={styles.card}>
        <CataloguePreview item={entry.item} style={styles.preview} />
        <Separator />
        <div {...stylex.props(styles.body)}>{body}</div>
      </Card.Root>
    </li>
  );
}

export function ComponentsPage() {
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<Chip>('all');
  const [elementsOnly, setElementsOnly] = useState(false);
  const [view, setView] = useState<View>('grid');
  const input = useRef<HTMLInputElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);

  const keepClearOfToolbar = (event: FocusEvent<HTMLElement>) => {
    if (!toolbar.current) return;
    const clear = toolbar.current.getBoundingClientRect().bottom + parseFloat(getComputedStyle(toolbar.current).rowGap);
    const top = event.target.getBoundingClientRect().top;
    if (top < clear) window.scrollBy({ top: top - clear, behavior: 'instant' });
  };

  useEffect(() => {
    const focusFilter = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [role="dialog"], [role="alertdialog"]'))) return;
      if (!input.current || input.current.closest('[aria-hidden="true"], [inert]')) return;
      event.preventDefault();
      input.current?.focus();
    };
    document.addEventListener('keydown', focusFilter);
    return () => document.removeEventListener('keydown', focusFilter);
  }, []);

  const term = query.trim().toLowerCase();
  const matches = components.filter(
    (entry) =>
      (!elementsOnly || withElement.has(entry.item)) &&
      `${entry.name} ${entry.description} ${summaries[entry.item] ?? ''}`.toLowerCase().includes(term),
  );
  const shown = chip === 'all' ? matches : matches.filter((entry) => entry.group === chip);
  const filtered = query !== '' || chip !== 'all' || elementsOnly;
  const clear = () => {
    setQuery('');
    setChip('all');
    setElementsOnly(false);
    input.current?.focus();
  };

  return (
    <DocumentLayout breadcrumb={[]} index={false} wide>
      <p {...stylex.props(styles.runningHead)}>
        <span>Components</span>
        <span>
          {components.length} · {GROUPS.length} groups · {elements.length} HTML elements
        </span>
        <span {...stylex.props(styles.libraries)}>Base UI · Zag</span>
      </p>
      <Separator />
      <div {...stylex.props(styles.titleBlock)}>
        <div {...stylex.props(styles.titleCopy)}>
          <h1 {...stylex.props(styles.title)}>Components</h1>
          <p {...stylex.props(styles.lede)}>
            Accessible components for React, written in StyleX. Each installs as source you own.
          </p>
        </div>
        <div {...stylex.props(styles.resources)}>
          <ul aria-label="Start building" {...stylex.props(styles.resourceList)}>
            {RESOURCES.map((resource) => (
              <li key={resource.to}>
                <Separator />
                <TextLink variant="muted" render={<Link to={resource.to} />} style={styles.resource}>
                  <span {...stylex.props(styles.resourceText)}>
                    <span {...stylex.props(styles.resourceTitle)}>{resource.title}</span>
                    <span {...stylex.props(styles.resourceDescription)}>{resource.description}</span>
                  </span>
                  <ArrowUpRightIcon aria-hidden />
                </TextLink>
              </li>
            ))}
          </ul>
          <Separator />
        </div>
      </div>
      <div ref={toolbar} {...stylex.props(styles.toolbar)}>
        <div {...stylex.props(styles.row)}>
          <Field.Root name="filter" style={styles.search}>
            <InputGroup.Root>
              <InputGroup.Addon>
                <MagnifyingGlassIcon aria-hidden />
              </InputGroup.Addon>
              <InputGroup.Input
                aria-label="Filter components"
                aria-keyshortcuts="/"
                type="search"
                ref={input}
                value={query}
                placeholder={`Search ${components.length} components`}
                style={styles.input}
                onChange={(event) => {
                  setQuery(event.currentTarget.value);
                }}
              />
              <InputGroup.Addon align="end">
                <kbd aria-hidden {...stylex.props(styles.key)}>
                  /
                </kbd>
              </InputGroup.Addon>
            </InputGroup.Root>
          </Field.Root>
          <div {...stylex.props(styles.controls)}>
            <label {...stylex.props(styles.switch)}>
              <Switch.Root checked={elementsOnly} onCheckedChange={setElementsOnly}>
                <Switch.Thumb />
              </Switch.Root>
              Has an HTML element
            </label>
            <ToggleGroup.Root
              aria-label="View"
              value={[view]}
              onValueChange={(next: View[], details) => {
                if (next[0]) setView(next[0]);
                else details.cancel();
              }}
            >
              <ToggleGroup.Item value="grid" aria-label="Grid">
                <SquaresFourIcon aria-hidden />
              </ToggleGroup.Item>
              <ToggleGroup.Item value="list" aria-label="List">
                <ListIcon aria-hidden />
              </ToggleGroup.Item>
            </ToggleGroup.Root>
          </div>
        </div>
        <div {...stylex.props(styles.row)}>
          <ToggleGroup.Root
            aria-label="Group"
            value={[chip]}
            onValueChange={(next: Chip[], details) => {
              if (next[0]) setChip(next[0]);
              else details.cancel();
            }}
            style={styles.chips}
          >
            {[{ id: 'all' as const, label: 'All' }, ...GROUPS].map((group) => (
              <ToggleGroup.Item key={group.id} value={group.id}>
                {group.label}{' '}
                <span {...stylex.props(styles.chipCount)}>
                  {group.id === 'all' ? matches.length : matches.filter((entry) => entry.group === group.id).length}
                </span>
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
          <div {...stylex.props(styles.status)}>
            <p role="status" {...stylex.props(styles.count)}>
              {shown.length} {shown.length === 1 ? 'component' : 'components'} · A–Z
            </p>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={clear} style={docsStyles.square}>
                Clear filters
              </Button>
            )}
          </div>
        </div>
        <Separator />
      </div>
      {shown.length === 0 && (
        <Empty.Root style={styles.empty}>
          <Empty.Title render={<h2 />}>No components match these filters</Empty.Title>
          <Empty.Description>Try a different search, or clear the filters to browse the catalogue.</Empty.Description>
          <Button onClick={clear} style={docsStyles.square}>
            Clear filters
          </Button>
        </Empty.Root>
      )}
      {GROUPS.map((group, index) => {
        const entries = shown.filter((entry) => entry.group === group.id);
        if (entries.length === 0) return null;
        const heading = `group-${group.id}`;
        return (
          <section key={group.id} aria-labelledby={heading} onFocus={keepClearOfToolbar}>
            <div {...stylex.props(styles.groupHead)}>
              <h2 id={heading} {...stylex.props(headings.h2, styles.group)}>
                <span aria-hidden {...stylex.props(styles.groupMark)}>
                  § {String(index + 1).padStart(2, '0')}
                </span>{' '}
                {group.label} <span {...stylex.props(styles.groupMark)}>{entries.length}</span>
              </h2>
              <p {...stylex.props(styles.groupSummary)}>{GROUP_SUMMARIES[group.id]}</p>
            </div>
            <ul {...stylex.props(view === 'grid' ? styles.grid : styles.list)}>
              {entries.map((entry) => (
                <Entry key={entry.item} entry={entry} view={view} />
              ))}
            </ul>
          </section>
        );
      })}
    </DocumentLayout>
  );
}
