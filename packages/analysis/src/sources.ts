// Parsing for the checker: TypeScript through the shared catalogue parser, executable MDX through the
// docs site's own MDX pipeline (@mdx-js/mdx) with every location kept in the original document.
// docs/spec/agent-infrastructure.md, Authority and source scopes.
import { createProcessor } from '@mdx-js/mdx';
import ts from 'typescript';

import { parse } from '../../../scripts/catalogue/source.ts';
import type { Position } from './diagnostic.ts';

/** One executable unit of a file. `shift` maps an offset in `file` back to an offset in the original text. */
export type Segment = { file: ts.SourceFile; shift: number; role: 'module' | 'esm' | 'expression' };

/** A JSX element an MDX page executes, located in the page. */
export type MdxElement = { name: string | null; start: number; end: number };

export type Parsed = {
  path: string;
  text: string;
  segments: Segment[];
  /** MDX only. */
  elements: MdxElement[];
  /** MDX only: code fences and inline code, which print source rather than execute it. */
  examples: { start: number; end: number }[];
  /** Syntax the parser rejected; any one makes the run incomplete. */
  problems: { start: number; end: number; message: string }[];
};

type ParseDiagnostic = { start: number; length: number; messageText: string | ts.DiagnosticMessageChain };

function syntaxProblems(file: ts.SourceFile, shift: number): Parsed['problems'] {
  // `parseDiagnostics` is where the scanner and parser record syntax errors; no Program is needed to read it.
  const found = (file as unknown as { parseDiagnostics?: ParseDiagnostic[] }).parseDiagnostics ?? [];
  return found.map((diagnostic) => ({
    start: diagnostic.start + shift,
    end: diagnostic.start + diagnostic.length + shift,
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
  }));
}

const cache = new Map<string, Parsed>();

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
  return { path, text, segments: [{ file, shift: 0, role: 'module' }], elements: [], examples: [], problems: syntaxProblems(file, 0) };
}

type Point = { offset?: number };
type MdNode = {
  type: string;
  name?: string | null;
  value?: unknown;
  position?: { start: Point; end: Point };
  attributes?: MdNode[];
  children?: MdNode[];
};

const processor = createProcessor();

function parseMdx(path: string, text: string): Parsed {
  const parsed: Parsed = { path, text, segments: [], elements: [], examples: [], problems: [] };
  let tree: MdNode;
  try {
    tree = processor.parse(text) as unknown as MdNode;
  } catch (error) {
    const place = error as { place?: { offset?: number; start?: { offset?: number } }; reason?: string; message?: string };
    const offset = place.place?.offset ?? place.place?.start?.offset ?? 0;
    parsed.problems.push({ start: offset, end: offset, message: place.reason ?? String(place.message ?? error) });
    return parsed;
  }

  const segment = (inner: string, shift: number, role: Segment['role']) => {
    const file = parse(`${path}.${parsed.segments.length}.tsx`, inner);
    parsed.segments.push({ file, shift, role });
    parsed.problems.push(...syntaxProblems(file, shift));
  };
  /** The code between a node's braces, sliced from the original so offsets map exactly. */
  const braced = (from: number, to: number, role: Segment['role']) => {
    const open = text.indexOf('{', from);
    const close = text.lastIndexOf('}', to - 1);
    if (open < 0 || close <= open) return;
    const inner = text.slice(open + 1, close);
    // A spread attribute is not an expression on its own; an array literal holds it without moving offsets.
    if (/^\s*\.\.\./.test(inner)) segment(`[${inner}]`, open, role);
    else segment(inner, open + 1, role);
  };

  const visit = (node: MdNode) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      if (node.type === 'mdxjsEsm') segment(text.slice(start, end), start, 'esm');
      else if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') braced(start, end, 'expression');
      else if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        parsed.elements.push({ name: node.name ?? null, start, end });
      } else if (node.type === 'code' || node.type === 'inlineCode') parsed.examples.push({ start, end });
    }
    for (const attribute of node.attributes ?? []) {
      const from = attribute.position?.start.offset;
      const to = attribute.position?.end.offset;
      if (from === undefined || to === undefined) continue;
      const expression =
        attribute.type === 'mdxJsxExpressionAttribute' ||
        (typeof attribute.value === 'object' && attribute.value !== null && (attribute.value as MdNode).type === 'mdxJsxAttributeValueExpression');
      if (expression) braced(from, to, 'expression');
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return parsed;
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
