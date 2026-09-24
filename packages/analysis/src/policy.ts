// The external dependency policy for production targets: every package a component, helper, element
// or token source imports belongs to a declared, spec-linked category. A new package needs a review of
// this policy, never an automatic allowance. docs/spec/agent-infrastructure.md, Import and registry
// boundaries, and Target and API distinctions.
import type { SourceKind } from './scope.ts';

export type Category =
  | 'react'
  | 'styling'
  | 'base-ui'
  | 'zag-react'
  | 'zag-vanilla'
  | 'zag-machine'
  | 'zag-companion'
  | 'foreign-primitive'
  | 'icon'
  | 'engine';

type CategoryRule = { category: Category; match: (name: string) => boolean; authority: string };

const ADR_0001 = 'docs/adr/0001-stylex-only-styling.md';
const ADR_0002 = 'docs/adr/0002-base-ui-primitives.md';
const ADR_0002_ZAG = 'docs/adr/0002-base-ui-primitives.md#amendment-2026-09-20';
const ADR_0007 = 'docs/adr/0007-engines-ship-as-recipes.md';
const ADR_0008 = 'docs/adr/0008-zag-js-primitive-layer-for-elements.md';
const ICONS = 'docs/spec/ultima.md#iconography';

const exact =
  (...names: string[]) =>
  (name: string) =>
    names.includes(name);
const scoped = (scope: string) => (name: string) => name.startsWith(`${scope}/`);

/** First match wins, so icon sets are named before the primitive families some of them share a scope with. */
export const CATEGORIES: readonly CategoryRule[] = [
  { category: 'react', match: exact('react', 'react-dom'), authority: ADR_0002 },
  { category: 'styling', match: exact('@stylexjs/stylex'), authority: ADR_0001 },
  { category: 'base-ui', match: exact('@base-ui/react'), authority: ADR_0002 },
  { category: 'zag-react', match: exact('@zag-js/react'), authority: ADR_0002_ZAG },
  { category: 'zag-vanilla', match: exact('@zag-js/vanilla'), authority: ADR_0008 },
  { category: 'zag-machine', match: scoped('@zag-js'), authority: ADR_0008 },
  // Calendar and Date Picker type their values in it; docs/spec/ultima.md, the Calendar contract.
  { category: 'zag-companion', match: exact('@internationalized/date'), authority: 'docs/spec/ultima.md#the-date-set' },
  {
    category: 'icon',
    match: (name) =>
      ['lucide-react', 'react-icons', 'react-feather', '@radix-ui/react-icons', '@tabler/icons-react'].includes(name) ||
      ['@phosphor-icons', '@heroicons', '@fortawesome', '@mui/icons-material'].some((scope) => name.startsWith(`${scope}/`)),
    authority: ICONS,
  },
  {
    category: 'foreign-primitive',
    match: (name) =>
      ['react-aria', 'react-aria-components', '@headlessui/react', '@ariakit/react', 'reakit', 'downshift', 'cmdk', 'vaul'].includes(name) ||
      ['@radix-ui', '@react-aria', '@ark-ui', '@mui', '@chakra-ui', '@mantine'].some((scope) => name.startsWith(`${scope}/`)),
    authority: ADR_0002,
  },
  {
    category: 'engine',
    match: (name) =>
      ['react-hook-form', 'embla-carousel', 'embla-carousel-react', 'date-fns', 'dayjs', 'zod'].includes(name) ||
      name.startsWith('d3-') ||
      name === 'd3' ||
      name.startsWith('@tanstack/'),
    authority: ADR_0007,
  },
];

export type Allowance = { categories: readonly Category[]; items?: readonly string[] };

export type DependencyPolicy = {
  categories: readonly CategoryRule[];
  /** Per production kind, the categories it may import; `items` bounds a category to named registry items. */
  allowed: Partial<Record<SourceKind, Record<string, Allowance>>>;
};

/** Calendar, Date Picker and Resizable: the entries Base UI ships no primitive for. */
export const ZAG_REACT_ITEMS = ['calendar', 'date-picker', 'resizable'] as const;

export const POLICY: DependencyPolicy = {
  categories: CATEGORIES,
  allowed: {
    'token-source': { styling: { categories: ['styling'] } },
    'react-helper': { runtime: { categories: ['react', 'styling'] } },
    'react-component': {
      runtime: { categories: ['react', 'styling', 'base-ui'] },
      zag: { categories: ['zag-react', 'zag-machine', 'zag-companion'], items: ZAG_REACT_ITEMS },
    },
    element: { runtime: { categories: ['styling', 'zag-vanilla', 'zag-machine'] } },
  },
};

export function packageName(specifier: string): string {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : (segments[0] as string);
}

export function categoryOf(policy: DependencyPolicy, name: string): CategoryRule | undefined {
  return policy.categories.find((rule) => rule.match(name));
}

/** Whether `kind` (as item `item`) may import a package of `category`. */
export function allows(policy: DependencyPolicy, kind: SourceKind, category: Category, item: string | undefined): boolean {
  return Object.values(policy.allowed[kind] ?? {}).some(
    (allowance) => allowance.categories.includes(category) && (!allowance.items || (item !== undefined && allowance.items.includes(item))),
  );
}
