import postcss, { type ChildNode } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import ts from 'typescript';

import { compare, type ThemeArtifact } from '../../tokens/src/theme/compare.ts';
import type { ResolvedDraft, ThemeDraft } from '../../tokens/src/theme/draft.ts';
import { toCss, toDefaultDesignMd, toDesignMd, toStylex } from '../../tokens/src/theme/export.ts';
import { parseGeneratedRegion, withoutProvenance } from '../../tokens/src/theme/provenance.ts';

export type Difference = { location: string; expected: string | null; actual: string | null };
export type ContentResult = { matches: boolean; differences: Difference[]; scopes: string[]; reason?: string };
export const THEME_TOKEN = /^--ult-(color|space|text|font|radius|shadow|filter|motion)-/;

function differences(expected: string[], actual: string[]): Difference[] {
  return Array.from({ length: Math.max(expected.length, actual.length) }, (_, index) => ({
    location: `ordered content ${index + 1}`, expected: expected[index] ?? null, actual: actual[index] ?? null,
  })).filter((row) => row.expected !== row.actual);
}

function selector(value: string): string {
  const ast = selectorParser().astSync(value);
  ast.walk((node) => { node.spaces.before = ''; node.spaces.after = ''; });
  return ast.toString();
}

export function cssContent(content: string): { records: string[]; scopes: string[]; tokens: string[] } {
  const root = postcss.parse(content);
  const records: string[] = [];
  const scopes = new Set<string>();
  const tokens = new Set<string>();
  const walk = (nodes: ChildNode[], context: string[]) => {
    for (const node of nodes) {
      if (node.type === 'comment') continue;
      if (node.type === 'atrule') {
        if (node.name !== 'media' && node.name !== 'layer') throw new Error(`Unsupported @${node.name} expression.`);
        if (!node.nodes) throw new Error(`Unresolved @${node.name} statement.`);
        records.push(`start @${node.name} ${node.params.trim()}`);
        walk(node.nodes, [...context, `@${node.name} ${node.params.trim()}`]);
        records.push(`end @${node.name}`);
      } else if (node.type === 'rule') {
        const scope = selector(node.selector);
        scopes.add([...context, scope].join(' / '));
        records.push(`selector ${scope}`);
        walk(node.nodes, [...context, scope]);
        records.push('end selector');
      } else if (node.type === 'decl') {
        if (/\b(?:var|env|attr|calc)\s*\(/i.test(node.value)) throw new Error(`Unsupported expression for ${node.prop}: ${node.value}`);
        if (THEME_TOKEN.test(node.prop)) tokens.add(node.prop);
        records.push(`${context.join(' / ')} / ${node.prop}: ${node.value.trim()}${node.important ? ' !important' : ''}`);
      }
    }
  };
  walk(root.nodes, []);
  return { records, scopes: [...scopes], tokens: [...tokens] };
}

function stylexContent(content: string): string[] {
  const source = ts.createSourceFile('theme.ts', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  if ((source as ts.SourceFile & { parseDiagnostics: unknown[] }).parseDiagnostics.length) throw new Error('StyleX source does not parse.');
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && (!ts.isPropertyAccessExpression(node.expression)
      || node.expression.expression.getText(source) !== 'stylex' || !['create', 'createTheme'].includes(node.expression.name.text))) {
      throw new Error(`Unsupported StyleX expression: ${node.getText(source)}`);
    }
    if (ts.isSpreadAssignment(node) || ts.isSpreadElement(node) || ts.isComputedPropertyName(node)
      || ts.isTemplateExpression(node) || ts.isConditionalExpression(node)) throw new Error('Unsupported computed StyleX expression.');
    ts.forEachChild(node, visit);
  };
  visit(source);
  const imports = source.statements.filter(ts.isImportDeclaration).filter((statement) => ts.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text !== '@stylexjs/stylex');
  let normalized = content;
  for (const statement of [...imports].reverse()) {
    normalized = normalized.slice(0, statement.moduleSpecifier.getStart(source)) + "'<local-token-source>'" + normalized.slice(statement.moduleSpecifier.end);
  }
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, normalized);
  const records: string[] = [];
  let token: ts.SyntaxKind;
  while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
    records.push(`${token}:${token === ts.SyntaxKind.StringLiteral ? scanner.getTokenValue() : scanner.getTokenText()}`);
  }
  return records;
}

export function compareContent(draft: ThemeDraft, artifact: ThemeArtifact): ContentResult {
  const shared = compare(draft, artifact);
  try {
    if (artifact.kind === 'css') {
      const expected = cssContent(toCss(draft));
      const actual = cssContent(artifact.content);
      const changes = differences(expected.records, actual.records);
      return { matches: changes.length === 0, differences: changes, scopes: actual.scopes };
    }
    if (artifact.kind === 'stylex') {
      const changes = differences(stylexContent(toStylex(draft)), stylexContent(artifact.content));
      return { matches: changes.length === 0, differences: changes, scopes: ['ultimaTheme.dark', 'ultimaTheme.light', 'reduced motion'] };
    }
    const region = parseGeneratedRegion(artifact.content);
    if (shared.status === 'unresolved') throw new Error(shared.reason);
    const expected = parseGeneratedRegion(toDesignMd(draft));
    if (expected.status !== 'intact') throw new Error('Generated document is unresolved.');
    const actual = region.status === 'unmarked' || region.status === 'unresolved' ? artifact.content : region.content;
    const changes = differences(withoutProvenance(expected.content).split('\n'), withoutProvenance(actual).split('\n'));
    if (region.status === 'edited') changes.unshift({ location: 'generated region digest', expected: 'intact', actual: 'edited' });
    return { matches: shared.contentMatches === true, differences: changes, scopes: ['generated region; consumer prose excluded'] };
  } catch (error) {
    return { matches: false, differences: [], scopes: [], reason: String(error) };
  }
}

type Value = string | number | { [name: string]: Value };
const normalizedValue = (input: string | number) => /^-?\d+(?:\.\d+)?s$/.test(String(input)) ? `${Number(String(input).slice(0, -1)) * 1000}ms` : String(input);

/** A closed syntax interpreter; consumer modules are never imported or executed. */
export function localTokenTables(content: string, condition?: (name: string, raw: Value) => void): ResolvedDraft {
  const source = ts.createSourceFile('tokens.stylex.ts', content, ts.ScriptTarget.Latest, true);
  const environment = new Map<string, Value>();
  const tables: ResolvedDraft = { dark: {}, light: {} };
  const value = (node: ts.Node): Value => {
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (ts.isIdentifier(node) && environment.has(node.text)) return environment.get(node.text)!;
    if (ts.isPropertyAccessExpression(node)) {
      const object = value(node.expression);
      if (typeof object === 'object' && node.name.text in object) return object[node.name.text]!;
    }
    if (ts.isTemplateExpression(node)) return node.head.text + node.templateSpans.map((span) => {
      const part = value(span.expression);
      if (typeof part === 'object') throw new Error('Unsupported template value.');
      return String(part) + span.literal.text;
    }).join('');
    if (ts.isObjectLiteralExpression(node)) {
      const result: Record<string, Value> = {};
      for (const member of node.properties) {
        if (!ts.isPropertyAssignment(member)) throw new Error('Unsupported token member.');
        const key = ts.isComputedPropertyName(member.name) ? value(member.name.expression) : ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) ? member.name.text : null;
        if (typeof key !== 'string' || key in result) throw new Error('Unknown or duplicate token key.');
        result[key] = value(member.initializer);
      }
      return result;
    }
    throw new Error(`Unsupported installed-token expression: ${node.getText(source)}`);
  };
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const init = declaration.initializer;
      if (!ts.isCallExpression(init)) { environment.set(declaration.name.text, value(init)); continue; }
      if (!ts.isPropertyAccessExpression(init.expression) || init.expression.expression.getText(source) !== 'stylex'
        || !['defineVars', 'defineConsts'].includes(init.expression.name.text) || init.arguments.length !== 1) throw new Error('Unsupported installed-token call.');
      const members = value(init.arguments[0]!);
      if (typeof members !== 'object') throw new Error('Token group is not an object.');
      environment.set(declaration.name.text, members);
      if (init.expression.name.text !== 'defineVars') continue;
      for (const [name, raw] of Object.entries(members)) {
        if (!THEME_TOKEN.test(name)) continue;
        condition?.(name, raw);
        const dark = typeof raw === 'object' ? raw.default : raw;
        const light = typeof raw === 'object' ? raw['@media (prefers-color-scheme: light)'] ?? dark : raw;
        if (typeof dark === 'object' || dark === undefined || typeof light === 'object' || light === undefined) throw new Error(`Unsupported token ${name}.`);
        if (typeof raw === 'object' && Object.keys(raw).some((key) => !['default', '@media (prefers-color-scheme: light)', '@media (prefers-reduced-motion: reduce)'].includes(key))) throw new Error(`Unsupported token condition for ${name}.`);
        tables.dark[name] = normalizedValue(dark);
        tables.light[name] = normalizedValue(light);
      }
    }
  }
  if (!Object.keys(tables.dark).length) throw new Error('No local semantic token definitions.');
  return tables;
}

export function reducedMotionDifferences(content: string): Difference[] {
  const actual = new Map<string, string | null>();
  localTokenTables(content, (name, raw) => {
    const reduced = typeof raw === 'object' ? raw['@media (prefers-reduced-motion: reduce)'] : undefined;
    actual.set(name, typeof reduced === 'string' || typeof reduced === 'number' ? normalizedValue(reduced) : null);
  });
  return Object.entries({ '--ult-motion-fast': '1ms', '--ult-motion-base': '1ms', '--ult-motion-slow': '1ms', '--ult-motion-loop': '0ms' })
    .filter(([name, expected]) => actual.get(name) !== expected)
    .map(([name, expected]) => ({ location: `local token reduced motion / ${name}`, expected, actual: actual.get(name) ?? null }));
}

export function compareDefaultDocument(tables: ResolvedDraft, content: string): ContentResult {
  const actual = parseGeneratedRegion(content);
  const expected = parseGeneratedRegion(toDefaultDesignMd(tables));
  if (actual.status === 'unresolved' || expected.status !== 'intact') return { matches: false, differences: [], scopes: [], reason: 'Unsupported generated region.' };
  const matches = actual.status === 'intact' && withoutProvenance(actual.content) === withoutProvenance(expected.content);
  return { matches, scopes: ['local installed tokens; generated region; consumer prose excluded'], differences: matches ? [] : [{ location: 'local default document', expected: expected.content, actual: actual.status === 'unmarked' ? content : actual.content }] };
}
