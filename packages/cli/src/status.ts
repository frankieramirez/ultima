// docs/spec/ultima.md, Consumer CLI, Status, executing Versioning and drift. Read-only.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import { type Diagnostic, SPEC } from './diagnostic.ts';
import { type ConsumerScope, consumerScope } from './scope.ts';
import { REGISTRY_FORMAT, type Scheme, contentHash, readStamp } from './stamp.ts';

export type State = 'current' | 'edited' | 'behind' | 'diverged' | 'unstamped' | 'retired';

const READABLE_FORMATS = { min: 1, max: REGISTRY_FORMAT };
const SCHEMES: string[] = ['c1', 'b1'] satisfies Scheme[];
const UPGRADE = 'npm install -D @ultima-systems/cli@latest';

export type Row = {
  item: string;
  file: string;
  state: State | 'unknown-scheme';
  installed: { revision: string; hash: string } | null;
  local: string | null;
  served: string | null;
};

export type StatusReport = { registry: string; revision: string | null; files: Row[] };

type CatalogueItem = {
  name: string;
  type: string;
  files: { path: string; target?: string }[];
  meta?: { ultima?: { revision: string; files: Record<string, string> } };
};

type Served = { item: string; name: string; installPath: string; hash: string };

/** The States table: the first row that matches wins. `served` is null when the catalogue no longer serves the file. */
export function fileState(installed: string | null, local: string, served: string | null): State {
  if (served === null) return 'retired';
  if (local === served) return 'current';
  if (installed === null) return 'unstamped';
  if (installed === served) return 'edited';
  if (local === installed) return 'behind';
  return 'diverged';
}

export async function status(root: string, options: { project?: string }): Promise<StatusReport | { diagnostics: Diagnostic[] }> {
  const scope = consumerScope(root, options);
  if ('incomplete' in scope) return { diagnostics: [scope.incomplete] };

  const namespace = (scope.components.registries as Record<string, unknown> | undefined)?.['@ultima'];
  const url = typeof namespace === 'object' && namespace !== null ? (namespace as { url?: unknown }).url : namespace;
  if (typeof url !== 'string' || !url.includes('{name}')) {
    return incomplete(
      'ULT-STATUS-001',
      'components.json',
      'components.json names no @ultima registry, so there is nothing to compare against.',
      'Set "@ultima": "https://ultima.systems/r/{name}.json" inside "registries".',
    );
  }

  const catalogueUrl = url.replace('{name}', 'registry');
  const catalogue = await fetchJson(catalogueUrl);
  if (catalogue === undefined) {
    return incomplete('ULT-STATUS-002', 'components.json', `The catalogue at ${catalogueUrl} could not be fetched.`, `Check the network and that ${catalogueUrl} serves registry.json.`);
  }
  const { meta, items = [] } = catalogue as { meta?: { ultima?: { format?: unknown } }; items?: CatalogueItem[] };
  const format = meta?.ultima?.format;
  if (typeof format !== 'number' || format < READABLE_FORMATS.min || format > READABLE_FORMATS.max) {
    return incomplete(
      'ULT-STATUS-003',
      'components.json',
      `The registry at ${catalogueUrl} is in format ${format ?? 'none'}, and this CLI reads formats ${READABLE_FORMATS.min} to ${READABLE_FORMATS.max}.`,
      `Upgrade the CLI: \`${UPGRADE}\`.`,
    );
  }

  const served = servedFiles(root, scope, items);
  const files: Row[] = [];
  for (const path of installedCandidates(root, scope, served)) {
    const row = await rowFor(root, path, scope, served, url);
    if (row) files.push(row);
  }
  files.sort((a, b) => a.item.localeCompare(b.item) || a.file.localeCompare(b.file));
  return {
    registry: url.replace(/\/\{name\}\.json$/, ''),
    revision: items.find(({ meta }) => meta?.ultima)?.meta?.ultima?.revision ?? null,
    files,
  };
}

function servedFiles(root: string, scope: ConsumerScope, items: CatalogueItem[]): Served[] {
  const folder: Record<string, string> = { 'registry:ui': scope.directories.ui, 'registry:lib': scope.directories.lib };
  return items.flatMap(({ name: item, type, files, meta }) =>
    files.flatMap(({ path, target }) => {
      const name = basename(path);
      const hash = meta?.ultima?.files[name];
      const at = target ? join(root, target.replace(/^~\//, '')) : folder[type] && join(folder[type], name);
      return hash && at ? [{ item, name, installPath: at, hash }] : [];
    }),
  );
}

function installedCandidates(root: string, scope: ConsumerScope, served: Served[]): string[] {
  const listed = [scope.directories.ui, scope.directories.lib].flatMap((directory) =>
    existsSync(directory)
      ? readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => join(directory, entry.name))
      : [],
  );
  const targets = served.map(({ installPath }) => installPath).filter((path) => existsSync(path));
  return [...new Set([...listed, ...targets])];
}

async function rowFor(
  root: string,
  path: string,
  scope: ConsumerScope,
  served: Served[],
  url: string,
): Promise<Row | null> {
  const text = readFileSync(path, 'utf8');
  const stamp = readStamp(text);
  const name = basename(path);
  let match: Served | undefined;
  if (stamp) {
    const ofItem = served.filter(({ item }) => item === stamp.item);
    match = ofItem.find((file) => file.name === name) ?? (ofItem.length === 1 ? ofItem[0] : undefined);
  } else {
    match = served.find((file) => file.installPath === path);
    if (!match) return null;
  }

  const installed = stamp && `${stamp.scheme}:${stamp.hash}`;
  const servedScheme = match?.hash.split(':')[0];
  const scheme = [servedScheme, stamp?.scheme].find((candidate) => candidate && SCHEMES.includes(candidate)) as Scheme | undefined;
  const local = scheme ? await contentHash(text, scheme, scope.aliases) : null;
  const servedHash = match && scheme && scheme !== servedScheme ? await servedHashInScheme(url, match, scheme) : (match?.hash ?? null);

  const row = {
    item: stamp?.item ?? (match as Served).item,
    file: relative(root, path),
    installed: stamp && { revision: stamp.revision, hash: installed as string },
    local,
    served: servedHash,
  };
  if (local === null || (stamp && !SCHEMES.includes(stamp.scheme) && local !== servedHash)) {
    return { ...row, state: 'unknown-scheme' };
  }
  return { ...row, state: fileState(installed, local, servedHash) };
}

/** The served file's hash in a scheme this CLI knows, from its content, when the catalogue states it in one it does not. */
async function servedHashInScheme(url: string, served: Served, scheme: Scheme): Promise<string | null> {
  const item = (await fetchJson(url.replace('{name}', served.item))) as { files?: { path: string; content?: string }[] } | undefined;
  const content = item?.files?.find(({ path }) => basename(path) === served.name)?.content;
  return content === undefined ? null : contentHash(content, scheme);
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.json() : undefined;
  } catch {
    return undefined;
  }
}

function incomplete(ruleId: string, file: string, message: string, repair: string): { diagnostics: Diagnostic[] } {
  return { diagnostics: [{ ruleId, severity: 'incomplete', file, message, repair, link: `${SPEC}#status` }] };
}

const CLOSING: Partial<Record<Row['state'], (items: string[]) => string>> = {
  behind: (items) => `npx shadcn add ${items.map((item) => `@ultima/${item}`).join(' ')} --overwrite`,
  diverged: (items) => `npx @ultima-systems/cli diff ${items.join(' ')}  (reinstalling discards your edits)`,
  retired: (items) => `the registry no longer serves ${items.join(', ')}; those files are yours alone now`,
  'unknown-scheme': (items) =>
    `${items.join(', ')} ${items.length === 1 ? 'carries' : 'carry'} a hash scheme this CLI does not know; upgrade it: ${UPGRADE}`,
};

export function printStatus({ registry, revision, files }: StatusReport): string {
  const closing = Object.entries(CLOSING).flatMap(([state, line]) => {
    const items = [...new Set(files.filter((row) => row.state === state).map(({ item }) => item))];
    return items.length > 0 ? [[state, (line as (items: string[]) => string)(items)]] : [];
  });
  const table = [['item', 'file', 'state', 'installed'], ...files.map((row) => [row.item, row.file, row.state, row.installed?.revision ?? '-'])];
  const width = (column: string[]) => Math.max(...column.map((cell) => cell.length)) + 2;
  const first = width([...table.map(([item]) => item as string), ...closing.map(([state]) => state as string)]);
  const widths = [first, width(table.map((row) => row[1] as string)), width(table.map((row) => row[2] as string))];
  const line = (cells: string[]) => cells.map((cell, index) => (index < cells.length - 1 ? cell.padEnd(widths[index] as number) : cell)).join('');

  const lines = [`Registry  ${registry}  revision ${revision ?? 'none'}`, ''];
  if (files.length === 0) lines.push('No installed Ultima files found.');
  else lines.push(...table.map(line));
  if (closing.length > 0) lines.push('', ...closing.map(([state, text]) => `${(state as string).padEnd(first)}${text}`));
  return `${lines.join('\n')}\n`;
}
