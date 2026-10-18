// docs/spec/ultima.md, Consumer CLI, Update, The installed base. A `diverged` `c1` file's base is its item's authored
// source at the stamp's revision, rebuilt by the registry build's rules and accepted only when it hashes to the stamp.
import { basename } from 'node:path';

import { renderAsInstalled } from './diff.ts';
import { rewriteImports, withBaseThemeMarker } from './rebuild.ts';
import type { ConsumerScope } from './scope.ts';
import { contentHash, stampLine, withStamp } from './stamp.ts';
import type { CatalogueItem, Row } from './status.ts';

export type Base = { text: string } | { reason: string };

export type BaseCatalogue = {
  /** The raw URL template, with `{revision}` and `{path}`; null when the registry names no source. */
  source: string | null;
  items: CatalogueItem[];
  /** Each raw URL fetched once per run. */
  fetched: Map<string, Promise<Base>>;
};

/** The base `row` was installed from, as installed into this project, or why there is none. */
export async function installedBase(row: Row, catalogue: BaseCatalogue, scope: Pick<ConsumerScope, 'aliases' | 'components'>): Promise<Base> {
  const { installed } = row;
  if (!installed?.hash.startsWith('c1:')) return { reason: 'only a c1 file has an installed base' };
  if (installed.revision === 'local') return { reason: 'installed from a build outside a git checkout (revision local)' };
  if (catalogue.source === null) return { reason: 'the registry names no source repository' };

  const item = catalogue.items.find(({ name }) => name === row.item);
  const names = item?.files.map(({ path }) => basename(path)) ?? [];
  const name = names.includes(basename(row.file)) ? basename(row.file) : names.length === 1 ? names[0] : undefined;
  const path = item && name && (item.meta?.ultima?.sources?.[name] ?? authoredPath(item, name));
  if (!path) return { reason: `the catalogue names no source path for ${row.file}` };

  const url = catalogue.source.replace('{revision}', installed.revision).replace('{path}', path);
  if (!catalogue.fetched.has(url)) catalogue.fetched.set(url, fetchSource(url));
  const fetched = await (catalogue.fetched.get(url) as Promise<Base>);
  if ('reason' in fetched) return fetched;

  try {
    const staged = withBaseThemeMarker(row.item, rewriteImports(fetched.text, path), 'ts');
    const text = renderAsInstalled(withStamp(staged, stampLine(row.item, installed.revision, installed.hash, 'ts')), scope.aliases, scope.components.rsc === true);
    const hash = await contentHash(text, 'c1', scope.aliases);
    if (hash !== installed.hash) return { reason: `${path} at ${installed.revision} rebuilds to ${hash}, not the stamp's ${installed.hash}` };
    return { text };
  } catch (error) {
    return { reason: `${path} at ${installed.revision} does not rebuild: ${(error as Error).message}` };
  }
}

/** Where the build staged an item's file from, for a catalogue served before `meta.ultima.sources`. */
function authoredPath({ name: item, type }: CatalogueItem, name: string): string | undefined {
  if (item === 'tokens') return `packages/tokens/src/${name}`;
  if (item === 'lib') return `packages/ui/src/lib/${name}`;
  if (type === 'registry:block') return `packages/blocks/src/${item}/${name}`;
  if (type === 'registry:ui') return `packages/ui/src/${name}`;
  return undefined;
}

async function fetchSource(url: string): Promise<Base> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (response.status === 404) return { reason: `${url} answered 404, so the file is not in the repository at that revision` };
    if (!response.ok) return { reason: `${url} answered ${response.status}` };
    return { text: await response.text() };
  } catch (error) {
    const { message, cause } = error as Error & { cause?: { code?: string; message?: string } };
    return { reason: `${url} could not be fetched: ${cause?.code ?? cause?.message ?? message}` };
  }
}
