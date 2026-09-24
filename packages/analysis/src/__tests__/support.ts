import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type Files, diskFiles } from '../../../../scripts/catalogue/files.ts';
import { check } from '../check.ts';
import type { Diagnostic, Report } from '../diagnostic.ts';
import { workspaceScope } from '../workspace.ts';

export const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
export const repository = diskFiles(root);

export function fixture(path: string): string {
  return readFileSync(join(root, 'packages/analysis/fixtures', path), 'utf8');
}

export function source(path: string): string {
  return repository.read(path) as string;
}

/** The repository with some files replaced, added (a string) or removed (null). */
export function overlay(base: Files, changes: Record<string, string | null>): Files {
  return {
    ...(base.realpath && { realpath: (path: string) => (path in changes ? path : (base.realpath as (path: string) => string)(path)) }),
    read: (path) => (path in changes ? (changes[path] ?? undefined) : base.read(path)),
    list(directory) {
      const entries = new Map((base.list(directory) ?? []).map((entry) => [entry.name, entry.directory]));
      const prefix = directory ? `${directory}/` : '';
      for (const [path, text] of Object.entries(changes)) {
        if (!path.startsWith(prefix)) continue;
        const [name, ...rest] = path.slice(prefix.length).split('/');
        if (rest.length > 0) entries.set(name as string, true);
        else if (text === null) entries.delete(name as string);
        else entries.set(name as string, false);
      }
      if (entries.size === 0) return base.list(directory);
      return [...entries].map(([name, isDirectory]) => ({ name, directory: isDirectory })).sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}

export function run(changes: Record<string, string | null> = {}): Report {
  return check(workspaceScope(overlay(repository, changes)));
}

export type Expected = { ruleId: string; file: string; line: number; column: number; symbol?: string; target?: string; selector?: string };

/** The run's diagnostics reduced to what a fixture asserts: rule, file and start, plus symbol, target and selector when set. */
export function located(report: Report, file?: string): Expected[] {
  return report.diagnostics
    .filter((diagnostic) => file === undefined || diagnostic.file === file)
    .map((diagnostic: Diagnostic) => ({
      ruleId: diagnostic.ruleId,
      file: diagnostic.file,
      line: diagnostic.start.line,
      column: diagnostic.start.column,
      ...(diagnostic.symbol !== undefined && { symbol: diagnostic.symbol }),
      ...(diagnostic.target !== undefined && { target: diagnostic.target }),
      ...(diagnostic.selector !== undefined && { selector: diagnostic.selector }),
    }));
}

/** Insert `line` after the file's first line, which keeps a component's directive first. */
export function afterFirstLine(text: string, line: string): string {
  const end = text.indexOf('\n');
  return `${text.slice(0, end + 1)}${line}\n${text.slice(end + 1)}`;
}

/**
 * An exceptions fixture with the repository's own entries appended, so a test about one entry does not
 * turn the sites the repository already excepts back into violations. The fixture's lines are unchanged.
 */
export function withRepositoryExceptions(text: string): string {
  const own = source('packages/analysis/exceptions.ts');
  const entries = own.slice(own.indexOf('export default [') + 'export default ['.length, own.lastIndexOf('] satisfies'));
  const end = text.lastIndexOf('] satisfies');
  const head = text.slice(0, end).trimEnd();
  const joiner = head.endsWith('[') || head.endsWith(',') ? '' : ',';
  return `${head}${joiner}${entries}${text.slice(end)}`;
}
