// Parsing for the checker: TypeScript through the shared catalogue parser, executable MDX through the
// docs site's own MDX pipeline (@mdx-js/mdx, in mdx.ts) with every location kept in the original document.
// docs/spec/agent-infrastructure.md, Authority and source scopes.
import ts from 'typescript';

import { parse } from '../../../scripts/catalogue/source.ts';
import type { Position } from './diagnostic.ts';

/** One executable unit of a file. `shift` maps an offset in `file` back to an offset in the original text. */
export type Segment = { file: ts.SourceFile; shift: number; role: 'module' | 'esm' | 'expression' };

/** An attribute of an MDX JSX element. `value` is the literal, null for a bare attribute, undefined for an expression or spread. */
export type MdxAttribute = { name: string | null; value: string | null | undefined; start: number; end: number };

/** A JSX element an MDX page executes, located in the page, with its attributes. */
export type MdxElement = { name: string | null; start: number; end: number; attributes: MdxAttribute[] };

export type Parsed = {
  path: string;
  text: string;
  segments: Segment[];
  /** MDX only. */
  elements: MdxElement[];
  /** MDX only: expression attributes on the page's JSX, by name, and the segment holding each value. */
  attributes: { element: string | null; name: string; segment: number }[];
  /** MDX only: code fences and inline code, which print source rather than execute it. */
  examples: { start: number; end: number }[];
  /** Syntax the parser rejected; any one makes the run incomplete. */
  problems: { start: number; end: number; message: string }[];
};

type ParseDiagnostic = { start: number; length: number; messageText: string | ts.DiagnosticMessageChain };

export function syntaxProblems(file: ts.SourceFile, shift: number): Parsed['problems'] {
  // `parseDiagnostics` is where the scanner and parser record syntax errors; no Program is needed to read it.
  const found = (file as unknown as { parseDiagnostics?: ParseDiagnostic[] }).parseDiagnostics ?? [];
  return found.map((diagnostic) => ({
    start: diagnostic.start + shift,
    end: diagnostic.start + diagnostic.length + shift,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
  }));
}

const cache = new Map<string, Parsed>();

/**
 * The MDX parser, installed by mdx.ts. The workspace run loads it; the consumer CLI never reads an MDX
 * page, so its bundle leaves the MDX pipeline out.
 */
let mdxParser: ((path: string, text: string) => Parsed) | undefined;

export function useMdxParser(parser: (path: string, text: string) => Parsed): void {
  mdxParser = parser;
}

function parseMdx(path: string, text: string): Parsed {
  if (mdxParser) return mdxParser(path, text);
  const problems = [{ start: 0, end: 0, message: 'MDX is not parsed in this run' }];
  return { path, text, segments: [], elements: [], attributes: [], examples: [], problems };
}

/** Parsed once per path and text, so repeated runs over an overlay reuse unchanged files. */
export function parseSource(path: string, text: string): Parsed {
  const key = `${path}\u0000${text}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const parsed = path.endsWith('.mdx') ? parseMdx(path, text) : parseModule(path, text);
  cache.set(key, parsed);
  return parsed;
}

function parseModule(path: string, text: string): Parsed {
  const file = parse(path.replace(/\.(m|c)?js$/, '.ts').replace(/\.jsx$/, '.tsx'), text);
  return { path, text, segments: [{ file, shift: 0, role: 'module' }], elements: [], attributes: [], examples: [], problems: syntaxProblems(file, 0) };
}

/** One-based line and column of an offset in the original text. */
export function positionAt(text: string, offset: number): Position {
  let line = 1;
  let lineStart = 0;
  for (let index = text.indexOf('\n'); index !== -1 && index < offset; index = text.indexOf('\n', index + 1)) {
    line += 1;
    lineStart = index + 1;
  }
  return { line, column: offset - lineStart + 1 };
}
