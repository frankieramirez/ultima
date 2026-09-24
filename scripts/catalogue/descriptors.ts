import ts from 'typescript';

import { validateHandSteps } from '../../packages/cli/src/hand-steps.ts';
import { lineOf, parse } from './source.ts';

export const KINDS = ['react', 'element', 'setup', 'source-bundle', 'artifact', 'recipe'] as const;

export type Kind = (typeof KINDS)[number];

/**
 * The default export's value, when the file holds only type imports and `export default <literal>
 * satisfies <Type>`. Objects, arrays, strings, numbers and booleans are the whole literal grammar;
 * anything else is a problem at its line.
 */
export function readLiteral(path: string, text: string): { value?: unknown; problems: string[] } {
  const file = parse(path, text);
  const problems: string[] = [];
  const at = (node: ts.Node, message: string): undefined => {
    problems.push(`line ${lineOf(file, node)}: ${message}`);
  };
  let value: unknown;
  let exported = false;

  const literal = (node: ts.Expression): unknown => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (
      ts.isPrefixUnaryExpression(node) &&
      node.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(node.operand)
    ) {
      return -Number(node.operand.text);
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isArrayLiteralExpression(node)) {
      return node.elements.map((element) => {
        if (ts.isSpreadElement(element) || ts.isOmittedExpression(element)) return at(element, 'a spread or hole');
        return literal(element);
      });
    }
    if (ts.isObjectLiteralExpression(node)) {
      const object: Record<string, unknown> = {};
      for (const property of node.properties) {
        if (
          !ts.isPropertyAssignment(property) ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))
        ) {
          at(property, 'only plain `key: value` properties are data');
          continue;
        }
        if (property.name.text in object) at(property, `"${property.name.text}" is repeated`);
        object[property.name.text] = literal(property.initializer);
      }
      return object;
    }
    at(node, `${ts.SyntaxKind[node.kind]} is not data`);
    return undefined;
  };

  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly) continue;
    if (ts.isExportAssignment(statement) && !statement.isExportEquals && !exported) {
      exported = true;
      if (!ts.isSatisfiesExpression(statement.expression)) {
        at(statement, 'the default export is not checked with `satisfies`');
        value = literal(statement.expression);
      } else {
        value = literal(statement.expression.expression);
      }
      continue;
    }
    at(statement, 'only type imports and one `export default` are allowed');
  }
  if (!exported) problems.push('no default export');
  return { value, problems };
}

type Check = (value: unknown, where: string) => string[];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text: Check = (value, where) =>
  typeof value === 'string' && value.trim() !== '' ? [] : [`${where} is not a non-empty string`];

const integer: Check = (value, where) => (Number.isInteger(value) ? [] : [`${where} is not an integer`]);

const oneOf =
  (...allowed: string[]): Check =>
  (value, where) =>
    allowed.includes(value as string) ? [] : [`${where} is not one of ${allowed.join(', ')}`];

const list =
  (item: Check): Check =>
  (value, where) =>
    Array.isArray(value) ? value.flatMap((entry, index) => item(entry, `${where}[${index}]`)) : [`${where} is not an array`];

type Fields = Record<string, { check: Check; optional?: boolean }>;

const object =
  (fields: Fields): Check =>
  (value, where) => {
    if (!isObject(value)) return [`${where} is not an object`];
    const problems: string[] = [];
    for (const key of Object.keys(value)) {
      if (!(key in fields)) problems.push(`${where}.${key} is not a known field`);
    }
    for (const [key, { check, optional }] of Object.entries(fields)) {
      if (value[key] === undefined) {
        if (!optional) problems.push(`${where}.${key} is missing`);
      } else problems.push(...check(value[key], `${where}.${key}`));
    }
    return problems;
  };

const handSteps: Check = (value, where) => {
  const shape = list(
    object({
      prose: { check: text },
      spec: { check: text, optional: true },
      assertion: { check: (entry, at) => (isObject(entry) ? [] : [`${at} is not an object`]), optional: true },
      unverifiable: { check: text, optional: true },
    }),
  )(value, where);
  if (shape.length > 0) return shape;
  try {
    validateHandSteps(where, value as Parameters<typeof validateHandSteps>[1]);
    return [];
  } catch (error) {
    return [(error as Error).message];
  }
};

const attribute: Check = (value, where) => {
  const problems = object({
    names: { check: list(text) },
    on: { check: text },
    symbol: { check: text, optional: true },
    text: { check: text, optional: true },
  })(value, where);
  if (problems.length === 0 && isObject(value) && (value.symbol === undefined) === (value.text === undefined)) {
    problems.push(`${where} needs exactly one of symbol and text`);
  }
  return problems;
};

const common: Fields = {
  id: { check: text },
  kind: { check: oneOf(...KINDS) },
  title: { check: text },
  description: { check: text },
  contract: { check: text },
};

const FIELDS: Record<Kind, Fields> = {
  react: {
    ...common,
    installDocs: { check: text },
    docsDescription: { check: text, optional: true },
    primaryExport: { check: text },
    release: { check: text },
    order: { check: integer },
  },
  element: {
    ...common,
    installDocs: { check: text },
    reactItem: { check: text },
    order: { check: integer },
    registryDependencies: { check: list(text) },
    tags: { check: list(text) },
    attributes: { check: list(attribute) },
    example: { check: text },
  },
  setup: {
    ...common,
    files: { check: list(object({ path: { check: text }, type: { check: oneOf('registry:file') }, target: { check: text } })) },
    dependencies: { check: list(text) },
    devDependencies: { check: list(text) },
    registryDependencies: { check: list(text), optional: true },
    handSteps: { check: handSteps },
    checks: { check: handSteps },
  },
  'source-bundle': {
    ...common,
    installDocs: { check: text },
    inventory: { check: oneOf('tokens', 'lib') },
  },
  artifact: {
    ...common,
    installDocs: { check: text },
    producer: { check: oneOf('tokens-build') },
    output: { check: text },
    fileType: { check: oneOf('registry:file') },
    target: { check: text },
  },
  recipe: {
    ...common,
    page: { check: text },
    section: { check: text },
    release: { check: text },
    demos: { check: list(text) },
  },
};

export function shapeProblems(kind: Kind, value: unknown): string[] {
  return object(FIELDS[kind])(value, 'descriptor');
}

export function releaseProblems(value: unknown): string[] {
  return list(object({ id: { check: text }, label: { check: text } }))(value, 'releases');
}
