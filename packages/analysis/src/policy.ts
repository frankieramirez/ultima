// The external dependency policy for production targets: every package a component, helper, element
// or token source imports belongs to a declared, spec-linked category. A new package needs a review of
// this policy, never an automatic allowance. docs/spec/agent-infrastructure.md, Import and registry
// boundaries, and Target and API distinctions.
import type { RuntimeVariable } from './grammar.ts';
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

// ---------------------------------------------------------------------------------------------
// Styling: docs/spec/agent-infrastructure.md, Values and runtime styles, and the ULT-STYLE-001 row.
// ---------------------------------------------------------------------------------------------

export type StylePolicy = {
  /** Primitive-owned and component runtime variables: who writes each, which items read it and on what. */
  variables: readonly RuntimeVariable[];
  /** Styling engines other than StyleX, and class-name composers that exist to feed one. */
  engines: (name: string) => boolean;
};

export const STYLE_ENGINES = (name: string): boolean =>
  [
    'styled-components',
    'styled-jsx',
    'goober',
    'jss',
    'react-jss',
    'aphrodite',
    'radium',
    'linaria',
    'astroturf',
    'twin.macro',
    'tailwindcss',
    'tailwind-merge',
    'tailwind-variants',
    'class-variance-authority',
    'clsx',
    'classnames',
    'unocss',
    'sass',
    'less',
    'stylus',
    'postcss',
  ].includes(name) ||
  ['@emotion', '@vanilla-extract', '@linaria', '@pandacss', '@stitches', '@griffel', '@compiled', '@tailwindcss', '@unocss', '@styled-system'].some((scope) =>
    name.startsWith(`${scope}/`),
  );

const OVERLAYS = 'docs/spec/ultima.md#overlays';
const STYLED_PARTS = 'docs/spec/ultima.md#styled-parts';
const NOTES = 'docs/spec/ultima.md#per-component-notes';
const ELEMENT_PRIMITIVES = 'docs/spec/ultima.md#the-primitive-layer';

const variable = (owner: string, items: readonly string[], categories: RuntimeVariable['categories'], authority: string, ...names: string[]) =>
  names.map((name): RuntimeVariable => ({ name, owner, items, categories, authority }));

/**
 * Every variable a component reads that it does not declare as a token: the primitive or component
 * that writes it, the items that may read it, and the value categories it may feed. A new read needs
 * its owning contract first, then an entry here.
 */
export const RUNTIME_VARIABLES: readonly RuntimeVariable[] = [
  ...variable(
    "Base UI's positioner, and Zag's for the tooltip element",
    ['alert-dialog', 'combobox', 'command', 'context-menu', 'dialog', 'dropdown-menu', 'hover-card', 'popover', 'select', 'tooltip', 'ult-tooltip'],
    ['origin'],
    OVERLAYS,
    '--transform-origin',
  ),
  ...variable("Base UI's positioner", ['combobox', 'command', 'navigation-menu'], ['length'], NOTES, '--available-width'),
  ...variable("Base UI's positioner", ['combobox', 'command'], ['length'], NOTES, '--available-height', '--anchor-width'),
  ...variable("Base UI's Navigation Menu", ['navigation-menu'], ['length'], NOTES, '--positioner-width', '--positioner-height', '--popup-width', '--popup-height'),
  ...variable(
    "Base UI's Tabs indicator, restated by the tabs element",
    ['tabs', 'ult-tabs'],
    ['length'],
    STYLED_PARTS,
    '--active-tab-left',
    '--active-tab-top',
    '--active-tab-width',
    '--active-tab-height',
    '--active-tab-bottom',
  ),
  ...variable("Base UI's Accordion panel", ['accordion'], ['length'], STYLED_PARTS, '--accordion-panel-height'),
  ...variable("Base UI's Collapsible panel", ['collapsible'], ['length'], STYLED_PARTS, '--collapsible-panel-height'),
  ...variable("Base UI's Toast", ['toast'], ['translation', 'scale', 'z-index'], NOTES, '--toast-index'),
  ...variable("Base UI's Toast", ['toast'], ['length', 'translation'], NOTES, '--toast-height', '--toast-frontmost-height'),
  ...variable("Base UI's Toast", ['toast'], ['translation'], NOTES, '--toast-offset-y', '--toast-swipe-movement-x', '--toast-swipe-movement-y'),
  ...variable("Base UI's Drawer", ['drawer'], ['opacity'], NOTES, '--drawer-swipe-progress'),
  ...variable("Base UI's Drawer: the velocity-scaled exit reads the duration token", ['drawer'], ['duration'], 'docs/spec/ultima.md#motion', '--drawer-swipe-strength'),
  ...variable("Base UI's Drawer", ['drawer'], ['length'], NOTES, '--drawer-height'),
  ...variable("Base UI's Drawer", ['drawer'], ['translation'], NOTES, '--drawer-snap-point-offset', '--drawer-swipe-movement-x', '--drawer-swipe-movement-y'),
  ...variable('Sidebar, set by the consumer on the panel', ['sidebar'], ['keyword'], 'docs/spec/ultima.md#sidebar', '--sidebar-scrollbar-width'),
  ...variable("Zag's tabs indicator, mapped onto Base UI's names", ['ult-tabs'], ['custom-property'], ELEMENT_PRIMITIVES, '--left', '--top', '--width', '--height'),
];

export const STYLE_POLICY: StylePolicy = { variables: RUNTIME_VARIABLES, engines: STYLE_ENGINES };
