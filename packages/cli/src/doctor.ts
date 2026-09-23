// docs/spec/ultima.md, Consumer CLI, Doctor. Reads files and syntax trees only, never
// builds a type program, and never writes.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import type { Diagnostic, Position } from './diagnostic.ts';

export type Target = 'vite' | 'next';

declare const __ULTIMA_COMMIT__: string | undefined;
const SPEC = `https://github.com/frankieramirez/ultima/blob/${
  typeof __ULTIMA_COMMIT__ === 'string' ? __ULTIMA_COMMIT__ : 'main'
}/docs/spec/ultima.md`;

const SETUP_COMMAND: Record<Target, string> = {
  vite: 'npx shadcn add https://ultima.systems/r/setup-vite.json',
  next: 'npx shadcn add https://ultima.systems/r/setup-next.json',
};

const REGISTRY = /^https?:\/\/.+\/r\/\{name\}\.json$/;

export function detectTarget(root: string): Target | 'none' | 'both' {
  const vite = existsSync(join(root, 'ultima.vite.ts'));
  const next =
    existsSync(join(root, 'babel.config.js')) &&
    (existsSync(join(root, 'app/ultima.css')) || existsSync(join(root, 'src/app/ultima.css')));
  if (vite && next) return 'both';
  return vite ? 'vite' : next ? 'next' : 'none';
}

export function doctor(
  root: string,
  flag: Target | undefined,
): { usage: string } | { target: Target | null; diagnostics: Diagnostic[] } {
  const detected = flag ?? detectTarget(root);
  if (detected === 'both') {
    return {
      usage: 'both the Vite and the Next.js setup items are installed here; pass --target vite or --target next',
    };
  }
  if (detected !== 'none') return { target: detected, diagnostics: checkComponentsJson(root, detected) };

  const noTarget: Diagnostic = {
    ruleId: 'ULT-SETUP-001',
    severity: 'blocking',
    file: '.',
    message: 'No Ultima setup item is installed: neither ultima.vite.ts nor app/ultima.css with babel.config.js.',
    repair: `Run \`${SETUP_COMMAND.vite}\` for Vite or \`${SETUP_COMMAND.next}\` for Next.js.`,
    link: `${SPEC}#entry-point`,
  };
  return {
    target: null,
    diagnostics: existsSync(join(root, 'components.json')) ? [...checkComponentsJson(root, null), noTarget] : [noTarget],
  };
}

function checkComponentsJson(root: string, target: Target | null): Diagnostic[] {
  const file = 'components.json';
  const link = `${SPEC}#setup-items`;
  const setup = target ? `\`${SETUP_COMMAND[target]}\`` : `the setup item for your target`;
  if (!existsSync(join(root, file))) {
    return [
      {
        ruleId: 'ULT-SETUP-002',
        severity: 'blocking',
        file,
        message: 'components.json is missing, so `shadcn add @ultima/<item>` has no namespace to resolve.',
        repair: `Run ${setup}; it installs components.json.`,
        link,
      },
    ];
  }

  const text = readFileSync(join(root, file), 'utf8');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    json = error;
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json) || json instanceof Error) {
    return [
      {
        ruleId: 'ULT-SETUP-003',
        severity: 'incomplete',
        file,
        message: `components.json is not a JSON object${json instanceof Error ? `: ${json.message}` : ''}.`,
        repair: `Repair the JSON, or reinstall it with ${setup}.`,
        link,
      },
    ];
  }

  const source = ts.parseJsonText(file, text);
  const read = (path: string[]) => path.reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], json);
  const shown = (value: unknown) => (value === undefined ? 'missing' : JSON.stringify(value));
  const diagnostics: Diagnostic[] = [];
  const field = (ruleId: string, path: string[], ok: (value: unknown) => boolean, why: string, repair: string) => {
    const value = read(path);
    if (ok(value)) return;
    const name = path.map((key, index) => (index === 0 ? key : key.startsWith('@') ? `["${key}"]` : `.${key}`)).join('');
    diagnostics.push({
      ruleId,
      severity: 'blocking',
      file,
      ...nearestPosition(source, path),
      message: `${name} is ${shown(value)}; ${why}`,
      repair,
      link,
    });
  };

  field(
    'ULT-SETUP-004',
    ['style'],
    (value) => value === 'base-ultima',
    'Ultima items need "base-ultima", whose base- prefix turns on the Base UI render transform.',
    'Set "style": "base-ultima".',
  );
  field(
    'ULT-SETUP-005',
    ['tailwind', 'cssVariables'],
    (value) => value === true,
    'Ultima needs true, because false makes the shadcn CLI rewrite string literals in installed source.',
    'Set "cssVariables": true inside "tailwind".',
  );
  field(
    'ULT-SETUP-006',
    ['registries', '@ultima'],
    (value) => REGISTRY.test(typeof value === 'object' ? String((value as { url?: unknown } | null)?.url) : String(value)),
    'the @ultima namespace must point at a registry root followed by /r/{name}.json.',
    'Set "@ultima": "https://ultima.systems/r/{name}.json" inside "registries".',
  );
  for (const [alias, path] of [
    ['ui', '@/components/ui'],
    ['lib', '@/lib'],
  ] as const) {
    field(
      'ULT-SETUP-007',
      ['aliases', alias],
      (value) => value === path,
      `Ultima installs flat, into "${path}".`,
      `Set "${alias}": "${path}" inside "aliases".`,
    );
  }
  if (target) {
    field(
      'ULT-SETUP-008',
      ['rsc'],
      (value) => (value === true) === (target === 'next'),
      `the ${target === 'next' ? 'Next.js' : 'Vite'} target needs ${target === 'next'}.`,
      `Set "rsc": ${target === 'next'}.`,
    );
  }
  return diagnostics;
}

function nearestPosition(source: ts.JsonSourceFile, path: string[]): { start?: Position; end?: Position } {
  let node: ts.Expression | undefined = source.statements[0]?.expression;
  let found: ts.Expression | undefined;
  for (const key of path) {
    if (!node || !ts.isObjectLiteralExpression(node)) break;
    const property = node.properties.find(
      (candidate): candidate is ts.PropertyAssignment =>
        ts.isPropertyAssignment(candidate) && ts.isStringLiteral(candidate.name) && candidate.name.text === key,
    );
    if (!property) break;
    node = found = property.initializer;
  }
  if (!found) return {};
  const position = (offset: number) => {
    const { line, character } = source.getLineAndCharacterOfPosition(offset);
    return { line: line + 1, column: character + 1 };
  };
  return { start: position(found.getStart(source)), end: position(found.getEnd()) };
}
