// Executable MDX through the docs site's own MDX pipeline, with every location kept in the original
// document. Importing this module installs the parser; the workspace run does, the consumer CLI does not.
import { createProcessor } from '@mdx-js/mdx';

import { parse } from '../../../scripts/catalogue/source.ts';
import { type MdxAttribute, type Parsed, type Segment, syntaxProblems, useMdxParser } from './sources.ts';

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
  const parsed: Parsed = { path, text, segments: [], elements: [], attributes: [], examples: [], problems: [] };
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
  const braced = (from: number, to: number, role: Segment['role'], value = false) => {
    const open = text.indexOf('{', from);
    const close = text.lastIndexOf('}', to - 1);
    if (open < 0 || close <= open) return;
    const inner = text.slice(open + 1, close);
    // A spread attribute is not an expression on its own; an array literal holds it without moving offsets.
    if (/^\s*\.\.\./.test(inner)) segment(`[${inner}]`, open, role);
    // An attribute value is one expression: parentheses keep `{{ … }}` an object rather than a block.
    else if (value) segment(`(${inner})`, open, role);
    else segment(inner, open + 1, role);
  };

  const visit = (node: MdNode) => {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined) {
      if (node.type === 'mdxjsEsm') segment(text.slice(start, end), start, 'esm');
      else if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') braced(start, end, 'expression');
      else if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        const attributes: MdxAttribute[] = [];
        for (const attribute of node.attributes ?? []) {
          const from = attribute.position?.start.offset;
          const to = attribute.position?.end.offset;
          if (from === undefined || to === undefined) continue;
          const spread = attribute.type === 'mdxJsxExpressionAttribute';
          const value = attribute.value;
          attributes.push({
            name: spread ? null : (attribute.name ?? null),
            value: spread || (typeof value === 'object' && value !== null) ? undefined : typeof value === 'string' ? value : null,
            start: from,
            end: to,
          });
        }
        parsed.elements.push({ name: node.name ?? null, start, end, attributes });
      } else if (node.type === 'code' || node.type === 'inlineCode') parsed.examples.push({ start, end });
    }
    for (const attribute of node.attributes ?? []) {
      const from = attribute.position?.start.offset;
      const to = attribute.position?.end.offset;
      if (from === undefined || to === undefined) continue;
      const valued = typeof attribute.value === 'object' && attribute.value !== null && (attribute.value as MdNode).type === 'mdxJsxAttributeValueExpression';
      if (attribute.type !== 'mdxJsxExpressionAttribute' && !valued) continue;
      const before = parsed.segments.length;
      braced(from, to, 'expression', valued);
      if (attribute.type === 'mdxJsxAttribute' && typeof attribute.name === 'string' && parsed.segments.length > before) {
        parsed.attributes.push({ element: node.name ?? null, name: attribute.name, segment: before });
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(tree);
  return parsed;
}

useMdxParser(parseMdx);
