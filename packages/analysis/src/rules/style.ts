// ULT-STYLE-001: StyleX stays the one styling engine. No alternative engine, no authored stylesheet
// outside the documented docs globals, no stylesheet injected at run time, and no inline design style:
// an inline style is a primitive's or StyleX's own output passed through, or a runtime value on a
// structural property. docs/spec/agent-infrastructure.md, Rule catalogue; docs/adr/0001-stylex-only-styling.md.
import ts from 'typescript';

import { importsOf } from '../../../../scripts/catalogue/source.ts';
import { type Piece, categoryOf } from '../grammar.ts';
import { DOCS_KINDS, PRODUCTION_KINDS, type SourceKind } from '../scope.ts';
import type { Parsed, Segment } from '../sources.ts';
import { type Evaluator, createEvaluator, declarationOf, styleXBindings, styleXCall, topLevelName, unwrap } from '../stylex.ts';
import type { Context } from './context.ts';
import { judge } from './tokens.ts';

const ADR_0001 = 'docs/adr/0001-stylex-only-styling.md';
const VALUES = 'docs/spec/agent-infrastructure.md#values-and-runtime-styles';

const STYLE_KINDS: readonly SourceKind[] = [...PRODUCTION_KINDS, ...DOCS_KINDS];
const STYLESHEET = /\.(css|scss|sass|less|styl|pcss)$/;

type Site = { parsed: Parsed; segment: Segment; evaluator: Evaluator };

export function checkStyle(context: Context): void {
  const { scope } = context;
  for (const { path, kind } of scope.inventory) {
    if (!STYLE_KINDS.includes(kind)) continue;
    const parsed = context.source(path);
    if (!parsed) continue;
    for (const segment of parsed.segments) {
      const site: Site = { parsed, segment, evaluator: createEvaluator(scope, path, segment.file) };
      checkImports(context, site, kind);
      checkInjection(context, site);
      inlineChecker(context, site).run();
      if (kind === 'block') checkClassNames(context, site);
    }
    // An MDX page's own JSX: a style attribute, whose value is its own segment.
    const tables = esmStyleTables(parsed);
    for (const attribute of parsed.attributes) {
      if (attribute.name !== 'style') continue;
      const segment = parsed.segments[attribute.segment];
      const statement = segment?.file.statements[0];
      if (!segment || !statement || !ts.isExpressionStatement(statement)) continue;
      const component = attribute.element !== null && /^[A-Z]/.test(attribute.element);
      if (component && namesStyleTable(statement.expression, tables)) continue;
      inlineChecker(context, { parsed, segment, evaluator: createEvaluator(scope, path, segment.file) }).inlineValue(statement.expression, 'style');
    }
    // An MDX page's own JSX: a <style> element in the page body.
    for (const element of parsed.elements) {
      if (element.name === 'style') {
        context.report({
          ruleId: 'ULT-STYLE-001',
          parsed,
          start: element.start,
          end: element.end,
          target: '<style>',
          message: 'The page renders a <style> element, an authored stylesheet outside StyleX.',
          repair: 'Style the page through the components and a stylex.create table.',
          link: ADR_0001,
        });
      }
    }
  }
}

// docs/spec/ultima.md#sources-and-the-files-of-a-block: a block has no style slot, so no className.
function checkClassNames(context: Context, site: Site): void {
  const { file } = site.segment;
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && ['className', 'class'].includes(node.name.getText(file))) {
      report(context, site, node, {
        target: node.name.getText(file),
        message: `A block file sets ${node.name.getText(file)}, a styling path outside StyleX.`,
        repair: 'Spread stylex.props(...) onto a plain element, or pass StyleX styles to a component through its style slot.',
        link: 'docs/spec/ultima.md#sources-and-the-files-of-a-block',
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function report(context: Context, site: Site, node: ts.Node, fields: { target: string; message: string; repair: string; link?: string; selector?: string }): void {
  const { file, shift } = site.segment;
  const symbol = topLevelName(node);
  context.report({
    ruleId: 'ULT-STYLE-001',
    parsed: site.parsed,
    start: node.getStart(file) + shift,
    end: node.getEnd() + shift,
    ...(symbol !== undefined && { symbol }),
    target: fields.target,
    ...(fields.selector !== undefined && { selector: fields.selector }),
    message: fields.message,
    repair: fields.repair,
    link: fields.link ?? ADR_0001,
  });
}

function checkImports(context: Context, site: Site, kind: SourceKind): void {
  const { scope } = context;
  const { parsed, segment } = site;
  const { imports } = importsOf(segment.file);
  for (const entry of imports) {
    if (entry.typeOnly) continue;
    const at = { parsed, start: entry.start + segment.shift, end: entry.end + segment.shift, target: entry.specifier };
    const resolution = scope.resolve(entry.specifier, parsed.path);
    if (resolution.kind === 'external' && scope.styles.engines(resolution.package)) {
      context.report({
        ruleId: 'ULT-STYLE-001',
        ...at,
        message: `The file imports ${resolution.package}, a second styling engine; StyleX is the only one.`,
        repair: 'Write the styles in a stylex.create table and compose them with stylex.props.',
        link: ADR_0001,
      });
      continue;
    }
    const [bare, query = ''] = entry.specifier.split('?');
    if (!STYLESHEET.test(bare as string) || /(^|&)raw(&|$)/.test(query)) continue;
    const path = resolution.kind === 'file' ? resolution.path : undefined;
    const global = path ? scope.globalStyles.find((entry) => entry.stylesheet === path) : undefined;
    if (global && DOCS_KINDS.includes(kind) && global.importers.includes(parsed.path)) continue;
    context.report({
      ruleId: 'ULT-STYLE-001',
      ...at,
      message: global
        ? `The file imports ${path}, the documented global stylesheet, which only ${global.importers.join(' and ')} import.`
        : 'The file imports an authored stylesheet beside StyleX, which bypasses the token and styling contract.',
      repair: global ? 'Import the component that needs the style, or put the rule in a stylex.create table.' : 'Move the rules into a stylex.create table.',
      link: global ? global.authority : ADR_0001,
    });
  }
}

/** A stylesheet created at run time: a `style` element, a constructed sheet, or a rule inserted into one. */
function checkInjection(context: Context, site: Site): void {
  const { file } = site.segment;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      const [first] = node.arguments;
      if (ts.isPropertyAccessExpression(callee)) {
        const name = callee.name.text;
        if (name === 'createElement' && first && ts.isStringLiteralLike(first) && first.text.toLowerCase() === 'style') {
          inject(node, "document.createElement('style')");
        } else if (name === 'insertRule') inject(node, 'insertRule');
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'CSSStyleSheet') inject(node, 'new CSSStyleSheet()');
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'adoptedStyleSheets') inject(node, 'adoptedStyleSheets');
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(file);
      const rel = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(file) === 'rel');
      const stylesheet = rel && ts.isJsxAttribute(rel) && rel.initializer && ts.isStringLiteral(rel.initializer) && rel.initializer.text === 'stylesheet';
      if (tag === 'style' || (tag === 'link' && stylesheet)) inject(node, `<${tag}>`);
    }
    ts.forEachChild(node, visit);
  };
  const inject = (node: ts.Node, target: string) =>
    report(context, site, node, {
      target,
      message: `The file uses ${target}, which injects an authored stylesheet at run time, outside StyleX.`,
      repair: 'Declare the rules in a stylex.create table; a theme is applied with stylex.props or the data-theme attribute.',
    });
  visit(file);
}

/** Names an MDX page's ESM declares as StyleX tables, or imports. */
function esmStyleTables(parsed: Parsed): Set<string> {
  const names = new Set<string>();
  const esm = parsed.segments.filter((segment) => segment.role === 'esm');
  // Each ESM block is its own segment, so the StyleX import and the table may sit in different ones.
  const bindings = { namespaces: new Set<string>(), calls: new Map<string, string>() };
  for (const segment of esm) {
    const found = styleXBindings(segment.file);
    for (const name of found.namespaces) bindings.namespaces.add(name);
    for (const [name, call] of found.calls) bindings.calls.set(name, call);
  }
  for (const segment of esm) {
    for (const statement of segment.file.statements) {
      if (ts.isImportDeclaration(statement) && statement.importClause && !statement.importClause.isTypeOnly) {
        const clause = statement.importClause;
        if (clause.name) names.add(clause.name.text);
        const named = clause.namedBindings;
        if (named && ts.isNamespaceImport(named)) names.add(named.name.text);
        if (named && ts.isNamedImports(named)) for (const element of named.elements) names.add(element.name.text);
      }
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          const init = declaration.initializer && unwrap(declaration.initializer);
          if (ts.isIdentifier(declaration.name) && init && ts.isCallExpression(init) && styleXCall(init, bindings) === 'create') names.add(declaration.name.text);
        }
      }
    }
  }
  return names;
}

/** A page's style slot value built only from its StyleX tables: `styles.x`, or a list of them. */
function namesStyleTable(expression: ts.Expression, tables: Set<string>): boolean {
  const node = unwrap(expression);
  if (ts.isArrayLiteralExpression(node)) return node.elements.every((element) => !ts.isSpreadElement(element) && namesStyleTable(element, tables));
  let base: ts.Expression = node;
  while (ts.isPropertyAccessExpression(base) || ts.isElementAccessExpression(base)) base = base.expression;
  return base !== node && ts.isIdentifier(base) && tables.has(base.text);
}

// ---------------------------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------------------------

/** Whether an expression is the output of stylex.props or stylex.attrs, through consts and local functions. */
function isStyleXResult(expression: ts.Expression, evaluator: Evaluator, seen = new Set<ts.Node>()): boolean {
  const node = unwrap(expression);
  if (ts.isCallExpression(node)) {
    const call = styleXCall(node, evaluator.bindings);
    if (call === 'props' || call === 'attrs') return true;
    const callee = unwrap(node.expression);
    if (ts.isIdentifier(callee)) {
      const found = declarationOf(callee, callee.text);
      if (found?.kind === 'function' && ts.isFunctionDeclaration(found.declaration) && found.declaration.body && !seen.has(found.declaration)) {
        seen.add(found.declaration);
        const returns: ts.Expression[] = [];
        const collect = (inner: ts.Node) => {
          if (ts.isReturnStatement(inner) && inner.expression) returns.push(inner.expression);
          if (!ts.isFunctionLike(inner)) ts.forEachChild(inner, collect);
        };
        ts.forEachChild(found.declaration.body, collect);
        return returns.length > 0 && returns.every((entry) => isStyleXResult(entry, evaluator, seen));
      }
    }
    return false;
  }
  if (ts.isIdentifier(node)) {
    const found = declarationOf(node, node.text);
    if (found?.kind === 'const' && found.initializer && !found.destructured && !seen.has(found.declaration)) {
      seen.add(found.declaration);
      return isStyleXResult(found.initializer, evaluator, seen);
    }
  }
  return false;
}

/** The `style` StyleX or a primitive already produced: `props.style`, or a binding destructured from a StyleX result. */
function isInjectedStyle(expression: ts.Expression, evaluator: Evaluator): boolean {
  const node = unwrap(expression);
  if (ts.isPropertyAccessExpression(node) && node.name.text === 'style') return isStyleXResult(node.expression, evaluator);
  if (ts.isIdentifier(node)) {
    const found = declarationOf(node, node.text);
    if (found?.kind === 'const' && found.destructured && found.initializer) return isStyleXResult(found.initializer, evaluator);
  }
  if (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || node.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
    return isInjectedStyle(node.left, evaluator) && (isInjectedStyle(node.right, evaluator) || ts.isObjectLiteralExpression(unwrap(node.right)));
  }
  return false;
}

/** A StyleX style passed to a component's `style` slot: a table member, a list or condition of them, or nothing. */
function isStyleXStyle(expression: ts.Expression, evaluator: Evaluator): boolean {
  const node = unwrap(expression);
  if (node.kind === ts.SyntaxKind.NullKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return true;
  if (ts.isIdentifier(node) && node.text === 'undefined') return true;
  if (ts.isArrayLiteralExpression(node)) return node.elements.every((element) => !ts.isSpreadElement(element) && isStyleXStyle(element, evaluator));
  if (ts.isConditionalExpression(node)) return isStyleXStyle(node.whenTrue, evaluator) && isStyleXStyle(node.whenFalse, evaluator);
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
    return (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || isStyleXStyle(node.left, evaluator)) && isStyleXStyle(node.right, evaluator);
  }
  if (ts.isCallExpression(node)) {
    // A dynamic style: `styles.fill(value)`.
    return isStyleXStyle(node.expression, evaluator);
  }
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    let base: ts.Expression = node.expression;
    while (ts.isPropertyAccessExpression(base) || ts.isElementAccessExpression(base)) base = base.expression;
    if (!ts.isIdentifier(base)) return false;
    const found = declarationOf(base, base.text);
    if (found?.kind === 'const' && found.initializer) {
      const init = unwrap(found.initializer);
      if (ts.isCallExpression(init) && ['create', 'createTheme'].includes(styleXCall(init, evaluator.bindings) ?? '')) return true;
    }
    // A table imported from another module, such as the shared helpers or the token themes.
    if (found?.kind === 'import') return true;
    return false;
  }
  if (ts.isIdentifier(node)) {
    const found = declarationOf(node, node.text);
    // The caller's own slot, forwarded.
    if (found?.kind === 'parameter' || (found?.kind === 'const' && found.destructured)) return true;
    if (found?.kind === 'import') return true;
    if (found?.kind === 'const' && found.initializer) return isStyleXStyle(found.initializer, evaluator);
  }
  return false;
}

/** Whether a JSX tag is an Ultima component, whose `style` prop is the StyleX slot rather than an inline style. */
function isSlotTag(context: Context, site: Site, tag: ts.JsxTagNameExpression): boolean {
  let root: ts.Node = tag;
  while (ts.isPropertyAccessExpression(root)) root = root.expression;
  if (!ts.isIdentifier(root)) return false;
  if (/^[a-z]/.test(root.text)) return false;
  const found = declarationOf(root, root.text);
  if (found?.kind !== 'import') return true;
  const specifier = found.declaration.moduleSpecifier;
  if (!ts.isStringLiteral(specifier)) return false;
  const resolution = context.scope.resolve(specifier.text, site.parsed.path);
  return resolution.kind === 'file' && ['react-component', 'generated', 'docs', 'demo'].includes(context.scope.kindOf(resolution.path) ?? '');
}

function inlineChecker(context: Context, site: Site) {
  const { file } = site.segment;
  const { evaluator } = site;

  const visit = (node: ts.Node) => {
    // <tag style={…}>
    if (ts.isJsxAttribute(node) && node.name.getText(file) === 'style' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const element = node.parent.parent;
      const tag = ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element) ? element.tagName : undefined;
      const value = node.initializer.expression;
      const slot = tag !== undefined && isSlotTag(context, site, tag);
      if (!(slot && isStyleXStyle(value, evaluator))) inlineValue(value, 'style');
    }
    // { style: { … } } handed to a primitive or useRender.
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === 'style' && ts.isObjectLiteralExpression(unwrap(node.initializer))) {
      inlineValue(node.initializer, 'style');
    }
    // element.style.x = …, element.style.cssText = …, element.style = …
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = unwrap(node.left);
      if (ts.isPropertyAccessExpression(left) && isStyleObject(left.expression)) {
        const property = left.name.text;
        if (property === 'cssText') cssText(node.right, 'style.cssText');
        else declaration(property, node.right, `style.${property}`);
      } else if (ts.isPropertyAccessExpression(left) && left.name.text === 'style') {
        cssText(node.right, 'style');
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      const [first, second] = node.arguments;
      if (ts.isPropertyAccessExpression(callee)) {
        const onStyle = isStyleObject(callee.expression);
        if (onStyle && callee.name.text === 'setProperty' && first && second) {
          const name = staticText(first);
          if (name === undefined) untraced(first, 'style.setProperty', 'The property name is computed');
          else declaration(name, second, 'style.setProperty');
        }
        if (callee.name.text === 'setAttribute' && first && second && staticText(first) === 'style') cssText(second, "setAttribute('style')");
        if (callee.name.text === 'assign' && ts.isIdentifier(callee.expression) && callee.expression.text === 'Object' && first && second) {
          if (isStyleObject(first)) {
            for (const source of node.arguments.slice(1)) inlineValue(source, 'Object.assign(style)');
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  /** An element's `style` declaration object: `el.style`, or a const holding it. */
  const isStyleObject = (expression: ts.Expression): boolean => {
    const node = unwrap(expression);
    if (ts.isPropertyAccessExpression(node)) return node.name.text === 'style';
    if (!ts.isIdentifier(node)) return false;
    const found = declarationOf(node, node.text);
    if (found?.kind !== 'const' || !found.initializer || found.destructured) return false;
    const init = unwrap(found.initializer);
    return ts.isPropertyAccessExpression(init) && init.name.text === 'style';
  };

  const staticText = (expression: ts.Expression): string | undefined => {
    const before = evaluator.unresolved.length;
    const alternatives = evaluator.value(expression);
    evaluator.unresolved.length = before;
    const [only, ...rest] = alternatives;
    if (rest.length > 0 || !only || !only.every((piece) => piece.kind === 'text')) return undefined;
    return only.map((piece) => (piece.kind === 'text' ? piece.text : '')).join('');
  };

  const untraced = (node: ts.Node, target: string, why: string) =>
    report(context, site, node, {
      target,
      message: `${why}, so the checker cannot show this inline style is a primitive's or StyleX's output or a documented runtime value.`,
      repair: 'Pass through the style stylex.props returns, or set a runtime value on its documented property; design values belong in a stylex.create table.',
      link: VALUES,
    });

  /** An inline style value: an object of declarations, or a style StyleX or a primitive produced. */
  const inlineValue = (expression: ts.Expression, target: string) => {
    if (isInjectedStyle(expression, evaluator)) return;
    const object = unwrap(expression);
    if (!ts.isObjectLiteralExpression(object)) {
      untraced(expression, target, 'The inline style comes from an expression the checker cannot trace');
      return;
    }
    for (const member of object.properties) {
      if (ts.isSpreadAssignment(member)) {
        if (!isInjectedStyle(member.expression, evaluator)) untraced(member, target, 'The inline style spreads an object the checker cannot trace');
        continue;
      }
      if (ts.isShorthandPropertyAssignment(member)) {
        declaration(member.name.text, member.name, target);
        continue;
      }
      if (!ts.isPropertyAssignment(member)) {
        untraced(member, target, 'The inline style holds a member that is not a plain property');
        continue;
      }
      const name = evaluator.key(member.name);
      if (name === undefined) untraced(member.name, target, 'The inline style has a computed key');
      else declaration(name, member.initializer, target);
    }
  };

  /** `property: value;` pairs from a static CSS text, each judged like an inline declaration. */
  const cssText = (expression: ts.Expression, target: string) => {
    if (isRestoredStyle(expression)) return;
    const text = staticText(expression);
    if (text === undefined) {
      untraced(expression, target, 'The inline CSS text is computed');
      return;
    }
    const pieces = text
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean);
    const properties = pieces.map((entry) => {
      const colon = entry.indexOf(':');
      const raw = entry.slice(0, colon).trim();
      const property = raw.startsWith('--') ? raw : raw.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
      return { property, value: entry.slice(colon + 1).trim() };
    });
    const clipHidden = properties.some(({ property, value }) => property === 'clipPath' && value === 'inset(50%)');
    for (const { property, value } of properties) judgeInline(property, expression, [[{ kind: 'text', text: value, at: expression }]], target, clipHidden);
  };

  /** The element's own earlier `style` attribute, read back to restore it: no style is authored. */
  const isRestoredStyle = (expression: ts.Expression): boolean => {
    const node = unwrap(expression);
    if (!ts.isIdentifier(node)) return false;
    const found = declarationOf(node, node.text);
    if (found?.kind !== 'const' || !found.initializer || found.destructured) return false;
    const init = unwrap(found.initializer);
    if (!ts.isCallExpression(init) || !ts.isPropertyAccessExpression(init.expression) || init.expression.name.text !== 'getAttribute') return false;
    const [name] = init.arguments;
    return name !== undefined && staticText(name) === 'style';
  };

  const declaration = (property: string, expression: ts.Expression, target: string) => {
    if (isInjectedStyle(expression, evaluator)) return;
    judgeInline(property, expression, evaluator.value(expression), target, false);
  };

  const judgeInline = (property: string, node: ts.Node, alternatives: Piece<ts.Node>[][], target: string, clipHidden: boolean) => {
    const label = `the inline ${target}`;
    judge(
      context,
      site.parsed,
      file,
      { ruleId: 'ULT-STYLE-001', property, node, alternatives, label, clipHidden, ...(topLevelName(node) !== undefined && { symbol: topLevelName(node) }) },
      site.segment.shift,
    );
    if (property.startsWith('--') || !categoryOf(property)) return;
    // A token read inline is a design style that belongs in a table; a primitive bridge is a custom property.
    const token = alternatives.some((alternative) =>
      alternative.some((piece) => piece.kind === 'token' || (piece.kind === 'text' && piece.text.includes('var(--ult-'))),
    );
    if (token) {
      report(context, site, node, {
        target: property,
        message: `The inline ${target} sets ${property} from a token, an inline design style outside the StyleX tables.`,
        repair: `Declare ${property} in a stylex.create table and compose it with stylex.props.`,
      });
    }
  };

  return { run: () => visit(file), inlineValue };
}
