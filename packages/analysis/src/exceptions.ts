// ULT-EXCEPTION-001: typed, declaration-scoped exceptions with exact match counts and authority links.
// docs/spec/agent-infrastructure.md, Exceptions.
import { posix } from 'node:path';

import ts from 'typescript';

import { readLiteral } from '../../../scripts/catalogue/descriptors.ts';
import type { Diagnostic, Position } from './diagnostic.ts';
import { RULES, exceptable } from './rules.ts';
import type { Scope } from './scope.ts';
import { positionAt } from './sources.ts';

export type ArchitectureException = {
  /** Kebab-case, unique. */
  id: string;
  rule: string;
  /** One exact repository-relative file: never a directory or a glob. */
  path: string;
  /** The top-level declaration, part or binding the site sits in. */
  symbol: string;
  /** The import specifier, directive, call or property the site is about. */
  target: string;
  /** The selector or condition, when the rule reports one. */
  selector?: string;
  /** The allowed expression shape, when the rule reports one. */
  expression?: string;
  /** How many sites the entry must match, exactly. */
  count: number;
  reason: string;
  /** The owning specification section or ADR amendment: docs/spec/<file>.md#<anchor> or docs/adr/<file>.md#<anchor>. */
  authority: string;
};

const FIELDS: Record<keyof ArchitectureException, 'string' | 'number' | 'optional-string'> = {
  id: 'string',
  rule: 'string',
  path: 'string',
  symbol: 'string',
  target: 'string',
  selector: 'optional-string',
  expression: 'optional-string',
  count: 'number',
  reason: 'string',
  authority: 'string',
};

const LINK = RULES['ULT-EXCEPTION-001'].link;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const BROAD = /[*?[\]{}]/;
const AUTHORITY = /^(docs\/(?:spec|adr)\/[a-z0-9-]+\.md)#(.+)$/;

function keyOf(entry: Pick<ArchitectureException, 'rule' | 'path' | 'symbol' | 'target' | 'selector'>): string {
  return [entry.rule, entry.path, entry.symbol, entry.target, entry.selector ?? ''].join('\u0000');
}

/** Where each array element of `export default [...]` starts and ends, for locating an entry. */
function entryRanges(path: string, text: string): { start: number; end: number }[] {
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of file.statements) {
    if (!ts.isExportAssignment(statement)) continue;
    let expression = statement.expression;
    while (ts.isSatisfiesExpression(expression) || ts.isAsExpression(expression) || ts.isParenthesizedExpression(expression)) {
      expression = expression.expression;
    }
    if (ts.isArrayLiteralExpression(expression)) {
      return expression.elements.map((element) => ({ start: element.getStart(file), end: element.getEnd() }));
    }
  }
  return [];
}

/**
 * Validate the exceptions file and apply it to the run's diagnostics. Returns the diagnostics with each
 * exactly matched site removed, the exception findings added, and the number of sites excepted.
 */
export function applyExceptions(scope: Scope, diagnostics: Diagnostic[]): { diagnostics: Diagnostic[]; excepted: number } {
  if (!scope.exceptions) return { diagnostics, excepted: 0 };
  const { path, text } = scope.exceptions;
  const findings: Diagnostic[] = [];
  const at = (start: Position, end: Position, message: string, repair: string, exception?: string) =>
    findings.push({
      ruleId: 'ULT-EXCEPTION-001',
      severity: 'blocking',
      file: path,
      start,
      end,
      message,
      repair,
      link: LINK,
      ...(exception !== undefined && { exception }),
    });
  const top = { line: 1, column: 1 };

  if (text === undefined) {
    return {
      diagnostics: [
        ...diagnostics,
        {
          ruleId: 'ULT-ANALYSIS-001',
          severity: 'incomplete',
          file: path,
          start: top,
          end: top,
          message: 'The exceptions file is missing, so the checker configuration is invalid.',
          repair: 'Restore it; with no exceptions it exports an empty array.',
          link: LINK,
        },
      ],
      excepted: 0,
    };
  }

  const { value, problems } = readLiteral(path, text);
  for (const problem of problems) {
    const line = Number(/^line (\d+)/.exec(problem)?.[1] ?? 1);
    at({ line, column: 1 }, { line, column: 1 }, `The exceptions file is not plain data: ${problem}.`, 'Keep it to type imports and one `export default [...] satisfies ArchitectureException[]`.');
  }
  if (problems.length > 0) return { diagnostics: [...diagnostics, ...findings], excepted: 0 };
  if (!Array.isArray(value)) {
    at(top, top, 'The exceptions file does not export an array.', 'Export an array of ArchitectureException entries.');
    return { diagnostics: [...diagnostics, ...findings], excepted: 0 };
  }

  const ranges = entryRanges(path, text);
  const valid: { entry: ArchitectureException; start: Position; end: Position }[] = [];
  const ids = new Set<string>();
  const keys = new Map<string, string>();

  value.forEach((raw: unknown, index) => {
    const range = ranges[index];
    const start = range ? positionAt(text, range.start) : top;
    const end = range ? positionAt(text, range.end) : top;
    const entry = raw as Record<string, unknown>;
    const id = typeof entry?.id === 'string' ? entry.id : undefined;
    const fail = (message: string, repair: string) => at(start, end, message, repair, id);
    const before = findings.length;

    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      fail(`Entry ${index} is not an object.`, 'Write each exception as an object literal.');
      return;
    }
    for (const key of Object.keys(entry)) {
      if (!(key in FIELDS)) fail(`Entry ${id ?? index} has the unknown field "${key}".`, 'Remove it.');
    }
    for (const [key, type] of Object.entries(FIELDS)) {
      const field = entry[key];
      if (type === 'optional-string' && field === undefined) continue;
      if (type === 'number' ? typeof field !== 'number' : typeof field !== 'string' || field.trim() === '') {
        fail(`Entry ${id ?? index} has no valid "${key}".`, `Give "${key}" a ${type === 'number' ? 'number' : 'non-empty string'}.`);
      }
    }
    if (findings.length > before) return;
    const exception = entry as ArchitectureException;

    if (!KEBAB.test(exception.id)) fail(`Exception id "${exception.id}" is not kebab-case.`, 'Rename it.');
    if (ids.has(exception.id)) fail(`Exception id "${exception.id}" is declared twice.`, 'Give each entry its own id.');
    ids.add(exception.id);
    if (!exceptable(exception.rule)) {
      fail(`"${exception.rule}" is not a rule an exception can name.`, 'Name a checker rule ID; an incomplete analysis or a bad exception is never excepted.');
    }
    if (!Number.isInteger(exception.count) || exception.count < 1) {
      fail(`Exception "${exception.id}" expects ${exception.count} sites.`, 'Set count to the exact positive number of sites it covers.');
    }
    const broad =
      BROAD.test(exception.path) ||
      exception.path.endsWith('/') ||
      posix.normalize(exception.path) !== exception.path ||
      exception.path.startsWith('/') ||
      exception.path.startsWith('..') ||
      BROAD.test(exception.symbol) ||
      BROAD.test(exception.target);
    if (broad) {
      fail(`Exception "${exception.id}" is broad: it names a glob, a directory or a wildcard.`, 'Name one file, one declaration and one target.');
    } else if (scope.files.read(exception.path) === undefined) {
      fail(`Exception "${exception.id}" names ${exception.path}, which is not a file.`, 'Point it at the exact file the site is in, or delete it.');
    }
    const authority = AUTHORITY.exec(exception.authority);
    if (!authority) {
      fail(`Exception "${exception.id}" has the authority "${exception.authority}", which is not docs/spec/<file>.md#<anchor> or docs/adr/<file>.md#<anchor>.`, 'Link the owning specification section or ADR amendment.');
    } else if (!scope.anchors(authority[1] as string)?.has(authority[2] as string)) {
      fail(`Exception "${exception.id}" links ${exception.authority}, which does not exist.`, 'Link a heading that exists; the owning decision must authorize the pattern first.');
    }
    const key = keyOf(exception);
    const twin = keys.get(key);
    if (twin !== undefined) fail(`Exception "${exception.id}" duplicates "${twin}".`, 'Merge them into one entry with the combined count.');
    else keys.set(key, exception.id);
    if (findings.length === before) valid.push({ entry: exception, start, end });
  });

  let excepted = 0;
  const suppressed = new Set<Diagnostic>();
  for (const { entry, start, end } of valid) {
    const matches = diagnostics.filter(
      (diagnostic) =>
        diagnostic.severity !== 'incomplete' &&
        keyOf({ rule: diagnostic.ruleId, path: diagnostic.file, symbol: diagnostic.symbol ?? '', target: diagnostic.target ?? '' }) === keyOf(entry),
    );
    if (matches.length === 0) {
      at(start, end, `Exception "${entry.id}" matches no site: it is stale.`, 'Delete it; the violation it covered is gone.', entry.id);
    } else if (matches.length !== entry.count) {
      at(start, end, `Exception "${entry.id}" matches ${matches.length} sites and expects ${entry.count}.`, 'Fix the new sites, or record the exact count once the owning decision covers them.', entry.id);
    } else {
      for (const match of matches) suppressed.add(match);
      excepted += matches.length;
    }
  }
  return { diagnostics: [...diagnostics.filter((diagnostic) => !suppressed.has(diagnostic)), ...findings], excepted };
}
