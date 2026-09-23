// docs/spec/ultima.md, Versioning and drift.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import { format } from 'prettier';
import ts from 'typescript';

export type Scheme = 'c1' | 'b1';

/** The `aliases` of a consumer's `components.json`. */
export type Aliases = { ui?: string; lib?: string };

export type Stamp = { item: string; revision: string; scheme: string; hash: string };

/** The catalogue's format version, at `meta.ultima.format` in `/r/registry.json`. */
export const REGISTRY_FORMAT = 1;

const STAMP = /^(?:\/\/ (.+)|\/\* (.+) \*\/)$/;
const STAMP_BODY = /^@ultima\/(\S+) (\S+) ([a-z][a-z0-9]*):([0-9a-f]{16})$/;

// A change to these options, or to Prettier's pinned version, is scheme c2.
const C1_PRINT = {
  parser: 'typescript',
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',
  trailingComma: 'all',
  bracketSpacing: true,
  bracketSameLine: false,
  objectWrap: 'collapse',
  arrowParens: 'always',
  endOfLine: 'lf',
} as const;

/** The commit the build runs at, as twelve hex characters, or `local` off a commit. */
export function catalogueRevision(cwd: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8', stdio: 'pipe' }).trim().slice(0, 12);
  } catch {
    return 'local';
  }
}

export async function canonicalize(source: string, scheme: Scheme, aliases?: Aliases): Promise<string> {
  const lf = source.replace(/\r\n/g, '\n');
  if (scheme === 'b1') {
    const lines = lf.split('\n');
    if (readStamp(lf)) lines.splice(lastLine(lines), 1);
    return lines.join('\n');
  }
  const printed = await format(neutralSource(lf, aliases), C1_PRINT);
  return printed
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n');
}

export async function contentHash(source: string, scheme: Scheme, aliases?: Aliases): Promise<string> {
  const digest = createHash('sha256').update(await canonicalize(source, scheme, aliases)).digest('hex');
  return `${scheme}:${digest.slice(0, 16)}`;
}

export function stampLine(item: string, revision: string, hash: string, syntax: 'ts' | 'css'): string {
  const body = `@ultima/${item} ${revision} ${hash}`;
  return syntax === 'ts' ? `// ${body}` : `/* ${body} */`;
}

/**
 * Puts the stamp on the last line. shadcn returns ts-morph's `getText()`, which drops a
 * file's leading comments, so only a trailing one survives install.
 */
export function withStamp(text: string, line: string): string {
  return `${text.endsWith('\n') ? text : `${text}\n`}${line}\n`;
}

export function readStamp(fileText: string): Stamp | null {
  const lines = fileText.replace(/\r\n/g, '\n').split('\n');
  const [, lineComment, blockComment] = lines[lastLine(lines)]?.match(STAMP) ?? [];
  const match = (lineComment ?? blockComment)?.match(STAMP_BODY);
  if (!match) return null;
  const [, item, revision, scheme, hash] = match as unknown as [string, string, string, string, string];
  return { item, revision, scheme, hash };
}

function lastLine(lines: string[]): number {
  let index = lines.length - 1;
  while (index > 0 && (lines[index] as string).trim() === '') index -= 1;
  return index;
}

function parse(source: string): ts.SourceFile {
  const tsx = ts.createSourceFile('file.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const failed = (tsx as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics.length > 0;
  return failed ? ts.createSourceFile('file.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS) : tsx;
}

function neutralSource(source: string, aliases: Aliases = {}): string {
  const prefixes: Record<string, string> = {
    '@/registry/ultima/ui/': '@ultima/ui/',
    '@/registry/ultima/lib/': '@ultima/lib/',
  };
  if (aliases.ui) prefixes[`${aliases.ui}/`] = '@ultima/ui/';
  if (aliases.lib) prefixes[`${aliases.lib}/`] = '@ultima/lib/';
  const neutral = Object.entries(prefixes).sort(([a], [b]) => b.length - a.length);
  const specifier = (text: string) => {
    const found = neutral.find(([prefix]) => text.startsWith(prefix));
    return found ? found[1] + text.slice(found[0].length) : text;
  };

  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const { factory } = context;
    const visit = (node: ts.Node): ts.Node | undefined => {
      if (ts.isStringLiteral(node) && isModuleSpecifier(node)) {
        return factory.createStringLiteral(specifier(node.text));
      }
      if (ts.isJsxExpression(node) && !node.expression && ts.isJsxElement(node.parent)) return undefined;
      return ts.visitEachChild(node, visit, context);
    };
    return (file) => {
      const prologue = file.statements.slice(0, firstNonDirective(file));
      const statements = file.statements.filter(
        (statement) =>
          !(prologue.includes(statement) && ((statement as ts.ExpressionStatement).expression as ts.StringLiteral).text === 'use client'),
      );
      return ts.visitEachChild(factory.updateSourceFile(file, statements), visit, context);
    };
  };

  const file = parse(source);
  const [result] = ts.transform(file, [transformer]).transformed;
  return ts.createPrinter({ removeComments: true }).printFile(result as ts.SourceFile);
}

function firstNonDirective(file: ts.SourceFile): number {
  const index = file.statements.findIndex(
    (statement) => !(ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)),
  );
  return index === -1 ? file.statements.length : index;
}

function isModuleSpecifier(node: ts.StringLiteral): boolean {
  const { parent } = node;
  if ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) return true;
  if (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent)) return true;
  return ts.isCallExpression(parent) && parent.expression.kind === ts.SyntaxKind.ImportKeyword;
}
