import { GROUPS, components, type ComponentEntry } from './components';
import { elements, type ElementEntry } from './elements';
import { blocks, type BlockEntry } from './generated/blocks';
import { pages } from './navigation';
import { readStored, writeStored } from './storage';
import type { ThemePreference } from './theme';

/** Global search's index, from the four generated or route sources. docs/spec/ultima.md, Global search. */
export type SearchResult =
  | { kind: 'component'; id: string; title: string; number: string; description: string; install: string; entry: ComponentEntry }
  | { kind: 'element'; id: string; title: string; number: string; tag: string; entry: ElementEntry }
  | { kind: 'block'; id: string; title: string; number: string; description: string; install: string; entry: BlockEntry }
  | { kind: 'page'; id: string; title: string }
  | { kind: 'action'; id: ThemePreference; title: string };

type Of<K extends SearchResult['kind']> = Extract<SearchResult, { kind: K }>;

export type SearchGroup = { label: string; items: SearchResult[] };

export type SearchSources = {
  components: readonly ComponentEntry[];
  elements: readonly ElementEntry[];
  blocks: readonly BlockEntry[];
  pages: readonly { label: string; to: string }[];
};

const SITE_SOURCES: SearchSources = { components, elements, blocks, pages };

const install = (id: string) => `npx shadcn add @ultima/${id}`;

export const groupLabel = (entry: ComponentEntry) => GROUPS.find(({ id }) => id === entry.group)?.label ?? entry.group;

const APPEARANCE: SearchResult[] = [
  { kind: 'action', id: 'dark', title: 'Switch to dark mode' },
  { kind: 'action', id: 'light', title: 'Switch to light mode' },
  { kind: 'action', id: 'system', title: 'Follow the system' },
];

const GO_TO = ['/components', '/blocks', '/install', '/cli', '/tokens', '/theme-studio'];

function indexOf(sources: SearchSources) {
  const componentResults = sources.components.map(
    (entry): Of<'component'> => ({
      kind: 'component',
      id: entry.item,
      title: entry.name,
      number: entry.number,
      description: entry.description,
      install: install(entry.item),
      entry,
    }),
  );
  const elementResults = sources.elements.map((entry): Of<'element'> => {
    const component = sources.components.find(({ item }) => item === entry.item);
    return {
      kind: 'element',
      id: entry.item,
      title: `${component?.name ?? entry.item} element`,
      number: component?.number ?? '',
      tag: entry.tag,
      entry,
    };
  });
  const blockResults = sources.blocks.map(
    (entry): Of<'block'> => ({
      kind: 'block',
      id: entry.id,
      title: entry.title,
      number: entry.number,
      description: entry.description,
      install: entry.install,
      entry,
    }),
  );
  const pageResults = sources.pages.map(
    ({ label, to }): Of<'page'> => ({ kind: 'page', id: to, title: label === 'Studio' ? 'Theme Studio' : label }),
  );
  return { components: componentResults, elements: elementResults, blocks: blockResults, pages: pageResults };
}

const TITLE_STARTS = 0;
const TITLE_CONTAINS = 1;
export const TAG_OR_DESCRIPTION = 2;

function tier(result: SearchResult, query: string): number | null {
  const title = result.title.toLowerCase();
  if (title.startsWith(query)) return TITLE_STARTS;
  if (title.includes(query)) return TITLE_CONTAINS;
  const extra = result.kind === 'element' ? result.entry.tags : 'description' in result ? [result.description] : [];
  return extra.some((text) => text.toLowerCase().includes(query)) ? TAG_OR_DESCRIPTION : null;
}

export function matchTier(result: SearchResult, query: string) {
  return tier(result, query.trim().toLowerCase());
}

function ranked<T extends SearchResult>(results: T[], query: string): T[] {
  return results
    .map((result) => ({ result, tier: tier(result, query) }))
    .filter((entry): entry is { result: T; tier: number } => entry.tier !== null)
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        ('number' in a.result && 'number' in b.result
          ? a.result.number.localeCompare(b.result.number)
          : a.result.title.localeCompare(b.result.title)),
    )
    .map(({ result }) => result);
}

/** The groups for a non-empty query, in their fixed order, each ranked, empty groups dropped. */
export function searchGroups(rawQuery: string, sources: SearchSources = SITE_SOURCES): SearchGroup[] {
  const query = rawQuery.trim().toLowerCase();
  const index = indexOf(sources);
  const found = {
    components: ranked(index.components, query),
    elements: ranked(index.elements, query),
    blocks: ranked(index.blocks, query),
    pages: ranked(index.pages, query),
  };
  const top = found.components[0];
  const using = top
    ? index.blocks
        .filter((block) => block.entry.builtFrom.some(({ id, kind }) => kind === 'component' && id === top.id))
        .sort((a, b) => a.number.localeCompare(b.number))
    : [];
  return [
    { label: 'Components', items: found.components },
    // Base UI tells options apart by value identity, so a block listed here and under Blocks needs its own copy.
    { label: `Blocks using ${top?.title}`, items: using.map((block) => ({ ...block })) },
    { label: 'Elements', items: found.elements },
    { label: 'Blocks', items: found.blocks },
    { label: 'Pages', items: found.pages },
    { label: 'Appearance', items: ranked(APPEARANCE, query) },
  ].filter(({ items }) => items.length > 0);
}

export const RECENT_KEY = 'ultima-search-recent';
const RECENT_LIMIT = 5;

type RecentEntry = { kind: SearchResult['kind']; id: string };

function storedRecent(): RecentEntry[] {
  const raw = readStored(RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is RecentEntry => typeof entry?.kind === 'string' && typeof entry?.id === 'string')
      : [];
  } catch {
    return [];
  }
}

/** The stored destinations that are still in the index, newest first; empty when storage is blocked or empty. */
export function readRecent(sources: SearchSources = SITE_SOURCES): SearchResult[] {
  const index = indexOf(sources);
  const all = [...index.components, ...index.elements, ...index.blocks, ...index.pages];
  return storedRecent().flatMap(({ kind, id }) => all.find((result) => result.kind === kind && result.id === id) ?? []);
}

export function recordRecent(result: SearchResult, sources: SearchSources = SITE_SOURCES) {
  if (result.kind === 'action') return;
  const kept = readRecent(sources).filter(({ kind, id }) => kind !== result.kind || id !== result.id);
  const entries = [result, ...kept].slice(0, RECENT_LIMIT).map(({ kind, id }) => ({ kind, id }));
  writeStored(RECENT_KEY, JSON.stringify(entries));
}

export function emptyGroups(sources: SearchSources = SITE_SOURCES): SearchGroup[] {
  const index = indexOf(sources);
  const goTo = GO_TO.flatMap((to) => index.pages.find(({ id }) => id === to) ?? []);
  return [
    { label: 'Go to', items: goTo },
    { label: 'Recent', items: readRecent(sources) },
    { label: 'Appearance', items: APPEARANCE },
  ].filter(({ items }) => items.length > 0);
}
