// ULT-DOCS-001, ULT-DOCS-002 and the advisory ULT-DOCS-REVIEW-001: a docs file may arrange and set
// type and flow spacing; it may not paint a surface, hide a native scrollbar, or hand the user a control
// built from plain elements. docs/spec/agent-infrastructure.md, Docs controls and surfaces; docs/spec/
// ultima.md, The line between a component and page layout.
import ts from 'typescript';

import type { SourceKind } from '../scope.ts';
import type { MdxElement, Parsed, Segment } from '../sources.ts';
import { type Pieces, createEvaluator, declarationOf, declarationsOf, joinText, topLevelName, unwrap } from '../stylex.ts';
import type { Context } from './context.ts';
import { reportUnresolved } from './tokens.ts';

const RULE = 'docs/spec/agent-infrastructure.md#docs-controls-and-surfaces';
const LINE = 'docs/spec/ultima.md#the-line-between-a-component-and-page-layout';

const KINDS: readonly SourceKind[] = ['docs', 'content', 'block'];

const SUBJECT: Partial<Record<SourceKind, { file: string; where: string }>> = {
  block: { file: 'a block file', where: 'a block file' },
};
const subjectOf = (kind: SourceKind) => SUBJECT[kind] ?? { file: 'a docs file', where: 'docs chrome' };

// ---------------------------------------------------------------------------------------------------
// The policy, kept here as data so its fixtures can name each line.

type Paint = 'surface' | 'scrollbar';

/**
 * The properties a docs file may not write. The first three prongs of the page-layout line, stated
 * mechanically: a background, a border, a shadow or a radius paints a surface; a scrollbar width or
 * color takes the platform's own affordance away. `borderStyle` and the table properties paint nothing
 * on their own and stay page layout, as they did for the scanner this replaces.
 */
export function paintOf(property: string): Paint | undefined {
  if (property === 'background' || property === 'backgroundColor' || property === 'backgroundImage') return 'surface';
  if (property === 'boxShadow') return 'surface';
  if (property.startsWith('border') && !property.endsWith('Style') && property !== 'borderCollapse' && property !== 'borderSpacing') {
    return 'surface';
  }
  if (property === 'scrollbarWidth' || property === 'scrollbarColor') return 'scrollbar';
  return undefined;
}

/**
 * A value that removes the property rather than painting with it: taking a component's border or fill
 * away is not painting a surface. `null` is StyleX's own removal. A scrollbar is only restored by `auto`;
 * `none` is exactly what the scrollbar prong forbids.
 */
const RESETS: Record<Paint, ReadonlySet<string>> = {
  surface: new Set(['0', '0px', 'none', 'transparent']),
  scrollbar: new Set(['auto']),
};

/** Native elements that are application controls. docs/spec/agent-infrastructure.md, Docs controls and surfaces. */
export const CONTROLS: ReadonlySet<string> = new Set(['button', 'input', 'select', 'textarea', 'option', 'summary']);

/** ARIA widget roles: a native element carrying one stands in for a kit control. Structure and live-region roles are not listed. */
export const WIDGET_ROLES: ReadonlySet<string> = new Set([
  'button',
  'checkbox',
  'combobox',
  'grid',
  'gridcell',
  'link',
  'listbox',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'radiogroup',
  'scrollbar',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'tablist',
  'tabpanel',
  'textbox',
  'tree',
  'treegrid',
  'treeitem',
]);

/** Handlers that make a plain element respond to the user the way a widget does. */
const HANDLERS: ReadonlySet<string> = new Set([
  'onClick',
  'onDoubleClick',
  'onKeyDown',
  'onKeyUp',
  'onKeyPress',
  'onMouseDown',
  'onMouseUp',
  'onPointerDown',
  'onPointerUp',
  'onTouchStart',
  'onTouchEnd',
]);

/** Plain elements whose handlers are not a widget: a link navigates, a label forwards, a form submits. */
const NOT_WIDGETS: ReadonlySet<string> = new Set(['a', 'label', 'form']);

// ---------------------------------------------------------------------------------------------------

export function checkDocs(context: Context): void {
  for (const { path, kind } of context.scope.inventory) {
    if (!KINDS.includes(kind)) continue;
    const parsed = context.source(path);
    if (!parsed) continue;
    const imports = importMap(parsed);
    parsed.segments.forEach((segment, index) => {
      checkSurfaces(context, parsed, segment, subjectOf(kind));
      checkControls(context, parsed, segment, index, imports, subjectOf(kind));
    });
    for (const element of parsed.elements) checkMdxElement(context, parsed, element);
  }
}

// ---------------------------------------------------------------------------------------------------
// ULT-DOCS-001, on the shared StyleX walker: every create and keyframes declaration under any import
// spelling, through spreads, computed keys, condition objects and dynamic style functions.

/** The literal text of a constant expression, through local const aliases. */
function stringOf(node: ts.Expression, depth = 0): string | undefined {
  const value = unwrap(node);
  if (ts.isStringLiteralLike(value) || ts.isNumericLiteral(value)) return value.text;
  if (ts.isIdentifier(value) && depth < 8) {
    const found = declarationOf(value, value.text);
    return found?.kind === 'const' && !found.destructured && found.initializer ? stringOf(found.initializer, depth + 1) : undefined;
  }
  return undefined;
}

function isReset(alternative: Pieces, paint: Paint): boolean {
  if (alternative.every((piece) => piece.kind === 'null')) return true;
  const text = joinText(alternative);
  return text !== undefined && RESETS[paint].has(text.trim());
}

function checkSurfaces(context: Context, parsed: Parsed, segment: Segment, subject: { file: string }): void {
  const { file, shift } = segment;
  const evaluator = createEvaluator(context.scope, parsed.path, file);
  if (evaluator.bindings.namespaces.size === 0 && evaluator.bindings.calls.size === 0) return;
  const { declarations, unresolved } = declarationsOf(file, evaluator);
  const pseudos = new Set<string>();

  for (const declaration of declarations) {
    const symbol = `${declaration.table}.${declaration.namespace}`;
    const pseudo = declaration.conditions.find((condition) => condition.startsWith('::-webkit-scrollbar'));
    const paint: Paint | undefined = pseudo ? 'scrollbar' : paintOf(declaration.property);
    if (!paint) continue;
    if (pseudo) {
      // One finding per scrollbar block, whatever it declares inside.
      if (pseudos.has(`${symbol} ${pseudo}`)) continue;
      pseudos.add(`${symbol} ${pseudo}`);
    } else if (evaluator.value(declaration.value).every((alternative) => isReset(alternative, paint))) {
      continue;
    }
    const conditions = declaration.conditions.filter((condition) => condition !== pseudo);
    const property = pseudo ?? declaration.property;
    const where = conditions.length > 0 ? ` under ${conditions.join(' ')}` : '';
    const surface = paint === 'surface';
    context.report({
      ruleId: 'ULT-DOCS-001',
      parsed,
      start: declaration.value.getStart(file) + shift,
      end: declaration.value.getEnd() + shift,
      symbol,
      target: property,
      ...(conditions.length > 0 && { selector: conditions.join(' ') }),
      expression: declaration.value.getText(file).replace(/\s+/g, ' '),
      message: surface
        ? `${symbol}${where} declares ${property}, which paints a surface: ${subject.file} may arrange and set type, and may not paint a background, border, shadow or radius.`
        : `${symbol}${where} declares ${property}, which hides or repaints the native scrollbar without a component painting a replacement.`,
      repair: surface
        ? 'Compose the Ultima component that paints this surface, or add one to the catalogue. A recorded decision that authorizes this exact declaration goes in packages/analysis/exceptions.ts.'
        : 'Remove the declaration and keep the native scrollbar, or render the region through Scroll Area.',
      link: LINE,
    });
  }
  reportUnresolved(context, parsed, file, [...unresolved, ...evaluator.unresolved], shift);
}

// ---------------------------------------------------------------------------------------------------
// ULT-DOCS-002 and ULT-DOCS-REVIEW-001

export type Imported = { specifier: string; imported: string };

/** Each local import binding in the file, across an MDX page's ESM blocks. */
export function importMap(parsed: Parsed): Map<string, Imported> {
  const map = new Map<string, Imported>();
  for (const segment of parsed.segments) {
    for (const statement of segment.file.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const clause = statement.importClause;
      if (!clause || clause.isTypeOnly) continue;
      const specifier = statement.moduleSpecifier.text;
      if (clause.name) map.set(clause.name.text, { specifier, imported: 'default' });
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) map.set(bindings.name.text, { specifier, imported: '*' });
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (!element.isTypeOnly) map.set(element.name.text, { specifier, imported: (element.propertyName ?? element.name).text });
        }
      }
    }
  }
  return map;
}

/**
 * Whether a JSX tag, written `Name` or `Name.Part`, is an Ultima React component: the import resolves to
 * a component source, directly or through a generated barrel's named re-export. A docs wrapper that
 * merely accepts a prop named `render` is not.
 */
function isUltimaComponent(context: Context, parsed: Parsed, tag: string, imports: Map<string, Imported>): boolean {
  const [root, member] = tag.split('.');
  const binding = imports.get(root as string);
  if (!binding) return false;
  const name = binding.imported === '*' ? member : binding.imported;
  if (!name) return false;
  const { scope } = context;
  const resolved = scope.resolve(binding.specifier, parsed.path);
  if (resolved.kind !== 'file') return false;
  const kind = scope.kindOf(resolved.path);
  if (kind === 'react-component') return true;
  if (kind !== 'generated') return false;
  const barrel = context.source(resolved.path);
  if (!barrel) return false;
  for (const segment of barrel.segments) {
    for (const statement of segment.file.statements) {
      if (!ts.isExportDeclaration(statement) || statement.isTypeOnly || !statement.moduleSpecifier) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier) || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) continue;
      const exported = statement.exportClause.elements.find((element) => !element.isTypeOnly && element.name.text === name);
      if (!exported) continue;
      const target = scope.resolve(statement.moduleSpecifier.text, resolved.path);
      return target.kind === 'file' && scope.kindOf(target.path) === 'react-component';
    }
  }
  return false;
}

export function tagText(name: ts.JsxTagNameExpression): string | undefined {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isPropertyAccessExpression(name)) {
    const owner = tagText(name.expression as ts.JsxTagNameExpression);
    return owner === undefined ? undefined : `${owner}.${name.name.text}`;
  }
  if (ts.isJsxNamespacedName(name)) return `${name.namespace.text}:${name.name.text}`;
  return undefined;
}

export const intrinsic = (tag: string) => /^[a-z]/.test(tag) && !tag.includes('.');

/** Frames a render value may pass through between the element and the attribute it is handed to. */
function passes(node: ts.Node): boolean {
  return (
    ts.isParenthesizedExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isReturnStatement(node) ||
    ts.isBlock(node) ||
    ts.isConditionalExpression(node) ||
    (ts.isBinaryExpression(node) &&
      [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind))
  );
}

/** The component a native element is handed to through `render`, when it is handed to one. */
export function renderOwner(element: ts.Node, attribute: Parsed['attributes'][number] | undefined): string | null | undefined {
  let current: ts.Node = element;
  for (let parent = current.parent; parent; current = parent, parent = parent.parent) {
    if (passes(parent)) continue;
    if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)) {
      const attribute = parent.parent;
      if (!ts.isIdentifier(attribute.name) || attribute.name.text !== 'render') return undefined;
      const opening = attribute.parent.parent;
      return tagText(opening.tagName) ?? null;
    }
    // An MDX attribute expression is its own segment; its owner is the MDX element the segment records.
    if (ts.isExpressionStatement(parent) && ts.isSourceFile(parent.parent) && attribute) {
      return attribute.name === 'render' ? attribute.element : undefined;
    }
    return undefined;
  }
  return undefined;
}

function jsxParentTag(element: ts.Node): string | undefined {
  for (let parent = element.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent)) return tagText(parent.openingElement.tagName);
    if (passes(parent) || ts.isCallExpression(parent) || (ts.isJsxExpression(parent) && !ts.isJsxAttribute(parent.parent))) continue;
    return undefined;
  }
  return undefined;
}

export function attributeNamed(attributes: ts.JsxAttributes, name: string): ts.JsxAttribute | undefined {
  return attributes.properties.find((property): property is ts.JsxAttribute => ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name);
}

/** A literal attribute value; null for a bare attribute; undefined for an expression that does not resolve. */
export function attributeValue(attribute: ts.JsxAttribute): string | null | undefined {
  const initializer = attribute.initializer;
  if (!initializer) return null;
  if (ts.isStringLiteral(initializer)) return initializer.text;
  if (ts.isJsxExpression(initializer) && initializer.expression) {
    const value = unwrap(initializer.expression);
    if (ts.isPrefixUnaryExpression(value) && value.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(value.operand)) {
      return `-${value.operand.text}`;
    }
    return stringOf(value);
  }
  return undefined;
}

export const firstRole = (value: string) => value.trim().split(/\s+/)[0] ?? '';

function checkControls(
  context: Context,
  parsed: Parsed,
  segment: Segment,
  index: number,
  imports: Map<string, Imported>,
  subject: { where: string },
): void {
  const { file, shift } = segment;
  const attribute = parsed.attributes.find((entry) => entry.segment === index);
  const at = (node: ts.Node) => ({ parsed, start: node.getStart(file) + shift, end: node.getEnd() + shift });

  const nativeControl = (node: ts.Node, tagNode: ts.Node, tag: string) => {
    const owner = renderOwner(node, attribute);
    if (owner && isUltimaComponent(context, parsed, owner, imports)) return;
    const select = tag === 'option' ? jsxParentTag(node) : undefined;
    if (select && isUltimaComponent(context, parsed, select, imports)) return;
    const symbol = topLevelName(node);
    context.report({
      ruleId: 'ULT-DOCS-002',
      ...at(tagNode),
      ...(symbol !== undefined && { symbol }),
      target: `<${tag}>`,
      message: owner
        ? `A native <${tag}> is handed to ${owner} through render, and ${owner} does not resolve to an Ultima component, so nothing establishes the control's behavior and styles.`
        : `A native <${tag}> is an application control built from a plain element in ${subject.where}.`,
      repair: `Render the Ultima control instead, or hand the <${tag}> to an Ultima component through its render prop.`,
      link: RULE,
    });
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const tag = tagText(node.tagName);
      if (tag !== undefined && intrinsic(tag)) {
        const element = ts.isJsxOpeningElement(node) ? node.parent : node;
        const symbol = topLevelName(node);
        if (CONTROLS.has(tag)) nativeControl(element, node.tagName, tag);
        const role = attributeNamed(node.attributes, 'role');
        const value = role ? attributeValue(role) : null;
        if (role && value === undefined) {
          context.report({
            ruleId: 'ULT-ANALYSIS-001',
            ...at(role),
            ...(symbol !== undefined && { symbol }),
            target: 'role',
            message: `The role of a native <${tag}> is computed, so the checker cannot establish whether it stands in for a kit control.`,
            repair: 'Write the role as a literal, or render the Ultima component the role describes.',
            link: RULE,
          });
        } else if (role && typeof value === 'string' && WIDGET_ROLES.has(firstRole(value))) {
          context.report({
            ruleId: 'ULT-DOCS-002',
            ...at(role),
            ...(symbol !== undefined && { symbol }),
            target: `role="${firstRole(value)}"`,
            message: `A native <${tag}> takes role="${firstRole(value)}", a widget role standing in for a kit control.`,
            repair: 'Render the Ultima component that implements this widget instead of assigning its role to a plain element.',
            link: RULE,
          });
        } else if (!CONTROLS.has(tag) && !NOT_WIDGETS.has(tag)) {
          review(node, tag, symbol);
        }
      }
    } else if (ts.isCallExpression(node)) {
      // `createElement('button')`, from React or the DOM, is the same element without JSX.
      const callee = unwrap(node.expression);
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
      const [first] = node.arguments;
      const tag = name === 'createElement' && first ? stringOf(first) : undefined;
      if (tag && CONTROLS.has(tag)) nativeControl(node, first as ts.Node, tag);
    }
    ts.forEachChild(node, visit);
  };

  const review = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, tag: string, symbol: string | undefined) => {
    const handlers = node.attributes.properties
      .filter((property): property is ts.JsxAttribute => ts.isJsxAttribute(property) && ts.isIdentifier(property.name))
      .map((property) => (property.name as ts.Identifier).text)
      .filter((name) => HANDLERS.has(name));
    const tabIndex = attributeNamed(node.attributes, 'tabIndex');
    const tabValue = tabIndex ? attributeValue(tabIndex) : null;
    // A negative tabIndex is a programmatic focus target, such as a skip link's destination, never a tab stop.
    const focusable = tabIndex !== undefined && !(typeof tabValue === 'string' && tabValue.startsWith('-'));
    if (handlers.length === 0 && !focusable) return;
    const what = [...handlers, ...(focusable ? ['tabIndex'] : [])].join(', ');
    context.report({
      ruleId: 'ULT-DOCS-REVIEW-001',
      ...at(node.tagName),
      ...(symbol !== undefined && { symbol }),
      target: `<${tag}>`,
      message: `A plain <${tag}> carries ${what}. Static analysis cannot establish whether it is a hand-built widget: its role, keyboard handling and focus ring are unchecked.`,
      repair: `Review: does this <${tag}> hand the user a control? If so, render the Ultima component; if not, drop the handler or record why it is not a widget.`,
      link: RULE,
    });
  };

  visit(file);
}

/** Page JSX outside expressions: the MDX elements themselves. */
function checkMdxElement(context: Context, parsed: Parsed, element: MdxElement): void {
  const tag = element.name;
  if (tag === null || !intrinsic(tag)) return;
  const tagSpan = { parsed, start: element.start + 1, end: element.start + 1 + tag.length };
  if (CONTROLS.has(tag)) {
    context.report({
      ruleId: 'ULT-DOCS-002',
      ...tagSpan,
      target: `<${tag}>`,
      message: `A native <${tag}> is an application control built from a plain element on an MDX page.`,
      repair: `Render the Ultima control instead, or show the markup in a demo module.`,
      link: RULE,
    });
  }
  const role = element.attributes.find((attribute) => attribute.name === 'role');
  if (role && role.value === undefined) {
    context.report({
      ruleId: 'ULT-ANALYSIS-001',
      parsed,
      start: role.start,
      end: role.end,
      target: 'role',
      message: `The role of a native <${tag}> is computed, so the checker cannot establish whether it stands in for a kit control.`,
      repair: 'Write the role as a literal, or render the Ultima component the role describes.',
      link: RULE,
    });
  } else if (role && typeof role.value === 'string' && WIDGET_ROLES.has(firstRole(role.value))) {
    context.report({
      ruleId: 'ULT-DOCS-002',
      parsed,
      start: role.start,
      end: role.end,
      target: `role="${firstRole(role.value)}"`,
      message: `A native <${tag}> takes role="${firstRole(role.value)}", a widget role standing in for a kit control.`,
      repair: 'Render the Ultima component that implements this widget instead of assigning its role to a plain element.',
      link: RULE,
    });
  } else if (!CONTROLS.has(tag) && !NOT_WIDGETS.has(tag)) {
    const handlers = element.attributes.map((attribute) => attribute.name).filter((name): name is string => name !== null && HANDLERS.has(name));
    const tabIndex = element.attributes.find((attribute) => attribute.name === 'tabIndex');
    const focusable = tabIndex !== undefined && !(typeof tabIndex.value === 'string' && tabIndex.value.trim().startsWith('-'));
    if (handlers.length > 0 || focusable) {
      const what = [...handlers, ...(focusable ? ['tabIndex'] : [])].join(', ');
      context.report({
        ruleId: 'ULT-DOCS-REVIEW-001',
        ...tagSpan,
        target: `<${tag}>`,
        message: `A plain <${tag}> carries ${what}. Static analysis cannot establish whether it is a hand-built widget: its role, keyboard handling and focus ring are unchecked.`,
        repair: `Review: does this <${tag}> hand the user a control? If so, render the Ultima component; if not, drop the handler.`,
        link: RULE,
      });
    }
  }
}
