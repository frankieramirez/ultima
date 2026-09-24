// The consumer rules `check` runs over a consumer scope: docs/spec/ultima.md, Consumer CLI, Check.
// ULT-APP-PALETTE-001: no palette reads. ULT-APP-PAINT-001: paint reads a semantic token or a value the
// contributor grammar allows, and arrangement is free. The kit rules are in kit.ts. Styling the checker cannot read is listed as
// unsupported analysis, never a pass and never a finding. Every rule here is file-local.
import ts from 'typescript';

import { importsOf } from '../../../../scripts/catalogue/source.ts';
import { CATEGORIES, type Category, type CategoryId, type Context as GrammarContext, type Piece, categoryOf, checkValue, groupKind } from '../grammar.ts';
import { packageName } from '../policy.ts';
import { APP_RULES, CHECK_SPEC } from '../rules.ts';
import type { Parsed } from '../sources.ts';
import { type Evaluator, type TokenGroup, createEvaluator, declarationOf, declarationsOf, groupsIn, tokenModel, topLevelName, unwrap } from '../stylex.ts';
import type { Context } from './context.ts';
import { checkKit } from './kit.ts';

/** Paint is color, shadow, radius, border width and the type scale; everything else is arrangement. */
const PAINT: readonly CategoryId[] = [
  'color',
  'paint',
  'radius',
  'border-width',
  'border',
  'shadow',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'font-family',
];

/** The tokens page section for each paint category, where the tokens to read instead are listed. */
const SECTION: Partial<Record<CategoryId, string>> = {
  color: 'color',
  paint: 'color',
  radius: 'radius',
  shadow: 'shadow',
  'font-size': 'text',
  'font-weight': 'font',
  'line-height': 'font',
  'letter-spacing': 'font',
  'font-family': 'font',
};

/** The item whose files own the palette: its token sources declare the scales and its helpers list them. */
const PALETTE_OWNER = 'tokens';

const CSS_MODULE = /\.module\.(css|scss|sass|less|styl|pcss)$/;

export type Unlisted = { kind: string; line: number; why: string };

/** Analysis the rules skipped in one file, by kind, for the report's unsupported list. */
export type Skipped = Map<string, Unlisted[]>;

/** Record one unread site, by its offset in the file. */
type Skip = (at: number, kind: string, why: string) => void;

function paintCategory(property: string): Category | undefined {
  // StyleX discourages the shorthand, but a consumer's inline `background` is a fill all the same.
  if (property === 'background') return CATEGORIES.color;
  const category = categoryOf(property);
  return category && PAINT.includes(category.id) ? category : undefined;
}

export function checkApp(context: Context, skipped: Skipped): void {
  const { scope } = context;
  const enabled = new Set(scope.rules ?? []);
  for (const { path, kind } of scope.inventory) {
    if (kind !== 'app') continue;
    const parsed = context.source(path);
    const segment = parsed?.segments[0];
    if (!parsed || !segment) continue;
    const { file } = segment;
    const evaluator = createEvaluator(scope, path, file);
    const skip: Skip = (at, kindOf, why) => {
      const entry = { kind: kindOf, line: file.getLineAndCharacterOfPosition(at).line + 1, why };
      skipped.set(path, [...(skipped.get(path) ?? []), entry]);
    };
    if (enabled.has('ULT-APP-PALETTE-001') && scope.itemOf(path) !== PALETTE_OWNER) paletteReads(context, parsed, file);
    if (enabled.has('ULT-APP-PAINT-001')) {
      paintInTables(context, parsed, file, evaluator, skip);
      inlineStyles(context, parsed, file, evaluator, skip);
    }
    unreadStyling(context, path, file, skip);
    checkKit(context, parsed, file);
  }
}

// ---------------------------------------------------------------------------------------------
// ULT-APP-PALETTE-001
// ---------------------------------------------------------------------------------------------

/**
 * Every read of a palette scale: a scale imported from a token source, through a namespace import,
 * or a value an installed tokens helper builds from the scales. A palette value ignores color mode
 * and every semantic override, whatever property it lands on.
 */
function paletteReads(context: Context, parsed: Parsed, file: ts.SourceFile): void {
  const { scope } = context;
  const model = tokenModel(scope);
  const named = new Map<string, string>();
  const namespaces = new Map<string, Map<string, TokenGroup>>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.importClause || statement.importClause.isTypeOnly) continue;
    const resolution = scope.resolve(statement.moduleSpecifier.text, parsed.path);
    if (resolution.kind !== 'file') continue;
    const groups = model.groups.get(resolution.path);
    const carriers = groups ? undefined : paletteCarriers(context, resolution.path);
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings) && groups) namespaces.set(bindings.name.text, groups);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        if (element.isTypeOnly) continue;
        const imported = (element.propertyName ?? element.name).text;
        const group = groups?.get(imported);
        if ((group && groupKind(group) === 'palette') || carriers?.has(imported)) named.set(element.name.text, imported);
      }
    }
  }
  if (named.size === 0 && namespaces.size === 0) return;

  const report = (node: ts.Node, label: string) => {
    const symbol = topLevelName(node);
    context.report({
      ruleId: 'ULT-APP-PALETTE-001',
      parsed,
      start: node.getStart(file),
      end: node.getEnd(),
      ...(symbol !== undefined && { symbol }),
      target: label,
      expression: node.getText(file).replace(/\s+/g, ' '),
      message: `The file reads the palette through ${label}; a palette value ignores color mode and every semantic override.`,
      repair: 'Read the semantic color token for the role instead, such as color[\'--ult-color-accent\'], or override that token in a theme.',
      link: APP_RULES['ULT-APP-PALETTE-001'].link,
    });
  };
  /** The whole read: `mithril.dark1` rather than `mithril` alone. */
  const readAt = (node: ts.Node): ts.Node =>
    (ts.isPropertyAccessExpression(node.parent) || ts.isElementAccessExpression(node.parent)) && node.parent.expression === node ? node.parent : node;

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isIdentifier(node) && named.has(node.text) && isReference(node) && declarationOf(node, node.text)?.kind === 'import') {
      report(readAt(node), named.get(node.text) as string);
    } else if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && namespaces.has(node.expression.text)) {
      const group = namespaces.get(node.expression.text)?.get(node.name.text);
      if (group && groupKind(group) === 'palette' && declarationOf(node.expression, node.expression.text)?.kind === 'import') {
        report(readAt(node), `${node.expression.text}.${node.name.text}`);
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

/** An identifier that reads its binding, rather than naming a property, a key or a declaration. */
function isReference(node: ts.Identifier): boolean {
  const { parent } = node;
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false;
  if ((ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent) || ts.isMethodDeclaration(parent)) && parent.name === node) return false;
  if (ts.isBindingElement(parent) && parent.propertyName === node) return false;
  if (ts.isVariableDeclaration(parent) && parent.name === node) return false;
  if ((ts.isFunctionDeclaration(parent) || ts.isParameter(parent)) && parent.name === node) return false;
  if (ts.isJsxAttribute(parent) || ts.isQualifiedName(parent) || ts.isTypeReferenceNode(parent)) return false;
  return true;
}

const carrierCache = new WeakMap<object, Map<string, Set<string>>>();

/**
 * The exports of an installed tokens helper that are built from the palette, such as the scale list
 * the palette page renders. Reading one is reading the palette.
 */
function paletteCarriers(context: Context, path: string): Set<string> | undefined {
  const { scope } = context;
  if (scope.itemOf(path) !== PALETTE_OWNER) return undefined;
  let cache = carrierCache.get(scope);
  if (!cache) carrierCache.set(scope, (cache = new Map()));
  const cached = cache.get(path);
  if (cached) return cached;
  const found = new Set<string>();
  cache.set(path, found);
  const text = scope.files.read(path);
  if (text === undefined) return found;
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const model = tokenModel(scope);
  const scales = new Set<string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.importClause) continue;
    const resolution = scope.resolve(statement.moduleSpecifier.text, path);
    const groups = resolution.kind === 'file' ? model.groups.get(resolution.path) : undefined;
    const bindings = statement.importClause.namedBindings;
    if (!groups || !bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const group = groups.get((element.propertyName ?? element.name).text);
      if (group && groupKind(group) === 'palette') scales.add(element.name.text);
    }
  }
  // Groups the helper declares itself are scales too, when it is a token source of its own.
  for (const group of groupsIn(path, file)) if (groupKind(group) === 'palette') found.add(group.name);
  if (scales.size === 0) return found;
  const mentions = (node: ts.Node): boolean => (ts.isIdentifier(node) && scales.has(node.text)) || ts.forEachChild(node, mentions) === true;
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement) || !statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer && mentions(declaration.initializer)) found.add(declaration.name.text);
    }
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// ULT-APP-PAINT-001
// ---------------------------------------------------------------------------------------------

type Paint = {
  property: string;
  node: ts.Node;
  alternatives: Piece<ts.Node>[][];
  symbol?: string;
  selector?: string;
  label: string;
};

function paintLink(category: Category): string {
  const section = SECTION[category.id];
  return section ? `${APP_RULES['ULT-APP-PAINT-001'].link}#${section}` : APP_RULES['ULT-APP-PAINT-001'].link;
}

/** Judge one paint declaration by the contributor value grammar, reporting each distinct problem once. */
function judgePaint(context: Context, parsed: Parsed, file: ts.SourceFile, category: Category, paint: Paint): void {
  const { scope } = context;
  const model = tokenModel(scope);
  const item = scope.itemOf(parsed.path);
  const grammar: GrammarContext = {
    property: paint.property,
    ...(item !== undefined && { item }),
    variables: scope.styles.variables,
    tokenByName: (name) => model.byName.get(name),
  };
  // A palette read is ULT-APP-PALETTE-001's finding at the same site, so paint does not repeat it.
  const palette = new Set(paint.alternatives.flat().flatMap((piece) => (piece.kind === 'token' && piece.palette ? [piece.at] : [])));
  const common = {
    parsed,
    ...(paint.symbol !== undefined && { symbol: paint.symbol }),
    target: paint.property,
    ...(paint.selector !== undefined && { selector: paint.selector }),
    expression: paint.node.getText(file).replace(/\s+/g, ' '),
  };
  const seen = new Set<string>();
  for (const alternative of paint.alternatives) {
    for (const problem of checkValue(category, alternative, grammar)) {
      // A local alias of a semantic token still reads the semantic layer, which is all a consumer owes.
      if (problem.kind === 'alias' || palette.has(problem.at)) continue;
      const key = `${problem.at.pos}:${problem.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const unresolved = problem.kind === 'unresolved';
      context.report({
        ruleId: unresolved ? 'ULT-ANALYSIS-001' : 'ULT-APP-PAINT-001',
        ...(unresolved && { severity: 'advisory' as const }),
        ...common,
        start: problem.at.getStart(file),
        end: problem.at.getEnd(),
        message: `In ${paint.label}, ${problem.message}.`,
        repair: problem.repair,
        link: unresolved ? CHECK_SPEC : paintLink(category),
      });
    }
  }
}

/** A value an advisory rule needs but cannot resolve: itself advisory. */
function reportUnresolved(context: Context, parsed: Parsed, file: ts.SourceFile, node: ts.Node, reason: string, property?: string): void {
  const symbol = topLevelName(node);
  context.report({
    ruleId: 'ULT-ANALYSIS-001',
    severity: 'advisory',
    parsed,
    start: node.getStart(file),
    end: node.getEnd(),
    ...(symbol !== undefined && { symbol }),
    target: property ?? 'stylex',
    message: `${reason}, so ULT-APP-PAINT-001 cannot read the paint there.`,
    repair: 'Write the declaration so it resolves statically: a literal, a token read, or a module-scope const.',
    link: CHECK_SPEC,
  });
}

function hasRuntime(alternatives: Piece<ts.Node>[][]): boolean {
  return alternatives.some((alternative) => alternative.some((piece) => piece.kind === 'runtime'));
}

function paintInTables(context: Context, parsed: Parsed, file: ts.SourceFile, evaluator: Evaluator, skip: Skip): void {
  const { declarations, unresolved } = declarationsOf(file, evaluator);
  for (const { node, reason } of unresolved) reportUnresolved(context, parsed, file, node, reason);
  for (const declaration of declarations) {
    const category = paintCategory(declaration.property);
    if (!category) continue;
    const before = evaluator.unresolved.length;
    const alternatives = evaluator.value(declaration.value);
    const missed = evaluator.unresolved.splice(before);
    for (const { node, reason } of missed) reportUnresolved(context, parsed, file, node, reason, declaration.property);
    if (hasRuntime(alternatives)) {
      skip(declaration.value.getStart(file), 'Computed StyleX values', 'a paint value computed at run time');
      continue;
    }
    const where = declaration.conditions.length > 0 ? ` under ${declaration.conditions.join(' ')}` : '';
    judgePaint(context, parsed, file, category, {
      property: declaration.property,
      node: declaration.value,
      alternatives,
      symbol: `${declaration.table}.${declaration.namespace}`,
      ...(declaration.conditions.length > 0 && { selector: declaration.conditions.join(' ') }),
      label: `${declaration.table}.${declaration.namespace}${where}`,
    });
  }
}

/** Literal `style={{ … }}` objects in JSX. A component's `style` takes StyleX styles, so only its literal objects are read. */
function inlineStyles(context: Context, parsed: Parsed, file: ts.SourceFile, evaluator: Evaluator, skip: Skip): void {
  const computed = (node: ts.Node, why: string) => skip(node.getStart(file), 'Computed inline styles', why);
  const visit = (node: ts.Node) => {
    if (ts.isJsxAttribute(node) && node.name.getText(file) === 'style' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const element = node.parent.parent;
      const tag = ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element) ? element.tagName.getText(file) : '';
      const intrinsic = /^[a-z]/.test(tag) && !tag.includes('.');
      const value = unwrap(node.initializer.expression);
      if (!ts.isObjectLiteralExpression(value)) {
        if (intrinsic) computed(value, 'a style object built at run time');
      } else {
        for (const member of value.properties) {
          if (!ts.isPropertyAssignment(member)) {
            computed(member, 'a spread or shorthand member');
            continue;
          }
          const property = evaluator.key(member.name);
          if (property === undefined) {
            computed(member.name, 'a computed key');
            continue;
          }
          const category = paintCategory(property);
          if (!category) continue;
          const before = evaluator.unresolved.length;
          const alternatives = evaluator.value(member.initializer);
          const missed = evaluator.unresolved.splice(before).length > 0;
          if (missed || hasRuntime(alternatives)) {
            computed(member.initializer, `${property} computed at run time`);
            continue;
          }
          const symbol = topLevelName(member);
          judgePaint(context, parsed, file, category, {
            property,
            node: member.initializer,
            alternatives,
            ...(symbol !== undefined && { symbol }),
            label: `the inline style on <${tag}>`,
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

// ---------------------------------------------------------------------------------------------
// Unsupported analysis
// ---------------------------------------------------------------------------------------------

/** Class names, CSS modules and CSS-in-JS libraries: styling the rules cannot read, so it is listed instead. */
function unreadStyling(context: Context, path: string, file: ts.SourceFile, skip: Skip): void {
  const { scope } = context;
  for (const entry of importsOf(file).imports) {
    if (entry.typeOnly) continue;
    const at = entry.start;
    const bare = entry.specifier.split('?')[0] as string;
    if (CSS_MODULE.test(bare)) {
      skip(at, 'CSS modules', `imports ${entry.specifier}`);
      continue;
    }
    if (bare.startsWith('.') || bare.startsWith('/')) continue;
    const name = packageName(bare);
    if (scope.resolve(bare, path).kind !== 'file' && scope.styles.engines(name)) skip(at, 'CSS-in-JS and class-name libraries', `imports ${name}`);
  }
  const visit = (node: ts.Node) => {
    // A class name composed from `stylex.props` output is StyleX's own, read where its table is declared.
    const composed = (value: ts.Node): boolean =>
      (ts.isPropertyAccessExpression(value) && value.name.text === 'className') || ts.forEachChild(value, composed) === true;
    if (ts.isJsxAttribute(node) && ['className', 'class'].includes(node.name.getText(file)) && !(node.initializer && composed(node.initializer))) {
      skip(node.getStart(file), 'Tailwind and other class names', `sets ${node.name.getText(file)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
