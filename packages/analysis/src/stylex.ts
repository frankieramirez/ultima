// StyleX in a parsed file: its bindings under any local name, the token groups it imports through the
// scope, the declarations its create and keyframes tables hold, and what each declaration's value
// evaluates to. docs/spec/agent-infrastructure.md, Values and runtime styles: nested selectors and
// conditions, aliased calls, statically resolvable spreads and computed keys are all followed; what
// cannot be followed is reported, never read as a pass.
import ts from 'typescript';

import { type GroupShape, type Piece, familyOf, groupKind } from './grammar.ts';
import type { Scope } from './scope.ts';
import { parseSource } from './sources.ts';

export const STYLEX = '@stylexjs/stylex';

/** The StyleX functions the rules follow; every other member is read as a value like any call. */
const FUNCTIONS = new Set(['create', 'keyframes', 'props', 'attrs', 'firstThatWorks', 'defineVars', 'defineConsts', 'createTheme']);

export type StyleXBindings = {
  /** Local names of the namespace or default import, and of module-scope aliases of it. */
  namespaces: Set<string>;
  /** Local name to the StyleX function it is. */
  calls: Map<string, string>;
};

/** The StyleX bindings a file holds: the namespace or default import, and each function under any local name. */
export function styleXBindings(file: ts.SourceFile): StyleXBindings {
  const namespaces = new Set<string>();
  const calls = new Map<string, string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (statement.moduleSpecifier.text !== STYLEX) continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;
    if (clause.name) namespaces.add(clause.name.text);
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const imported = (element.propertyName ?? element.name).text;
        if (!element.isTypeOnly && FUNCTIONS.has(imported)) calls.set(element.name.text, imported);
      }
    }
  }
  // Module-scope aliases: `const sx = stylex`, `const make = stylex.create`, `const { create } = stylex`.
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement) || !(statement.declarationList.flags & ts.NodeFlags.Const)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const init = declaration.initializer;
      if (!init) continue;
      if (ts.isIdentifier(declaration.name)) {
        if (ts.isIdentifier(init) && namespaces.has(init.text)) namespaces.add(declaration.name.text);
        else if (ts.isIdentifier(init) && calls.has(init.text)) calls.set(declaration.name.text, calls.get(init.text) as string);
        else if (ts.isPropertyAccessExpression(init) && ts.isIdentifier(init.expression) && namespaces.has(init.expression.text) && FUNCTIONS.has(init.name.text)) {
          calls.set(declaration.name.text, init.name.text);
        }
      } else if (ts.isObjectBindingPattern(declaration.name) && ts.isIdentifier(init) && namespaces.has(init.text)) {
        for (const element of declaration.name.elements) {
          const imported = element.propertyName ?? element.name;
          if (ts.isIdentifier(imported) && FUNCTIONS.has(imported.text) && ts.isIdentifier(element.name)) calls.set(element.name.text, imported.text);
        }
      }
    }
  }
  return { namespaces, calls };
}

/** The StyleX function a call invokes, when its callee is one: `stylex.create(…)`, `stylex['create'](…)` or a bound alias. */
export function styleXCall(call: ts.CallExpression, bindings: StyleXBindings): string | undefined {
  const callee = unwrap(call.expression);
  if (ts.isIdentifier(callee)) return bindings.calls.get(callee.text);
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && bindings.namespaces.has(callee.expression.text)) {
    return FUNCTIONS.has(callee.name.text) ? callee.name.text : undefined;
  }
  if (ts.isElementAccessExpression(callee) && ts.isIdentifier(callee.expression) && bindings.namespaces.has(callee.expression.text)) {
    const member = callee.argumentExpression;
    return ts.isStringLiteralLike(member) && FUNCTIONS.has(member.text) ? member.text : undefined;
  }
  return undefined;
}

export function unwrap(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

/** The top-level declaration a node sits in. */
export function topLevelName(node: ts.Node): string | undefined {
  let current: ts.Node = node;
  while (current.parent && !ts.isSourceFile(current.parent)) current = current.parent;
  if ((ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current)) && current.name) return current.name.text;
  if (ts.isVariableStatement(current)) {
    const [first] = current.declarationList.declarations;
    if (first && ts.isIdentifier(first.name)) return first.name.text;
  }
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Token groups
// ---------------------------------------------------------------------------------------------

export type TokenGroup = GroupShape & { path: string };

export type TokenModel = {
  /** Groups by source path and export name. */
  groups: Map<string, Map<string, TokenGroup>>;
  /** Every semantic `--ult-*` name, with its family. */
  byName: Map<string, ReturnType<typeof familyOf>>;
};

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isPrivateIdentifier(name)) return name.text;
  if (ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)) return name.expression.text;
  return undefined;
}

/** The exported `defineVars` and `defineConsts` groups a token source declares. */
export function groupsIn(path: string, file: ts.SourceFile): TokenGroup[] {
  const bindings = styleXBindings(file);
  const found: TokenGroup[] = [];
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if (!statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const init = unwrap(declaration.initializer);
      if (!ts.isCallExpression(init)) continue;
      const called = styleXCall(init, bindings);
      if (called !== 'defineVars' && called !== 'defineConsts') continue;
      const [argument] = init.arguments;
      if (!argument || !ts.isObjectLiteralExpression(unwrap(argument))) continue;
      const keys = (unwrap(argument) as ts.ObjectLiteralExpression).properties
        .map((property) => (property.name ? propertyName(property.name) : undefined))
        .filter((key): key is string => key !== undefined);
      found.push({ name: declaration.name.text, kind: called === 'defineVars' ? 'vars' : 'consts', keys, path });
    }
  }
  return found;
}

const models = new WeakMap<Scope, TokenModel>();

/** The token groups of every token source the scope names, read through the scope's files. */
export function tokenModel(scope: Scope): TokenModel {
  const cached = models.get(scope);
  if (cached) return cached;
  const model: TokenModel = { groups: new Map(), byName: new Map() };
  for (const path of scope.tokenSources) {
    const text = scope.files.read(path);
    if (text === undefined) continue;
    const parsed = parseSource(path, text);
    const segment = parsed.segments[0];
    if (!segment) continue;
    const groups = new Map<string, TokenGroup>();
    for (const group of groupsIn(path, segment.file)) {
      groups.set(group.name, group);
      if (group.kind === 'vars') for (const key of group.keys) model.byName.set(key, familyOf(group, key));
    }
    model.groups.set(path, groups);
  }
  models.set(scope, model);
  return model;
}

// ---------------------------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------------------------

export type Pieces = Piece<ts.Node>[];

export type Unresolved = { node: ts.Node; reason: string };

type GroupRef = { group: TokenGroup | undefined; label: string };

export type Evaluator = {
  bindings: StyleXBindings;
  /** Every alternative a value expression can take, as pieces. */
  value(expression: ts.Expression): Pieces[];
  /** The object literal an expression names, through const aliases. */
  object(expression: ts.Expression): ts.ObjectLiteralExpression | undefined;
  /** A property key, through statically resolvable computed keys. */
  key(name: ts.PropertyName): string | undefined;
  /** The token group an expression names, when it names one. */
  group(expression: ts.Expression): GroupRef | undefined;
  /** What the evaluation could not follow; each is an analysis diagnostic. */
  unresolved: Unresolved[];
};

type Found =
  | { kind: 'const'; declaration: ts.VariableDeclaration; initializer: ts.Expression | undefined; destructured: boolean }
  | { kind: 'parameter' }
  | { kind: 'mutable' }
  | { kind: 'import'; declaration: ts.ImportDeclaration }
  | { kind: 'function'; declaration: ts.FunctionDeclaration | ts.ClassDeclaration };

function bindsName(name: ts.BindingName, text: string): boolean {
  if (ts.isIdentifier(name)) return name.text === text;
  return name.elements.some((element) => !ts.isOmittedExpression(element) && bindsName(element.name, text));
}

function inStatements(statements: readonly ts.Statement[], text: string): Found | undefined {
  for (const statement of statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!bindsName(declaration.name, text)) continue;
        if (!(statement.declarationList.flags & ts.NodeFlags.Const)) return { kind: 'mutable' };
        return { kind: 'const', declaration, initializer: declaration.initializer, destructured: !ts.isIdentifier(declaration.name) };
      }
    } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name?.text === text) {
      return { kind: 'function', declaration: statement };
    } else if (ts.isImportDeclaration(statement) && statement.importClause) {
      const clause = statement.importClause;
      const named = clause.namedBindings;
      const binds =
        clause.name?.text === text ||
        (named && ts.isNamespaceImport(named) && named.name.text === text) ||
        (named && ts.isNamedImports(named) && named.elements.some((element) => element.name.text === text));
      if (binds) return { kind: 'import', declaration: statement };
    }
  }
  return undefined;
}

/** Where an identifier is declared, walking out through blocks, parameters and the module. */
export function declarationOf(node: ts.Node, text: string): Found | undefined {
  for (let scope: ts.Node | undefined = node.parent; scope; scope = scope.parent) {
    if (ts.isFunctionLike(scope)) {
      if (scope.parameters.some((parameter) => bindsName(parameter.name, text))) return { kind: 'parameter' };
    }
    if (ts.isBlock(scope) || ts.isSourceFile(scope) || ts.isModuleBlock(scope) || ts.isCaseClause(scope) || ts.isDefaultClause(scope)) {
      const found = inStatements(scope.statements, text);
      if (found) return found;
    }
    if ((ts.isForOfStatement(scope) || ts.isForInStatement(scope) || ts.isForStatement(scope)) && scope.initializer && ts.isVariableDeclarationList(scope.initializer)) {
      if (scope.initializer.declarations.some((declaration) => bindsName(declaration.name, text))) return { kind: 'mutable' };
    }
    if (ts.isCatchClause(scope) && scope.variableDeclaration && bindsName(scope.variableDeclaration.name, text)) return { kind: 'mutable' };
  }
  return undefined;
}

const LIMIT = 64;

const ARITHMETIC = new Map<ts.SyntaxKind, (a: number, b: number) => number>([
  [ts.SyntaxKind.AsteriskToken, (a, b) => a * b],
  [ts.SyntaxKind.SlashToken, (a, b) => a / b],
  [ts.SyntaxKind.MinusToken, (a, b) => a - b],
]);

/** The alternatives as plain numbers, when every one is a single numeric literal. */
function numbers(alternatives: Pieces[]): number[] | undefined {
  const out: number[] = [];
  for (const alternative of alternatives) {
    const joined = joinText(alternative);
    if (joined === undefined || joined.trim() === '' || !Number.isFinite(Number(joined))) return undefined;
    out.push(Number(joined));
  }
  return out;
}

/** An alternative's text, when it is nothing but literal text. */
export function joinText(alternative: Pieces): string | undefined {
  let out = '';
  for (const piece of alternative) {
    if (piece.kind !== 'text') return undefined;
    out += piece.text;
  }
  return out;
}

function product(left: Pieces[], right: Pieces[]): Pieces[] {
  const out: Pieces[] = [];
  for (const a of left) for (const b of right) if (out.length < LIMIT) out.push([...a, ...b]);
  return out;
}

export function createEvaluator(scope: Scope, path: string, file: ts.SourceFile): Evaluator {
  const bindings = styleXBindings(file);
  const model = tokenModel(scope);
  const unresolved: Unresolved[] = [];
  const miss = (node: ts.Node, reason: string): Pieces[] => {
    unresolved.push({ node, reason });
    return [[{ kind: 'null', at: node }]];
  };

  /** Import bindings that name a token source, resolved through the scope. */
  const groupImports = new Map<string, GroupRef>();
  const moduleImports = new Map<string, Map<string, TokenGroup>>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.importClause) continue;
    if (statement.importClause.isTypeOnly) continue;
    const resolution = scope.resolve(statement.moduleSpecifier.text, path);
    if (resolution.kind !== 'file') continue;
    const groups = model.groups.get(resolution.path);
    if (!groups) continue;
    const named = statement.importClause.namedBindings;
    if (named && ts.isNamespaceImport(named)) moduleImports.set(named.name.text, groups);
    if (named && ts.isNamedImports(named)) {
      for (const element of named.elements) {
        if (element.isTypeOnly) continue;
        const imported = (element.propertyName ?? element.name).text;
        groupImports.set(element.name.text, { group: groups.get(imported), label: imported });
      }
    }
  }

  const evaluating = new Set<ts.Node>();

  const group = (expression: ts.Expression): GroupRef | undefined => {
    const node = unwrap(expression);
    if (ts.isIdentifier(node)) {
      const direct = groupImports.get(node.text);
      if (direct && declarationOf(node, node.text)?.kind === 'import') return direct;
      const found = declarationOf(node, node.text);
      if (found?.kind === 'const' && !found.destructured && found.initializer && !evaluating.has(found.declaration)) {
        evaluating.add(found.declaration);
        try {
          return group(found.initializer);
        } finally {
          evaluating.delete(found.declaration);
        }
      }
      return undefined;
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const groups = moduleImports.get(node.expression.text);
      if (groups) return { group: groups.get(node.name.text), label: node.name.text };
    }
    return undefined;
  };

  const object = (expression: ts.Expression): ts.ObjectLiteralExpression | undefined => {
    const node = unwrap(expression);
    if (ts.isObjectLiteralExpression(node)) return node;
    if (ts.isIdentifier(node)) {
      const found = declarationOf(node, node.text);
      if (found?.kind === 'const' && !found.destructured && found.initializer && !evaluating.has(found.declaration)) {
        evaluating.add(found.declaration);
        try {
          return object(found.initializer);
        } finally {
          evaluating.delete(found.declaration);
        }
      }
    }
    return undefined;
  };

  const text = (node: ts.Node, value: string): Pieces[] => [[{ kind: 'text', text: value, at: node }]];

  /** A token read: `group['--key']`, `group.key`, or a computed key the checker can enumerate. */
  const tokenRead = (node: ts.PropertyAccessExpression | ts.ElementAccessExpression, ref: GroupRef): Pieces[] => {
    let keys: string[];
    if (ts.isPropertyAccessExpression(node)) keys = [node.name.text];
    else {
      const alternatives = value(node.argumentExpression);
      keys = [];
      for (const alternative of alternatives) {
        const [only, ...rest] = alternative;
        if (rest.length > 0 || !only || only.kind !== 'text') return miss(node.argumentExpression, 'The token key is computed at run time');
        keys.push(only.text);
      }
    }
    return keys.map((key) => {
      const known = ref.group !== undefined && ref.group.keys.includes(key);
      const kind = ref.group ? groupKind(ref.group) : 'unclassified';
      return [
        {
          kind: 'token',
          family: known && ref.group ? familyOf(ref.group, key) : undefined,
          palette: kind === 'palette',
          known,
          label: `${ref.label}${key.startsWith('--') ? `['${key}']` : `.${key}`}`,
          at: node,
        },
      ];
    });
  };

  /** Whether an initializer is nothing but one token read, which makes its const an alias of that token. */
  const directRead = (expression: ts.Expression): boolean => {
    const node = unwrap(expression);
    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && group(node.expression)) return true;
    if (ts.isTemplateExpression(node) && node.head.text === '' && node.templateSpans.length === 1) {
      const [span] = node.templateSpans;
      return span !== undefined && span.literal.text === '' && directRead(span.expression);
    }
    return false;
  };

  const value = (expression: ts.Expression): Pieces[] => {
    const node = unwrap(expression);
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return text(node, node.text);
    if (ts.isNumericLiteral(node)) return text(node, node.text);
    if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
      const sign = node.operator === ts.SyntaxKind.MinusToken ? '-' : node.operator === ts.SyntaxKind.PlusToken ? '' : undefined;
      if (sign !== undefined) return text(node, `${sign}${node.operand.text}`);
    }
    if (node.kind === ts.SyntaxKind.NullKeyword || node.kind === ts.SyntaxKind.FalseKeyword) return [[{ kind: 'null', at: node }]];
    if (ts.isIdentifier(node) && node.text === 'undefined') return [[{ kind: 'null', at: node }]];
    if (ts.isTemplateExpression(node)) {
      let out = text(node.head, node.head.text);
      for (const span of node.templateSpans) {
        out = product(product(out, value(span.expression)), text(span.literal, span.literal.text));
      }
      return out;
    }
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      if (operator === ts.SyntaxKind.PlusToken) return product(value(node.left), value(node.right));
      if (operator === ts.SyntaxKind.QuestionQuestionToken || operator === ts.SyntaxKind.BarBarToken) {
        return [...value(node.left), ...value(node.right)].slice(0, LIMIT);
      }
      if (operator === ts.SyntaxKind.AmpersandAmpersandToken) return [[{ kind: 'null' as const, at: node }], ...value(node.right)].slice(0, LIMIT);
      const arithmetic = ARITHMETIC.get(operator);
      if (arithmetic) {
        const left = numbers(value(node.left));
        const right = numbers(value(node.right));
        if (left && right) return left.flatMap((a) => right.map((b) => text(node, String(arithmetic(a, b)))[0] as Pieces)).slice(0, LIMIT);
      }
      return miss(node, 'Arithmetic over values the checker cannot reduce to numbers');
    }
    if (ts.isConditionalExpression(node)) return [...value(node.whenTrue), ...value(node.whenFalse)].slice(0, LIMIT);
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.flatMap((element) => (ts.isSpreadElement(element) ? miss(element, 'A spread in a fallback list') : value(element))).slice(0, LIMIT);
    }
    if (ts.isCallExpression(node)) {
      if (styleXCall(node, bindings) === 'firstThatWorks') return node.arguments.flatMap((argument) => value(argument)).slice(0, LIMIT);
      return [[{ kind: 'runtime', label: node.getText(file), at: node }]];
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const ref = group(node.expression);
      if (ref) return tokenRead(node, ref);
      if (node.expression.kind === ts.SyntaxKind.ThisKeyword) return [[{ kind: 'runtime', label: node.getText(file), at: node }]];
      const target = object(node.expression);
      if (target) {
        const wanted = ts.isPropertyAccessExpression(node)
          ? [node.name.text]
          : value(node.argumentExpression).map((alternative) => (alternative.length === 1 && alternative[0]?.kind === 'text' ? alternative[0].text : undefined));
        const members = target.properties.filter((member): member is ts.PropertyAssignment => ts.isPropertyAssignment(member));
        const picked = wanted.includes(undefined) ? members : members.filter((member) => wanted.includes(key(member.name)));
        if (picked.length === 0) return miss(node, 'The member is not in the object it reads');
        return picked.flatMap((member) => value(member.initializer)).slice(0, LIMIT);
      }
      return [[{ kind: 'runtime', label: node.getText(file), at: node }]];
    }
    if (ts.isIdentifier(node)) {
      if (group(node)) return miss(node, `The token group ${node.text} is used as a whole value`);
      const found = declarationOf(node, node.text);
      if (!found) return miss(node, `${node.text} is not declared in this file`);
      if (found.kind === 'parameter' || found.kind === 'mutable') return [[{ kind: 'runtime', label: node.text, at: node }]];
      if (found.kind === 'import') return miss(node, `${node.text} is imported, and only token groups are followed across modules`);
      if (found.kind === 'function') return miss(node, `${node.text} is a function, not a value`);
      if (found.destructured || !found.initializer) return [[{ kind: 'runtime', label: node.text, at: node }]];
      if (evaluating.has(found.declaration)) return miss(node, `${node.text} refers to itself`);
      const init = unwrap(found.initializer);
      if (ts.isCallExpression(init) && styleXCall(init, bindings) === 'keyframes') return [[{ kind: 'keyframes', at: node }]];
      evaluating.add(found.declaration);
      try {
        const alternatives = value(found.initializer);
        if (!directRead(found.initializer)) return alternatives;
        return alternatives.map((alternative) =>
          alternative.map((piece) => (piece.kind === 'token' ? { ...piece, alias: node.text, at: node } : piece)),
        );
      } finally {
        evaluating.delete(found.declaration);
      }
    }
    return miss(node, `A ${ts.SyntaxKind[node.kind]} the checker does not evaluate`);
  };

  const key = (name: ts.PropertyName): string | undefined => {
    const direct = propertyName(name);
    if (direct !== undefined) return direct;
    if (!ts.isComputedPropertyName(name)) return undefined;
    // `stylex.when.ancestor(':hover')` and its siblings build a relational condition key.
    const expression = unwrap(name.expression);
    if (ts.isCallExpression(expression)) {
      const callee = unwrap(expression.expression);
      if (
        ts.isPropertyAccessExpression(callee) &&
        ts.isPropertyAccessExpression(callee.expression) &&
        callee.expression.name.text === 'when' &&
        ts.isIdentifier(callee.expression.expression) &&
        bindings.namespaces.has(callee.expression.expression.text)
      ) {
        const argument = expression.arguments[0];
        const inner = argument ? staticText(argument) : undefined;
        return inner === undefined ? undefined : `when.${callee.name.text}(${inner})`;
      }
    }
    return staticText(name.expression);
  };

  /** An expression's one literal text, or undefined; a failed attempt is not itself a finding. */
  const staticText = (expression: ts.Expression): string | undefined => {
    const before = unresolved.length;
    const alternatives = value(expression);
    unresolved.length = before;
    const [only, ...rest] = alternatives;
    if (rest.length > 0 || !only) return undefined;
    return joinText(only);
  };

  return { bindings, value, object, key, group, unresolved };
}

// ---------------------------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------------------------

export type Declaration = {
  /** The const holding the table. */
  table: string;
  call: 'create' | 'keyframes';
  /** The style namespace, or the keyframes frame. */
  namespace: string;
  conditions: string[];
  property: string;
  value: ts.Expression;
  /** Declared in a dynamic style function, whose parameters are runtime values. */
  dynamic: boolean;
};

/** Every declaration in the file's `create` and `keyframes` tables, and what could not be walked. */
export function declarationsOf(file: ts.SourceFile, evaluator: Evaluator): { declarations: Declaration[]; unresolved: Unresolved[] } {
  const declarations: Declaration[] = [];
  const unresolved: Unresolved[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const call = styleXCall(node, evaluator.bindings);
      if (call === 'create' || call === 'keyframes') {
        const table = topLevelName(node) ?? call;
        const [argument] = node.arguments;
        const root = argument ? evaluator.object(argument) : undefined;
        if (!root) unresolved.push({ node: argument ?? node, reason: `The stylex.${call} argument is not an object the checker can read` });
        else walkRoot(root, { table, call });
      }
    }
    ts.forEachChild(node, visit);
  };

  const walkRoot = (root: ts.ObjectLiteralExpression, base: { table: string; call: 'create' | 'keyframes' }) => {
    for (const member of root.properties) {
      if (ts.isSpreadAssignment(member)) {
        const spread = evaluator.object(member.expression);
        if (spread) walkRoot(spread, base);
        else unresolved.push({ node: member, reason: 'A spread of style namespaces the checker cannot resolve' });
        continue;
      }
      if (!ts.isPropertyAssignment(member)) {
        unresolved.push({ node: member, reason: 'A style namespace that is not a plain property' });
        continue;
      }
      const namespace = evaluator.key(member.name);
      if (namespace === undefined) {
        unresolved.push({ node: member.name, reason: 'A computed namespace key the checker cannot resolve' });
        continue;
      }
      const init = unwrap(member.initializer);
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
        let body: ts.Expression | undefined;
        if (ts.isBlock(init.body)) {
          const last = init.body.statements[init.body.statements.length - 1];
          body = last && ts.isReturnStatement(last) ? last.expression : undefined;
        } else body = init.body;
        const block = body ? evaluator.object(body) : undefined;
        if (!block) unresolved.push({ node: init, reason: 'A dynamic style that does not return an object literal' });
        else walkBlock(block, { ...base, namespace, conditions: [], dynamic: true });
        continue;
      }
      const block = evaluator.object(member.initializer);
      if (!block) unresolved.push({ node: member.initializer, reason: 'A style namespace the checker cannot read as an object' });
      else walkBlock(block, { ...base, namespace, conditions: [], dynamic: false });
    }
  };

  type Place = Omit<Declaration, 'property' | 'value'>;

  const walkBlock = (block: ts.ObjectLiteralExpression, place: Place) => {
    for (const member of block.properties) {
      if (ts.isSpreadAssignment(member)) {
        const spread = evaluator.object(member.expression);
        if (spread) walkBlock(spread, place);
        else unresolved.push({ node: member, reason: 'A spread of declarations the checker cannot resolve' });
        continue;
      }
      if (ts.isShorthandPropertyAssignment(member)) {
        declarations.push({ ...place, conditions: [...place.conditions], property: member.name.text, value: member.name });
        continue;
      }
      if (!ts.isPropertyAssignment(member)) {
        unresolved.push({ node: member, reason: 'A declaration that is not a plain property' });
        continue;
      }
      const key = evaluator.key(member.name);
      if (key === undefined) {
        unresolved.push({ node: member.name, reason: 'A computed property or condition key the checker cannot resolve' });
        continue;
      }
      if (key.startsWith(':') || key.startsWith('@')) {
        const nested = evaluator.object(member.initializer);
        if (nested) walkBlock(nested, { ...place, conditions: [...place.conditions, key] });
        else unresolved.push({ node: member.initializer, reason: `The ${key} block is not an object the checker can read` });
        continue;
      }
      walkValue(key, member.initializer, place, place.conditions);
    }
  };

  const walkValue = (property: string, expression: ts.Expression, place: Place, conditions: string[]) => {
    const map = ts.isObjectLiteralExpression(unwrap(expression)) || ts.isIdentifier(unwrap(expression)) ? evaluator.object(expression) : undefined;
    if (!map) {
      declarations.push({ ...place, conditions, property, value: expression });
      return;
    }
    for (const member of map.properties) {
      if (ts.isSpreadAssignment(member)) {
        const spread = evaluator.object(member.expression);
        if (spread) walkValue(property, spread, place, conditions);
        else unresolved.push({ node: member, reason: 'A spread of conditions the checker cannot resolve' });
        continue;
      }
      if (!ts.isPropertyAssignment(member)) {
        unresolved.push({ node: member, reason: 'A condition that is not a plain property' });
        continue;
      }
      const condition = evaluator.key(member.name);
      if (condition === undefined) {
        unresolved.push({ node: member.name, reason: 'A computed condition key the checker cannot resolve' });
        continue;
      }
      walkValue(property, member.initializer, place, condition === 'default' ? conditions : [...conditions, condition]);
    }
  };

  visit(file);
  return { declarations, unresolved };
}

