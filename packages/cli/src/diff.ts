// docs/spec/ultima.md, Consumer CLI, Diff. Two-way and read-only.
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { OMIT_HEADERS, formatPatch, structuredPatch } from 'diff';

import { type Diagnostic, SPEC } from './diagnostic.ts';
import type { ConsumerScope } from './scope.ts';
import { readStamp } from './stamp.ts';
import { type Row, fetchJson, survey } from './status.ts';

/**
 * A served file as shadcn writes it into this project: the aliases rewritten, and `"use client"` dropped when `rsc`
 * is off. shadcn matches the directive with `/^["']use client["']$/` against the statement's text, which carries its
 * semicolon, so a terminated directive survives.
 */
export function renderAsInstalled(servedFile: string, aliases: ConsumerScope['aliases'], rsc: boolean): string {
  const text = servedFile.replace(
    /(['"])@\/registry\/ultima\/(ui|lib)\//g,
    (_match, quote: string, kind: 'ui' | 'lib') => `${quote}${aliases[kind]}/`,
  );
  return rsc ? text : text.replace(/^(['"])use client\1\n\n?/, '');
}

export async function diff(
  root: string,
  names: string[],
  options: { project?: string },
): Promise<{ usage: string } | { diagnostics: Diagnostic[] } | { output: string }> {
  const surveyed = await survey(root, options);
  if ('diagnostics' in surveyed) return surveyed;
  const { report, scope, url, items } = surveyed;

  const rowsOf = (name: string) => report.files.filter(({ item }) => item === name);
  const unknown = names.filter((name) => rowsOf(name).length === 0 && !items.some((item) => item.name === name));
  if (unknown.length > 0) {
    return { usage: `${unknown.join(', ')} ${unknown.length === 1 ? 'is' : 'are'} neither served by ${report.registry} nor installed here` };
  }

  const blocks: string[] = [];
  const rows = names.length === 0 ? report.files.filter(({ state }) => state !== 'current') : [];
  for (const name of new Set(names)) {
    const ofItem = rowsOf(name);
    if (ofItem.length === 0) blocks.push(`${name}: not installed\n`);
    else if (ofItem.every(({ state }) => state === 'current')) blocks.push(`${name}: current\n`);
    else rows.push(...ofItem.filter(({ state }) => state !== 'current'));
  }

  const served = new Map<string, { path: string; content?: string }[] | undefined>();
  for (const row of rows) {
    if (row.state === 'retired') {
      blocks.push(`${row.item}: retired, the registry no longer serves ${row.file}\n`);
      continue;
    }
    if (!served.has(row.item)) {
      const item = (await fetchJson(url.replace('{name}', row.item))) as { files?: { path: string; content?: string }[] } | undefined;
      served.set(row.item, item?.files);
    }
    const files = served.get(row.item) ?? [];
    const content = (files.find(({ path }) => basename(path) === basename(row.file)) ?? (files.length === 1 ? files[0] : undefined))?.content;
    if (content === undefined) return incomplete(row, url.replace('{name}', row.item));
    blocks.push(patch(root, row, renderAsInstalled(content, scope.aliases, scope.components.rsc === true), readStamp(content)?.revision ?? report.revision));
  }
  return { output: blocks.join('') };
}

function patch(root: string, row: Row, installed: string, revision: string | null): string {
  const local = readFileSync(join(root, row.file), 'utf8');
  const hunks = formatPatch(structuredPatch(row.file, row.file, local, installed), OMIT_HEADERS);
  return [
    `--- ${row.file}  (local, ${row.state}, installed ${row.installed?.revision ?? '-'})\n`,
    `+++ ${row.file}  (@ultima/${row.item} at ${revision ?? 'none'})\n`,
    hunks,
  ].join('');
}

function incomplete(row: Row, itemUrl: string): { diagnostics: Diagnostic[] } {
  return {
    diagnostics: [
      {
        ruleId: 'ULT-DIFF-001',
        severity: 'incomplete',
        file: row.file,
        message: `The served content of ${row.item} could not be fetched from ${itemUrl}.`,
        repair: `Check the network and that ${itemUrl} serves the item with its file contents.`,
        link: `${SPEC}#diff`,
      },
    ],
  };
}
