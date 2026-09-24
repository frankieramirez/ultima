// ULT-TOKEN-001: every declaration in a component's or element's StyleX tables takes its design value
// from a declared semantic token or compile-time constant, under the property's category in the value
// grammar. docs/spec/agent-infrastructure.md, Values and runtime styles; docs/spec/ultima.md, Tokens in
// component code.
import ts from 'typescript';

import { type Context as GrammarContext, type Piece, categoryOf, checkValue } from '../grammar.ts';
import type { SourceKind } from '../scope.ts';
import type { Parsed } from '../sources.ts';
import { type Declaration, type Evaluator, type Unresolved, createEvaluator, declarationsOf, styleXCall, tokenModel, topLevelName } from '../stylex.ts';
import type { Context } from './context.ts';

const INFRA = 'docs/spec/agent-infrastructure.md';
export const VALUES = `${INFRA}#values-and-runtime-styles`;
export const GRAMMAR = `${INFRA}#value-grammar`;
const TOKENS = 'docs/spec/ultima.md#tokens-in-component-code';

/** "React and element component declarations": the component files, the shared helpers and the elements. */
export const TOKEN_KINDS: readonly SourceKind[] = ['react-component', 'react-helper', 'element'];

/** One declaration to judge, wherever it came from: a StyleX table or an inline style. */
export type Judged = {
  ruleId: 'ULT-TOKEN-001' | 'ULT-STYLE-001';
  property: string;
  /** The value's expression, for its location and its reported shape. */
  node: ts.Node;
  alternatives: Piece<ts.Node>[][];
  symbol?: string;
  selector?: string;
  clipHidden?: boolean;
  glyph?: boolean;
  /** Prefix for the message: where the declaration sits. */
  label: string;
};

function expressionText(node: ts.Node, file: ts.SourceFile): string {
  return node.getText(file).replace(/\s+/g, ' ');
}

/** Judge one declaration against its category, reporting each distinct problem once. */
export function judge(context: Context, parsed: Parsed, file: ts.SourceFile, declaration: Judged, shift = 0): void {
  const { scope } = context;
  const model = tokenModel(scope);
  const category = categoryOf(declaration.property);
  const expression = expressionText(declaration.node, file);
  const common = {
    parsed,
    ...(declaration.symbol !== undefined && { symbol: declaration.symbol }),
    target: declaration.property,
    ...(declaration.selector !== undefined && { selector: declaration.selector }),
    expression,
  };
  if (!category) {
    context.report({
      ruleId: 'ULT-ANALYSIS-001',
      ...common,
      start: declaration.node.getStart(file) + shift,
      end: declaration.node.getEnd() + shift,
      message: `In ${declaration.label}, ${declaration.property} is a property the value grammar does not classify, so its value cannot be checked.`,
      repair: `Classify ${declaration.property} in the value grammar (packages/analysis/src/grammar.ts) with the category its values take, and document it.`,
      link: GRAMMAR,
    });
    return;
  }
  const grammar: GrammarContext = {
    property: declaration.property,
    ...(scope.itemOf(parsed.path) !== undefined && { item: scope.itemOf(parsed.path) }),
    ...(declaration.clipHidden && { clipHidden: true }),
    ...(declaration.glyph && { glyph: true }),
    variables: scope.styles.variables,
    tokenByName: (name) => model.byName.get(name),
  };
  const seen = new Set<string>();
  for (const alternative of declaration.alternatives) {
    for (const problem of checkValue(category, alternative, grammar)) {
      const key = `${problem.at.pos}:${problem.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      context.report({
        ruleId: problem.kind === 'unresolved' ? 'ULT-ANALYSIS-001' : declaration.ruleId,
        ...common,
        start: problem.at.getStart(file) + shift,
        end: problem.at.getEnd() + shift,
        message: `In ${declaration.label}, ${problem.message}.`,
        repair: problem.repair,
        link: problem.kind === 'unresolved' ? GRAMMAR : declaration.ruleId === 'ULT-TOKEN-001' ? TOKENS : VALUES,
      });
    }
  }
}

export function reportUnresolved(context: Context, parsed: Parsed, file: ts.SourceFile, unresolved: readonly Unresolved[], shift = 0): void {
  const seen = new Set<string>();
  for (const { node, reason } of unresolved) {
    const key = `${node.pos}:${node.end}:${reason}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const name = topLevelName(node);
    context.report({
      ruleId: 'ULT-ANALYSIS-001',
      parsed,
      start: node.getStart(file) + shift,
      end: node.getEnd() + shift,
      ...(name !== undefined && { symbol: name }),
      target: 'stylex',
      message: `${reason}, so the value contract there cannot be established.`,
      repair: 'Write the declaration, key or spread so it resolves statically: a literal, a token read, or a module-scope const.',
      link: GRAMMAR,
    });
  }
}

/** Namespaces applied to an inline `<svg>`: their `1em` box and inherited color are glyph geometry. */
function glyphNamespaces(file: ts.SourceFile, evaluator: Evaluator): Set<string> {
  const found = new Set<string>();
  const collect = (node: ts.Node) => {
    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && ts.isIdentifier(node.expression)) {
      const member = ts.isPropertyAccessExpression(node) ? node.name.text : ts.isStringLiteralLike(node.argumentExpression) ? node.argumentExpression.text : undefined;
      if (member !== undefined) found.add(`${node.expression.text}.${member}`);
    }
    ts.forEachChild(node, collect);
  };
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(file) === 'svg') {
      for (const attribute of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(attribute)) {
          const call = ts.isCallExpression(attribute.expression) ? attribute.expression : undefined;
          if (call && (styleXCall(call, evaluator.bindings) === 'props' || styleXCall(call, evaluator.bindings) === 'attrs')) collect(call);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

export function checkTokens(context: Context): void {
  const { scope } = context;
  for (const { path, kind } of scope.inventory) {
    if (!TOKEN_KINDS.includes(kind)) continue;
    const parsed = context.source(path);
    const segment = parsed?.segments[0];
    if (!parsed || !segment) continue;
    const { file } = segment;
    const evaluator = createEvaluator(scope, path, file);
    const { declarations, unresolved } = declarationsOf(file, evaluator);
    const glyphs = glyphNamespaces(file, evaluator);

    // The clip-hidden recipe carries its own 1px box: a namespace that clips with inset(50%).
    const clipHidden = new Set<string>();
    for (const declaration of declarations) {
      if (declaration.property !== 'clipPath') continue;
      const values = evaluator.value(declaration.value);
      if (values.some((alternative) => alternative.length === 1 && alternative[0]?.kind === 'text' && alternative[0].text === 'inset(50%)')) {
        clipHidden.add(`${declaration.table}.${declaration.namespace}`);
      }
    }

    // A 1em by 1em box is a glyph box: docs/spec/ultima.md, Iconography, "Size is 1em".
    const ems = new Map<string, Set<string>>();
    for (const declaration of declarations) {
      if (declaration.conditions.length > 0 || !['width', 'height', 'inlineSize', 'blockSize'].includes(declaration.property)) continue;
      const [only, ...rest] = evaluator.value(declaration.value);
      if (rest.length > 0 || !only || only.length !== 1 || only[0]?.kind !== 'text' || only[0].text !== '1em') continue;
      const symbol = `${declaration.table}.${declaration.namespace}`;
      ems.set(symbol, (ems.get(symbol) ?? new Set()).add(declaration.property));
    }
    for (const [symbol, properties] of ems) {
      if ((properties.has('width') && properties.has('height')) || (properties.has('inlineSize') && properties.has('blockSize'))) glyphs.add(symbol);
    }

    for (const declaration of declarations) {
      const symbol = `${declaration.table}.${declaration.namespace}`;
      judge(context, parsed, file, {
        ruleId: 'ULT-TOKEN-001',
        property: declaration.property,
        node: declaration.value,
        alternatives: evaluator.value(declaration.value),
        symbol,
        ...(declaration.conditions.length > 0 && { selector: declaration.conditions.join(' ') }),
        clipHidden: clipHidden.has(symbol),
        glyph: glyphs.has(symbol),
        label: labelOf(declaration),
      });
    }
    reportUnresolved(context, parsed, file, [...unresolved, ...evaluator.unresolved]);
  }
}

function labelOf(declaration: Declaration): string {
  const where = declaration.conditions.length > 0 ? ` under ${declaration.conditions.join(' ')}` : '';
  return `${declaration.table}.${declaration.namespace}${where}`;
}
