// ULT-VISUAL-001: the rules in docs/spec/design-foundations.md that a StyleX table can
// show on its own, read per style namespace. docs/spec/agent-infrastructure.md, Visual rules.
import ts from 'typescript';

import type { Piece } from '../grammar.ts';
import type { Parsed } from '../sources.ts';
import { type Declaration, createEvaluator, declarationsOf } from '../stylex.ts';
import type { Context } from './context.ts';
import { TOKEN_KINDS } from './tokens.ts';

const FOUNDATIONS = 'docs/spec/design-foundations.md';

/** A condition naming focus: the only place an outline, and never a shadow, draws a ring. */
const FOCUS = /:focus/;
/** A condition naming the one current item: the selected tab, the active link. */
const CURRENT = /data-active|data-selected|aria-current|aria-selected/;

const BORDER_COLOR = /^border(Block|Inline)?(Start|End|Top|Right|Bottom|Left)?Color$/;
const BORDER_WIDTH = /^border(Block|Inline)?(Start|End|Top|Right|Bottom|Left)?Width$/;
const OUTLINE = /^outline(Color|Style|Width)?$/;

type Pieces = Piece<ts.Node>[];

function tokens(alternatives: readonly Pieces[]): Extract<Piece<ts.Node>, { kind: 'token' }>[] {
  return alternatives.flat().filter((piece): piece is Extract<Piece<ts.Node>, { kind: 'token' }> => piece.kind === 'token');
}

/** The literal a declaration takes when it is one plain text piece in every alternative. */
function literals(alternatives: readonly Pieces[]): string[] | undefined {
  const texts: string[] = [];
  for (const alternative of alternatives) {
    const [only, ...rest] = alternative;
    if (!only || rest.length > 0 || only.kind !== 'text') return undefined;
    texts.push(only.text.trim());
  }
  return texts;
}

/** A value that draws nothing: `none`, a zero, `transparent`, or unset. */
function draws(alternatives: readonly Pieces[]): boolean {
  if (alternatives.every((alternative) => alternative.every((piece) => piece.kind === 'null'))) return false;
  const texts = literals(alternatives);
  return texts === undefined || texts.some((text) => !['none', '0', 'transparent', 'initial', 'unset'].includes(text));
}

export function checkVisual(context: Context): void {
  const { scope } = context;
  for (const { path, kind } of scope.inventory) {
    if (!TOKEN_KINDS.includes(kind)) continue;
    const parsed = context.source(path);
    const segment = parsed?.segments[0];
    if (!parsed || !segment) continue;
    const { file } = segment;
    const evaluator = createEvaluator(scope, path, file);
    // Unresolved values are ULT-TOKEN-001's to report; this rule judges what resolves.
    const { declarations } = declarationsOf(file, evaluator);

    const namespaces = new Map<string, { declaration: Declaration; values: Pieces[] }[]>();
    for (const declaration of declarations) {
      if (declaration.call !== 'create') continue;
      const symbol = `${declaration.table}.${declaration.namespace}`;
      namespaces.set(symbol, [...(namespaces.get(symbol) ?? []), { declaration, values: evaluator.value(declaration.value) }]);
    }

    for (const [symbol, entries] of namespaces) {
      const read = (test: (property: string) => boolean) => entries.filter(({ declaration }) => test(declaration.property)).flatMap(({ values }) => tokens(values));
      const edge = read((property) => BORDER_COLOR.test(property)).some((token) => token.family === 'color');
      const controlEdge = read((property) => BORDER_COLOR.test(property)).some((token) => token.label.includes("'--ult-color-border-strong'"));
      const scrim = read((property) => property === 'backgroundColor').some((token) => token.label.includes("'--ult-color-surface-overlay'"));

      for (const { declaration, values } of entries) {
        const { property, conditions } = declaration;
        const at = (message: string, repair: string, section: string) => report(context, parsed, file, declaration, symbol, { message, repair, link: `${FOUNDATIONS}#${section}` });
        const where = conditions.length > 0 ? `${symbol} under ${conditions.join(' ')}` : symbol;
        const shadow = tokens(values).some((token) => token.family === 'shadow');

        if (property === 'boxShadow' && conditions.some((condition) => FOCUS.test(condition)) && draws(values)) {
          at(
            `${where} draws focus with box-shadow, which forced-colors mode removes`,
            'Draw focus with an outline: `${border.focus} solid ${color[\'--ult-color-border-focus\']}` and `border.focusOffset`.',
            'outlines-and-borders',
          );
        } else if (property === 'boxShadow' && shadow && !edge) {
          at(
            `${where} casts a shadow with no border color in the same namespace, so the edge vanishes where the shadow does: in dark mode, in a theme with elevation 0, and in forced colors`,
            "Set borderColor (usually color['--ult-color-border']), borderStyle and borderWidth in the same namespace as the shadow.",
            'elevation',
          );
        }

        if (OUTLINE.test(property) && !conditions.some((condition) => FOCUS.test(condition)) && draws(values)) {
          at(
            `${where} draws an outline outside a focus state; an outline is for focus only`,
            'Draw structure with a border, and keep the outline under :focus-visible.',
            'outlines-and-borders',
          );
        }

        if (property === 'backdropFilter' && draws(values) && !scrim) {
          at(
            `${where} blurs what is behind it, but only the modal scrim blurs`,
            "Remove the blur. A popup separates with a border and a shadow; a modal backdrop reads color['--ult-color-surface-overlay'] beside the blur.",
            'blur',
          );
        }
        if (property === 'filter' && values.flat().some((piece) => (piece.kind === 'text' && /blur\(/.test(piece.text)) || (piece.kind === 'token' && piece.family === 'filter'))) {
          at(`${where} blurs its own content, which reads as broken`, 'Show loading with Skeleton and disabled with the disabled colors.', 'blur');
        }

        if (BORDER_WIDTH.test(property)) {
          const widths = tokens(values).map((token) => token.label);
          if (widths.includes('border.fine') && controlEdge) {
            at(
              `${where} draws a control edge at 0.5px; an edge a person uses to find a control stays 1px`,
              'Use border.hairline for an edge whose color is border-strong.',
              'borders',
            );
          }
          if (widths.includes('border.focus') && !conditions.some((condition) => CURRENT.test(condition))) {
            at(
              `${where} draws a 2px border; 2px is for the focus outline and the current-item indicator`,
              'Use border.fine for a decorative edge or border.hairline for a control edge; emphasis comes from a darker color step.',
              'borders',
            );
          }
        }
      }
    }
  }
}

function report(
  context: Context,
  parsed: Parsed,
  file: ts.SourceFile,
  declaration: Declaration,
  symbol: string,
  finding: { message: string; repair: string; link: string },
): void {
  context.report({
    ...finding,
    ruleId: 'ULT-VISUAL-001',
    parsed,
    start: declaration.value.getStart(file),
    end: declaration.value.getEnd(),
    symbol,
    target: declaration.property,
    ...(declaration.conditions.length > 0 && { selector: declaration.conditions.join(' ') }),
    expression: declaration.value.getText(file).replace(/\s+/g, ' '),
    message: `${finding.message}.`,
  });
}
