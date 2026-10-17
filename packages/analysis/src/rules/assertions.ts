// ULT-TEST-001: a component behavior test compares a computed paint property with a fixed CSS color
// literal, written in place or reached through a local constant. docs/spec/ultima.md, What a build
// ticket proves; docs/spec/agent-infrastructure.md, Component color assertions.
//
// The rule reads values rather than text: a hex string the test types into an input, or a literal it
// installs as a token override, is not an assertion about a computed color. A comparison with a value the
// browser computes (the same property in another state, or a token read through a probe) passes by the
// same evaluation that rejects a literal.
import ts from 'typescript';

import { RULES } from '../rules.ts';
import type { Parsed } from '../sources.ts';
import { declarationOf, topLevelName, unwrap } from '../stylex.ts';
import type { Context } from './context.ts';

const POLICY = 'docs/spec/ultima.md#what-a-build-ticket-proves';
const OWNER = 'ULT-TEST-001';

/** Computed properties whose value carries a color. */
const PAINT =
  /^(color|fill|stroke|background|backgroundImage|border|border(Block|Inline)(Start|End)?|border(Top|Right|Bottom|Left)|outline|boxShadow|textShadow|columnRule|textDecoration)$|Color$/;

const COLOR_FUNCTION = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(([^()]*)\)/gi;
const URL_REFERENCE = /\burl\((?:"[^"]*"|'[^']*'|[^()"'])*\)/gi;
const HEX = /(^|[^\w&#-])#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/gi;

const MODIFIERS = new Set(['not', 'resolves', 'rejects']);
const EXPECT_MEMBERS = new Set(['poll', 'soft', 'element']);
const TEXT_METHODS = new Set(['trim', 'toLowerCase', 'toUpperCase']);
const TEST_CALLS = new Set(['test', 'it', 'describe']);
const DEPTH = 24;

/** A color that paints nothing: `rgba(0, 0, 0, 0)` is what `transparent` computes to, never a palette value. */
function transparent(name: string, args: string): boolean {
  const slash = args.split('/');
  // Every modern form, `color(display-p3 1 0 0)` among them, puts alpha after a slash. Only the legacy
  // comma forms of rgb() and hsl() carry it as a fourth component.
  const legacy = /^(rgba?|hsla?)$/i.test(name) && (slash[0] ?? '').includes(',');
  const parts = (slash[0] ?? '').split(',').map((part) => part.trim());
  const alpha = slash.length > 1 ? slash[1]?.trim() : legacy && parts.length === 4 ? parts[3] : undefined;
  return alpha !== undefined && Number.parseFloat(alpha) === 0;
}

/** The fixed colors a string names, apart from the fully transparent one. */
export function fixedColors(input: string): string[] {
  // A `url(#id)` paint server names an element, not a color.
  const text = input.replace(URL_REFERENCE, ' ');
  const found: string[] = [];
  for (const match of text.matchAll(COLOR_FUNCTION)) {
    if (!transparent(match[1] ?? '', match[2] ?? '')) found.push(match[0]);
  }
  for (const match of text.matchAll(HEX)) {
    const digits = match[2] ?? '';
    const alpha = digits.length === 4 ? digits.slice(3) : digits.length === 8 ? digits.slice(6) : undefined;
    if (alpha === undefined || Number.parseInt(alpha, 16) !== 0) found.push(`#${digits}`);
  }
  return found;
}

const camel = (property: string) => property.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** A function body's argument bindings while the evaluator follows a call into a local helper. */
type Frame = {
  parsed: Parsed;
  params: Map<string, { expression: ts.Expression | undefined; frame: Frame }>;
  depth: number;
};

type Leaf =
  | { kind: 'fixed'; text: string }
  | { kind: 'runtime' }
  | { kind: 'unresolved'; reason: string };

type Read = { kind: 'paint'; property: string } | { kind: 'unknown'; reason: string };

type Resolved =
  | { kind: 'expression'; expression: ts.Expression; frame: Frame }
  | { kind: 'function'; declaration: ts.FunctionLikeDeclaration; frame: Frame }
  | { kind: 'runtime' }
  | { kind: 'unresolved'; reason: string };

export function checkAssertions(context: Context): void {
  const { scope } = context;
  const directories = scope.componentTests ?? [];
  const inScope = (path: string) => scope.kindOf(path) === 'test' && directories.some((directory) => path.startsWith(directory));

  const frameFor = (parsed: Parsed, depth = 0): Frame => ({ parsed, params: new Map(), depth });

  /** The exported binding a relative import names, when the module is another component test file. */
  const imported = (declaration: ts.ImportDeclaration, name: string, frame: Frame): Resolved => {
    const specifier = ts.isStringLiteral(declaration.moduleSpecifier) ? declaration.moduleSpecifier.text : undefined;
    if (specifier === undefined) return { kind: 'unresolved', reason: 'an import with a computed specifier' };
    const resolution = scope.resolve(specifier, frame.parsed.path);
    // A module outside the component tests supplies values the run computes: the token package, a component.
    if (resolution.kind === 'external') return { kind: 'runtime' };
    if (resolution.kind === 'unresolved') return { kind: 'unresolved', reason: `"${specifier}" resolves to no module` };
    if (!inScope(resolution.path)) return { kind: 'runtime' };
    const clause = declaration.importClause;
    const named = clause?.namedBindings;
    const element = named && ts.isNamedImports(named) ? named.elements.find((entry) => entry.name.text === name) : undefined;
    if (!element) return { kind: 'unresolved', reason: `${name} is a default or namespace import from ${resolution.path}` };
    const exported = (element.propertyName ?? element.name).text;
    const target = context.source(resolution.path);
    const file = target?.segments[0]?.file;
    if (!target || !file) return { kind: 'unresolved', reason: `${resolution.path} cannot be read` };
    for (const statement of file.statements) {
      const isExported = ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExported) continue;
      if (ts.isFunctionDeclaration(statement) && statement.name?.text === exported) return { kind: 'function', declaration: statement, frame: frameFor(target, frame.depth + 1) };
      if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.Const) {
        for (const declared of statement.declarationList.declarations) {
          if (ts.isIdentifier(declared.name) && declared.name.text === exported && declared.initializer) {
            return { kind: 'expression', expression: declared.initializer, frame: frameFor(target, frame.depth + 1) };
          }
        }
      }
    }
    return { kind: 'unresolved', reason: `${resolution.path} exports no constant or function ${exported}` };
  };

  const resolveIdentifier = (identifier: ts.Identifier, frame: Frame): Resolved => {
    if (frame.depth > DEPTH) return { kind: 'unresolved', reason: 'the value is too deeply aliased to follow' };
    const found = declarationOf(identifier, identifier.text);
    // A global: `document`, `window`, `undefined`.
    if (!found) return { kind: 'runtime' };
    // Every hop counts toward the depth limit, so a cyclic alias ends as unresolved instead of looping.
    const next: Frame = { ...frame, depth: frame.depth + 1 };
    switch (found.kind) {
      case 'const': {
        if (!found.initializer) return { kind: 'unresolved', reason: `${identifier.text} has no initializer` };
        const initializer = unwrap(found.initializer);
        if (found.destructured) {
          const leaves = values(initializer, frame);
          return leaves.every((leaf) => leaf.kind === 'runtime') ? { kind: 'runtime' } : { kind: 'unresolved', reason: `${identifier.text} is destructured from a value the checker cannot split` };
        }
        if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) return { kind: 'function', declaration: initializer, frame: next };
        return { kind: 'expression', expression: initializer, frame: next };
      }
      case 'parameter': {
        const bound = frame.params.get(identifier.text);
        if (!bound) return { kind: 'unresolved', reason: `${identifier.text} is a parameter, whose value each caller supplies` };
        if (!bound.expression) return { kind: 'runtime' };
        return { kind: 'expression', expression: bound.expression, frame: { ...bound.frame, depth: Math.max(bound.frame.depth, frame.depth) + 1 } };
      }
      case 'mutable':
        return { kind: 'unresolved', reason: `${identifier.text} is declared with let or var, so its value can change` };
      case 'import':
        return imported(found.declaration, identifier.text, frame);
      case 'function':
        return ts.isFunctionDeclaration(found.declaration) ? { kind: 'function', declaration: found.declaration, frame: next } : { kind: 'runtime' };
    }
  };

  /** What a call into a local helper returns, with its parameters bound to the call's arguments. */
  const returned = (resolved: Extract<Resolved, { kind: 'function' }>, call: ts.CallExpression, caller: Frame): { expressions: ts.Expression[]; frame: Frame } | undefined => {
    const { declaration } = resolved;
    if (caller.depth > DEPTH || !declaration.body) return undefined;
    const frame: Frame = { parsed: resolved.frame.parsed, params: new Map(resolved.frame.params), depth: caller.depth + 1 };
    declaration.parameters.forEach((parameter, index) => {
      if (!ts.isIdentifier(parameter.name)) return;
      const argument = call.arguments[index];
      frame.params.set(parameter.name.text, argument ? { expression: argument, frame: caller } : { expression: parameter.initializer, frame });
    });
    if (!ts.isBlock(declaration.body)) return { expressions: [declaration.body], frame };
    const expressions: ts.Expression[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isReturnStatement(node) && node.expression) expressions.push(node.expression);
      if (!ts.isFunctionLike(node)) ts.forEachChild(node, visit);
    };
    ts.forEachChild(declaration.body, visit);
    return { expressions, frame };
  };

  /** The object or array literal an expression names through local constants. */
  const literalOf = (expression: ts.Expression, frame: Frame): { node: ts.ObjectLiteralExpression | ts.ArrayLiteralExpression; frame: Frame } | undefined => {
    const node = unwrap(expression);
    if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node)) return { node, frame };
    if (ts.isIdentifier(node)) {
      const resolved = resolveIdentifier(node, frame);
      if (resolved.kind === 'expression') return literalOf(resolved.expression, resolved.frame);
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const key = ts.isPropertyAccessExpression(node) ? node.name.text : keyText(node.argumentExpression, frame);
      const outer = literalOf(node.expression, frame);
      const found = outer && key !== undefined ? member(outer.node, key) : undefined;
      if (outer && found) return literalOf(found, outer.frame);
    }
    return undefined;
  };

  const member = (literal: ts.ObjectLiteralExpression | ts.ArrayLiteralExpression, key: string): ts.Expression | undefined => {
    if (ts.isArrayLiteralExpression(literal)) {
      const element = literal.elements[Number(key)];
      return element && !ts.isSpreadElement(element) && !ts.isOmittedExpression(element) ? element : undefined;
    }
    for (const property of literal.properties) {
      const name = property.name && (ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name) || ts.isNumericLiteral(property.name)) ? property.name.text : undefined;
      if (name !== key) continue;
      if (ts.isPropertyAssignment(property)) return property.initializer;
      if (ts.isShorthandPropertyAssignment(property)) return property.name;
    }
    return undefined;
  };

  const combine = (parts: Leaf[][]): Leaf[] => {
    for (const leaves of parts) {
      const unresolved = leaves.find((leaf) => leaf.kind === 'unresolved');
      if (unresolved) return [unresolved];
    }
    if (parts.some((leaves) => leaves.some((leaf) => leaf.kind === 'runtime'))) return [{ kind: 'runtime' }];
    let texts = [''];
    for (const leaves of parts) {
      const next: string[] = [];
      for (const prefix of texts) for (const leaf of leaves) if (leaf.kind === 'fixed' && next.length < 32) next.push(prefix + leaf.text);
      texts = next;
    }
    return texts.map((text) => ({ kind: 'fixed', text }));
  };

  /** Every value an expected expression can take: fixed text, a run-time value, or what the checker cannot follow. */
  function values(expression: ts.Expression, frame: Frame): Leaf[] {
    if (frame.depth > DEPTH) return [{ kind: 'unresolved', reason: 'the value is too deeply aliased to follow' }];
    const node = unwrap(expression);
    if (ts.isStringLiteralLike(node)) return [{ kind: 'fixed', text: node.text }];
    if (ts.isNumericLiteral(node)) return [{ kind: 'fixed', text: node.text }];
    if (ts.isTemplateExpression(node)) {
      return combine([
        [{ kind: 'fixed', text: node.head.text }],
        ...node.templateSpans.flatMap((span) => [values(span.expression, frame), [{ kind: 'fixed', text: span.literal.text } as Leaf]]),
      ]);
    }
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) return combine([values(node.left, frame), values(node.right, frame)]);
      if ([ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(node.operatorToken.kind)) {
        return [...values(node.left, frame), ...values(node.right, frame)];
      }
      return [{ kind: 'runtime' }];
    }
    if (ts.isConditionalExpression(node)) return [...values(node.whenTrue, frame), ...values(node.whenFalse, frame)];
    if (ts.isArrayLiteralExpression(node)) return node.elements.flatMap((element) => (ts.isOmittedExpression(element) ? [] : values(ts.isSpreadElement(element) ? element.expression : element, frame)));
    if (ts.isObjectLiteralExpression(node)) {
      return node.properties.flatMap((property) => {
        if (ts.isPropertyAssignment(property)) return values(property.initializer, frame);
        if (ts.isShorthandPropertyAssignment(property)) return values(property.name, frame);
        if (ts.isSpreadAssignment(property)) return values(property.expression, frame);
        return [];
      });
    }
    if (ts.isIdentifier(node)) {
      const resolved = resolveIdentifier(node, frame);
      if (resolved.kind === 'expression') return values(resolved.expression, resolved.frame);
      if (resolved.kind === 'unresolved') return [resolved];
      return [{ kind: 'runtime' }];
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const key = ts.isPropertyAccessExpression(node) ? node.name.text : keyText(node.argumentExpression, frame);
      const literal = literalOf(node.expression, frame);
      if (literal && key !== undefined) {
        const found = member(literal.node, key);
        if (found) return values(found, literal.frame);
      }
      return [{ kind: 'runtime' }];
    }
    if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      if (ts.isPropertyAccessExpression(callee) && TEXT_METHODS.has(callee.name.text) && node.arguments.length === 0) {
        const receiver = values(callee.expression, frame);
        const method = callee.name.text;
        return receiver.map((leaf) =>
          leaf.kind !== 'fixed' ? leaf : { kind: 'fixed', text: method === 'trim' ? leaf.text.trim() : method === 'toLowerCase' ? leaf.text.toLowerCase() : leaf.text.toUpperCase() },
        );
      }
      if (ts.isIdentifier(callee)) {
        const resolved = resolveIdentifier(callee, frame);
        if (resolved.kind === 'function') {
          const body = returned(resolved, node, frame);
          if (body) return body.expressions.length === 0 ? [{ kind: 'runtime' }] : body.expressions.flatMap((returnedExpression) => values(returnedExpression, body.frame));
        }
      }
      // A function result is computed when the test runs: a probe read, a token lookup, a DOM query.
      return [{ kind: 'runtime' }];
    }
    if (ts.isAwaitExpression(node)) return values(node.expression, frame);
    return [{ kind: 'runtime' }];
  }

  function keyText(expression: ts.Expression, frame: Frame): string | undefined {
    const leaves = values(expression, frame);
    const [only, ...rest] = leaves;
    return only?.kind === 'fixed' && rest.length === 0 ? only.text : undefined;
  }

  /** The values a `let` or `var` binding can hold: its initializer and every plain assignment in its scope. */
  function assigned(identifier: ts.Identifier): ts.Expression[] {
    for (let scope: ts.Node | undefined = identifier.parent; scope; scope = scope.parent) {
      if (!(ts.isBlock(scope) || ts.isSourceFile(scope) || ts.isModuleBlock(scope) || ts.isCaseClause(scope) || ts.isDefaultClause(scope))) continue;
      const declaration = scope.statements
        .filter(ts.isVariableStatement)
        .flatMap((statement) => statement.declarationList.declarations)
        .find((entry) => ts.isIdentifier(entry.name) && entry.name.text === identifier.text);
      if (!declaration) continue;
      const out = declaration.initializer ? [declaration.initializer] : [];
      const visit = (node: ts.Node) => {
        if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left) && node.left.text === identifier.text) out.push(node.right);
        ts.forEachChild(node, visit);
      };
      visit(scope);
      return out;
    }
    return [];
  }

  /**
   * Whether an expression is a `getComputedStyle()` result, directly or through a local constant or helper.
   * `maybe` is a `let` or `var` binding that holds one at some point, so what it holds at the assertion is unestablished.
   */
  function computedStyle(expression: ts.Expression, frame: Frame): boolean | 'maybe' {
    if (frame.depth > DEPTH) return false;
    const node = unwrap(expression);
    if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      if (ts.isIdentifier(callee) && callee.text === 'getComputedStyle') return true;
      if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'getComputedStyle') return true;
      if (ts.isIdentifier(callee)) {
        const resolved = resolveIdentifier(callee, frame);
        if (resolved.kind === 'function') {
          const body = returned(resolved, node, frame);
          return body !== undefined && body.expressions.some((returnedExpression) => computedStyle(returnedExpression, body.frame) === true);
        }
      }
      return false;
    }
    if (ts.isIdentifier(node)) {
      if (declarationOf(node, node.text)?.kind === 'mutable') {
        // Each hop counts toward the depth limit, so `style = style` ends instead of looping.
        const next = { ...frame, depth: frame.depth + 1 };
        return assigned(node).some((value) => computedStyle(value, next) === true) ? 'maybe' : false;
      }
      const resolved = resolveIdentifier(node, frame);
      return resolved.kind === 'expression' && computedStyle(resolved.expression, resolved.frame) === true;
    }
    return false;
  }

  const mutable = (holder: ts.Expression, property: string): Read => ({
    kind: 'unknown',
    reason: `${holder.getText()} is declared with let or var, so whether its ${property} is the computed style at the assertion is unestablished`,
  });

  /** The computed property a binding destructured from a `getComputedStyle()` result reads. */
  const destructured = (pattern: ts.BindingName, name: string): Read | undefined => {
    if (ts.isObjectBindingPattern(pattern)) {
      for (const element of pattern.elements) {
        if (!ts.isIdentifier(element.name) || element.name.text !== name) continue;
        const key = element.propertyName ?? element.name;
        if (element.dotDotDotToken || !(ts.isIdentifier(key) || ts.isStringLiteralLike(key))) break;
        return PAINT.test(key.text) ? { kind: 'paint', property: key.text } : undefined;
      }
    }
    return { kind: 'unknown', reason: `${name} is destructured from a computed style in a form the checker cannot split` };
  };

  /** The computed paint property an asserted value reads, when it reads one. */
  function paintRead(expression: ts.Expression, frame: Frame): Read | undefined {
    if (frame.depth > DEPTH) return undefined;
    const node = unwrap(expression);
    if (ts.isAwaitExpression(node)) return paintRead(node.expression, frame);
    if (ts.isConditionalExpression(node)) return paintRead(node.whenTrue, frame) ?? paintRead(node.whenFalse, frame);
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        if (ts.isOmittedExpression(element)) continue;
        const read = paintRead(ts.isSpreadElement(element) ? element.expression : element, frame);
        if (read) return read;
      }
      return undefined;
    }
    if (ts.isPropertyAccessExpression(node)) {
      const style = computedStyle(node.expression, frame);
      if (!style || !PAINT.test(node.name.text)) return undefined;
      return style === true ? { kind: 'paint', property: node.name.text } : mutable(node.expression, node.name.text);
    }
    if (ts.isElementAccessExpression(node)) {
      const style = computedStyle(node.expression, frame);
      if (!style) return undefined;
      const key = keyText(node.argumentExpression, frame);
      if (key !== undefined && !PAINT.test(key)) return undefined;
      if (style === 'maybe') return mutable(node.expression, key ?? node.argumentExpression.getText());
      if (key !== undefined) return { kind: 'paint', property: key };
      const argument = unwrap(node.argumentExpression);
      const tail = ts.isTemplateExpression(argument) ? (argument.templateSpans.at(-1)?.literal.text ?? '') : undefined;
      if (tail !== undefined && /Color$/.test(tail)) return { kind: 'paint', property: argument.getText() };
      return { kind: 'unknown', reason: `the computed style is read through the key ${argument.getText()}, which the checker cannot resolve` };
    }
    if (ts.isCallExpression(node)) {
      const callee = unwrap(node.expression);
      if (ts.isPropertyAccessExpression(callee)) {
        if (TEXT_METHODS.has(callee.name.text)) return paintRead(callee.expression, frame);
        const style = callee.name.text === 'getPropertyValue' ? computedStyle(callee.expression, frame) : false;
        if (style) {
          const [argument] = node.arguments;
          const key = argument && keyText(argument, frame);
          if (key === undefined) return { kind: 'unknown', reason: `getPropertyValue reads ${argument?.getText() ?? 'nothing'}, which the checker cannot resolve` };
          // A custom property is a token's own value, not a part's computed paint.
          if (key.startsWith('--') || !PAINT.test(camel(key))) return undefined;
          return style === true ? { kind: 'paint', property: key } : mutable(callee.expression, key);
        }
        return undefined;
      }
      if (ts.isIdentifier(callee)) {
        if (callee.text === 'String' && node.arguments[0]) return paintRead(node.arguments[0], frame);
        const resolved = resolveIdentifier(callee, frame);
        if (resolved.kind === 'function') {
          const body = returned(resolved, node, frame);
          for (const returnedExpression of body?.expressions ?? []) {
            const read = paintRead(returnedExpression, (body as { frame: Frame }).frame);
            if (read) return read;
          }
        }
      }
      return undefined;
    }
    if (ts.isIdentifier(node)) {
      const found = declarationOf(node, node.text);
      if (found?.kind === 'mutable') {
        const next = { ...frame, depth: frame.depth + 1 };
        const held = assigned(node).some((value) => computedStyle(value, next) === true || paintRead(value, next) !== undefined);
        return held ? { kind: 'unknown', reason: `${node.text} is declared with let or var, so the computed value it holds at the assertion is unestablished` } : undefined;
      }
      if (found?.kind === 'const' && found.destructured && found.initializer && computedStyle(found.initializer, frame) === true) {
        return destructured(found.declaration.name, node.text);
      }
      const resolved = resolveIdentifier(node, frame);
      return resolved.kind === 'expression' ? paintRead(resolved.expression, resolved.frame) : undefined;
    }
    return undefined;
  }

  /** `expect(actual)[.not|.resolves|.rejects].matcher(...)`, and `expect.poll(() => actual)`, `expect.soft(actual)`. */
  function assertion(call: ts.CallExpression): { actual: ts.Expression; matcher: string } | undefined {
    const callee = call.expression;
    if (!ts.isPropertyAccessExpression(callee) || call.arguments.length === 0) return undefined;
    let receiver: ts.Expression = callee.expression;
    while (ts.isPropertyAccessExpression(receiver) && MODIFIERS.has(receiver.name.text)) receiver = receiver.expression;
    if (!ts.isCallExpression(receiver)) return undefined;
    const head = receiver.expression;
    const poll = ts.isPropertyAccessExpression(head) && ts.isIdentifier(head.expression) && head.expression.text === 'expect' && head.name.text === 'poll';
    const isExpect = (ts.isIdentifier(head) && head.text === 'expect') || (ts.isPropertyAccessExpression(head) && ts.isIdentifier(head.expression) && head.expression.text === 'expect' && EXPECT_MEMBERS.has(head.name.text));
    const [first] = receiver.arguments;
    if (!isExpect || !first) return undefined;
    if (!poll) return { actual: first, matcher: callee.name.text };
    const fn = unwrap(first);
    if (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) return undefined;
    if (!ts.isBlock(fn.body)) return { actual: fn.body, matcher: callee.name.text };
    const last = fn.body.statements.at(-1);
    return last && ts.isReturnStatement(last) && last.expression ? { actual: last.expression, matcher: callee.name.text } : undefined;
  }

  /** The `test('…')` an assertion sits in, or the top-level declaration. */
  function symbolOf(node: ts.Node): string | undefined {
    for (let current: ts.Node | undefined = node.parent; current; current = current.parent) {
      if (!ts.isCallExpression(current)) continue;
      let callee = current.expression;
      while (ts.isPropertyAccessExpression(callee) || ts.isCallExpression(callee)) callee = callee.expression;
      const [title] = current.arguments;
      if (ts.isIdentifier(callee) && TEST_CALLS.has(callee.text) && callee.text !== 'describe' && title && ts.isStringLiteralLike(title)) return title.text;
    }
    return topLevelName(node);
  }

  for (const { path } of scope.inventory) {
    if (!inScope(path) || path.endsWith('.mdx')) continue;
    const parsed = context.source(path);
    const file = parsed?.segments[0]?.file;
    if (!parsed || !file) continue;
    const frame = frameFor(parsed);

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) inspect(node);
      ts.forEachChild(node, visit);
    };
    const inspect = (call: ts.CallExpression) => {
      const found = assertion(call);
      if (!found) return;
      const read = paintRead(found.actual, frame);
      if (!read) return;
      for (const argument of call.arguments) {
        const leaves = values(argument, frame);
        const colors = leaves.flatMap((leaf) => (leaf.kind === 'fixed' ? fixedColors(leaf.text) : []));
        const symbol = symbolOf(call);
        const expression = argument.getText().replace(/\s+/g, ' ');
        const shared = { parsed, start: argument.getStart(), end: argument.getEnd(), expression, ...(symbol !== undefined && { symbol }) };
        if (colors.length > 0 && read.kind === 'paint') {
          const literal = ts.isStringLiteralLike(unwrap(argument));
          context.report({
            ...shared,
            ruleId: OWNER,
            target: read.property,
            message: `the assertion ${found.matcher}(${expression}) pins the computed ${read.property} to the fixed color ${colors[0]}${literal ? '' : `, which ${expression} resolves to`}. No component test asserts a color value: palette values are regenerated`,
            repair:
              'Compare against a value the browser computes: the same property read before and after the documented state change, or the installed token read through a probe (tokenValue in packages/ui/src/__tests__/token-value.ts). A test whose contract is an exact emitted value belongs with the compiler or token-output tests, outside the component test directories.',
            link: POLICY,
          });
        } else if (colors.length > 0 && read.kind === 'unknown') {
          context.report({
            ...shared,
            ruleId: 'ULT-ANALYSIS-001',
            message: `the assertion ${found.matcher}(${expression}) compares a fixed color with a computed style, but ${read.reason}, so ${OWNER} is unestablished`,
            repair: 'Read the computed property by a literal name, such as style.backgroundColor or getPropertyValue("background-color").',
            link: RULES['ULT-ANALYSIS-001'].link,
          });
        } else if (read.kind === 'paint') {
          const unresolved = leaves.find((leaf): leaf is Extract<Leaf, { kind: 'unresolved' }> => leaf.kind === 'unresolved');
          if (!unresolved) continue;
          context.report({
            ...shared,
            ruleId: 'ULT-ANALYSIS-001',
            target: read.property,
            message: `the assertion ${found.matcher}(${expression}) compares the computed ${read.property} with a value the checker cannot follow: ${unresolved.reason}. ${OWNER} is unestablished for it`,
            repair: 'Compare against a value computed in the test, such as another computed style or a token read through a probe, or a constant declared in a component test file.',
            link: RULES['ULT-ANALYSIS-001'].link,
          });
        }
      }
    };
    visit(file);
  }
}
