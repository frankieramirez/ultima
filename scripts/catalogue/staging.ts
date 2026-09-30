// What the registry build stages and which items it describes, as pure data over a checkout. The
// builder copies these files; `ULT-REGISTRY-001` checks the same plan statically, so neither keeps a
// second list. docs/spec/agent-infrastructure.md, Import and registry boundaries.
import type { Files } from './files.ts';

/** Names never staged, at any depth: the UI barrel, a throwaway prototype and tests. */
export const NEVER_STAGE = new Set(['index.ts', 'prototype', '__tests__']);

/** The three source inventories the builder stages, in the order it stages them. */
export const STAGED_INVENTORIES = [
  { directory: 'packages/ui/src', extension: '.tsx', destination: 'ui', type: 'registry:ui' },
  { directory: 'packages/tokens/src', extension: '.ts', destination: 'lib', type: 'registry:lib', item: 'tokens' },
  { directory: 'packages/ui/src/lib', extension: '.ts', destination: 'lib', type: 'registry:lib', item: 'lib' },
] as const;

export type StagedSource = {
  /** Repository path of the authored file. */
  source: string;
  /** The registry item it installs as. A component file is its own item. */
  item: string;
  /** Path under `registry/`, as the item's `files[].path` names it. */
  staged: string;
  type: string;
};

/** The items the build describes, in `registry.json` order, and where each one's files come from. */
export type PlannedItem = { name: string; from: 'staged' | 'setup' | 'artifact' | 'element' };

/** Checks every segment, so the exclusion holds even if the listing is widened to walk subdirectories. */
export function isExcluded(relativePath: string): boolean {
  return relativePath.split('/').some((segment) => NEVER_STAGE.has(segment) || /\.test\.tsx?$/.test(segment));
}

/** Every staged source file, and any two that would land on one staged path. */
export function stagedSources(files: Files): { sources: StagedSource[]; collisions: { source: string; staged: string; with: string }[] } {
  const sources: StagedSource[] = [];
  const collisions: { source: string; staged: string; with: string }[] = [];
  const taken = new Map<string, string>();
  for (const inventory of STAGED_INVENTORIES) {
    const names = (files.list(inventory.directory) ?? [])
      .filter((entry) => !entry.directory && entry.name.endsWith(inventory.extension) && !isExcluded(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    for (const name of names) {
      const source = `${inventory.directory}/${name}`;
      const staged = `ultima/${inventory.destination}/${name}`;
      const holder = taken.get(staged);
      if (holder) {
        collisions.push({ source, staged, with: holder });
        continue;
      }
      taken.set(staged, source);
      const item = 'item' in inventory ? inventory.item : name.replace(/\.tsx?$/, '');
      sources.push({ source, item, staged, type: inventory.type });
    }
  }
  return { sources, collisions };
}

/**
 * The `@/registry` specifier a workspace import becomes, which shadcn rewrites to the consumer's
 * aliases on install; undefined for a specifier the build cannot stage, such as a barrel.
 */
export function stagedSpecifier(specifier: string): string | undefined {
  if (specifier.startsWith('@ultima/tokens/')) return `@/registry/ultima/lib/${specifier.slice('@ultima/tokens/'.length)}`;
  if (specifier.startsWith('@ultima/ui/lib/')) return `@/registry/ultima/lib/${specifier.slice('@ultima/ui/lib/'.length)}`;
  if (specifier.startsWith('@ultima/ui/')) return `@/registry/ultima/ui/${specifier.slice('@ultima/ui/'.length)}`;
  return undefined;
}

/** The staged file a rewritten specifier reaches, if the plan stages one. */
export function stagedTarget(specifier: string, sources: StagedSource[]): StagedSource | undefined {
  const rewritten = stagedSpecifier(specifier);
  if (rewritten === undefined) return undefined;
  const base = rewritten.slice('@/registry/'.length);
  return sources.find((source) => source.staged === base || source.staged.replace(/\.tsx?$/, '') === base);
}

/**
 * The items `registry.json` lists, in its order. Setup and artifact items are named here because the
 * build writes each through its own path; a descriptor the plan never names is metadata no build uses.
 */
export function registryPlan(sources: StagedSource[], elements: string[]): PlannedItem[] {
  const staged = [...new Set(sources.map((source) => source.item))];
  const shared = staged.filter((name) => name === 'tokens' || name === 'lib').sort((a, b) => (a === 'tokens' ? -1 : b === 'tokens' ? 1 : 0));
  const components = staged.filter((name) => name !== 'tokens' && name !== 'lib');
  return [
    ...shared.map((name): PlannedItem => ({ name, from: 'staged' })),
    ...components.map((name): PlannedItem => ({ name, from: 'staged' })),
    { name: 'setup-vite', from: 'setup' },
    { name: 'setup-next', from: 'setup' },
    { name: 'tokens-css', from: 'artifact' },
    { name: 'design-md', from: 'artifact' },
    ...[...elements].sort((a, b) => a.localeCompare(b)).map((name): PlannedItem => ({ name, from: 'element' })),
  ];
}
