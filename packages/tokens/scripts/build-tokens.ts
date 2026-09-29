/**
 * Writes the published token contracts in dist: tokens.css, tokens.json, and DESIGN.md.
 * None is hand-edited; see docs/spec/ultima.md and docs/spec/theme-studio.md.
 *
 * The values come from compiling the `.stylex.ts` sources, so the export and the
 * StyleX build can never disagree. The scale and step behind each color token
 * cannot be read back out of compiled CSS, so those come from the token source's
 * own step assignments, resolved against scripts/palette.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { transformAsync } from '@babel/core';
import styleXPlugin from '@stylexjs/babel-plugin';
import ts from 'typescript';

import { stylexOptions } from '../../../stylex.options.ts';
import { toDefaultDesignMd } from '../src/theme/export.ts';
import type { ContrastResult, TokenEntry, TokensJson } from '../src/tokens-json.ts';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(scriptsDir, '..');

const TOKEN_SOURCE = 'src/tokens.stylex.ts';
const THEME_SOURCE = 'src/themes.ts';

const LIGHT_MEDIA = '(prefers-color-scheme: light)';
const REDUCED_MOTION_MEDIA = '(prefers-reduced-motion: reduce)';

/** Substrings that would stop the export pasting into a self-contained `file://` document. */
const FORBIDDEN = ['@import', 'url(', '@font-face', '</style', '<script'];

type Mode = 'dark' | 'light';
const MODES: Mode[] = ['dark', 'light'];

type StyleXRule = [string, { ltr: string | null }, number];

async function compileCssRules(): Promise<string[]> {
  const rules: string[] = [];
  for (const relative of [TOKEN_SOURCE, THEME_SOURCE]) {
    const filename = join(packageDir, relative);
    const result = await transformAsync(readFileSync(filename, 'utf8'), {
      filename,
      // `cwd` is what Babel resolves the preset against, so the build works from
      // any directory rather than only from the package root.
      cwd: packageDir,
      babelrc: false,
      configFile: false,
      presets: ['@babel/preset-typescript'],
      plugins: [styleXPlugin.withOptions(stylexOptions({ dev: false }))],
    });
    const emitted = (result?.metadata as { stylex?: StyleXRule[] } | undefined)?.stylex ?? [];
    for (const rule of emitted) if (rule[1].ltr) rules.push(rule[1].ltr);
  }
  return rules;
}

function splitMedia(css: string): { media: string | null; rule: string } {
  const match = /^@media\s+([^{]+)\{(.*)\}$/s.exec(css);
  const condition = match?.[1];
  const inner = match?.[2];
  if (!condition || !inner) return { media: null, rule: css };
  return { media: condition.trim(), rule: inner };
}

function selectorOf(rule: string): string {
  return rule.slice(0, rule.indexOf('{')).trim();
}

function declarationsOf(rule: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const match of rule.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    const [, name, value] = match;
    if (name && value) declarations.set(name, value.trim());
  }
  return declarations;
}

/** A `defineVars` group compiles to `:root, .<hash>{...}`, one rule per condition. */
const VARS_SELECTOR = /^:root,\s*\.[\w-]+$/;
/** A `createTheme` result compiles to `.<hash>, .<hash>:root{...}`. */
const THEME_SELECTOR = /^\.([\w-]+),\s*\.\1:root$/;

type Compiled = {
  dark: Map<string, string>;
  light: Map<string, string>;
  reducedMotion: Map<string, string>;
  themes: Map<string, string>[];
};

function collect(rules: string[]): Compiled {
  const compiled: Compiled = {
    dark: new Map(),
    light: new Map(),
    reducedMotion: new Map(),
    themes: [],
  };
  for (const css of rules) {
    const { media, rule } = splitMedia(css);
    const selector = selectorOf(rule);
    const declarations = declarationsOf(rule);
    if (declarations.size === 0) continue;

    if (VARS_SELECTOR.test(selector)) {
      const target =
        media === null
          ? compiled.dark
          : media === LIGHT_MEDIA
            ? compiled.light
            : media === REDUCED_MOTION_MEDIA
              ? compiled.reducedMotion
              : null;
      if (!target) fail(`token source emits an unhandled condition: @media ${media}`);
      for (const [name, value] of declarations) target.set(name, value);
    } else if (media === null && THEME_SELECTOR.test(selector)) {
      compiled.themes.push(declarations);
    }
  }
  return compiled;
}

type ScaleRef = { scale: string; step: number; alpha: string };

type SourceToken = {
  name: string;
  group: string;
  paletteSteps: Partial<Record<Mode, ScaleRef>> | null;
};

function readPaletteStep(expression: ts.Expression): ScaleRef | null {
  if (ts.isTemplateExpression(expression)) {
    const [span] = expression.templateSpans;
    if (!span || expression.templateSpans.length !== 1 || expression.head.text !== '') return null;
    const ref = readPaletteStep(span.expression);
    return ref && { ...ref, alpha: span.literal.text };
  }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    const step = /^(?:dark|light)(\d+)$/.exec(expression.name.text)?.[1];
    if (!step) return null;
    return { scale: expression.expression.text, step: Number(step), alpha: '' };
  }
  return null;
}

function readTokenSource(): SourceToken[] {
  const filename = join(packageDir, TOKEN_SOURCE);
  const source = ts.createSourceFile(
    filename,
    readFileSync(filename, 'utf8'),
    ts.ScriptTarget.ESNext,
    true,
  );

  const conditions = new Map<string, string>();
  const tokens: SourceToken[] = [];

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      const { name, initializer } = declaration;
      if (!ts.isIdentifier(name) || !initializer) continue;

      if (ts.isStringLiteral(initializer)) {
        const query = /^@media\s+(.+)$/.exec(initializer.text)?.[1];
        if (query) conditions.set(name.text, query);
        continue;
      }
      if (
        !ts.isCallExpression(initializer) ||
        !ts.isPropertyAccessExpression(initializer.expression) ||
        initializer.expression.name.text !== 'defineVars'
      ) {
        continue;
      }
      const [members] = initializer.arguments;
      if (!members || !ts.isObjectLiteralExpression(members)) {
        fail(`${name.text} calls defineVars without an object literal`);
      }
      for (const member of members.properties) {
        if (!ts.isPropertyAssignment(member) || !ts.isStringLiteral(member.name)) continue;
        tokens.push({
          name: member.name.text,
          group: name.text,
          paletteSteps: readPaletteSteps(member.name.text, member.initializer, conditions),
        });
      }
    }
  }
  return tokens;
}

function readPaletteSteps(
  token: string,
  value: ts.Expression,
  conditions: Map<string, string>,
): Partial<Record<Mode, ScaleRef>> | null {
  if (!ts.isObjectLiteralExpression(value)) return null;

  const refs: Partial<Record<Mode, ScaleRef>> = {};
  for (const member of value.properties) {
    if (!ts.isPropertyAssignment(member)) continue;
    const key = member.name;
    if (ts.isIdentifier(key) && key.text === 'default') {
      const ref = readPaletteStep(member.initializer);
      if (ref) refs.dark = ref;
    } else if (ts.isComputedPropertyName(key) && ts.isIdentifier(key.expression)) {
      if (conditions.get(key.expression.text) !== LIGHT_MEDIA) continue;
      const ref = readPaletteStep(member.initializer);
      if (ref) refs.light = ref;
    }
  }

  if (!refs.dark && !refs.light) return null;
  if (!refs.dark || !refs.light) {
    fail(`${token} names a palette step in only one mode; a color token needs both`);
  }
  return refs;
}

type ModeValues = Record<Mode, string>;

function resolveValues(tokens: SourceToken[], compiled: Compiled): Map<string, ModeValues> {
  const values = new Map<string, ModeValues>();
  for (const token of tokens) {
    const dark = compiled.dark.get(token.name);
    if (dark === undefined) fail(`${token.name} is declared in ${TOKEN_SOURCE} but emits no CSS`);
    values.set(token.name, { dark, light: compiled.light.get(token.name) ?? dark });
  }
  for (const name of compiled.dark.keys()) {
    if (!values.has(name)) fail(`${name} is emitted as CSS but is not a defineVars member`);
  }
  return values;
}

type Palette = Record<string, Record<Mode, string[]>>;

function checkAgainstPalette(tokens: SourceToken[], values: Map<string, ModeValues>): void {
  const { palette } = JSON.parse(readFileSync(join(scriptsDir, 'palette.json'), 'utf8')) as {
    palette: Palette;
  };
  for (const token of tokens) {
    if (!token.paletteSteps) continue;
    for (const mode of MODES) {
      const ref = token.paletteSteps[mode];
      const value = values.get(token.name)?.[mode];
      if (!ref || value === undefined) continue;
      const scale = palette[ref.scale];
      if (!scale) fail(`${token.name} names the scale ${ref.scale}, which palette.json has not`);
      const expected = scale[mode][ref.step - 1];
      if (expected === undefined) {
        fail(`${token.name} names ${ref.scale} step ${ref.step}, which palette.json has not`);
      }
      if (value !== expected + ref.alpha) {
        fail(
          `${token.name} is ${value} in ${mode} but ${ref.scale}${ref.step} is ${expected + ref.alpha}`,
        );
      }
    }
  }
}

function themesByMode(
  compiled: Compiled,
  colorTokens: string[],
  values: Map<string, ModeValues>,
): Record<Mode, Map<string, string>> {
  const anchor = colorTokens[0];
  if (!anchor) fail('the token source declares no color tokens');
  const anchorValues = values.get(anchor);
  if (!anchorValues) fail(`${anchor} has no resolved value`);

  const byMode: Partial<Record<Mode, Map<string, string>>> = {};
  for (const theme of compiled.themes) {
    const value = theme.get(anchor);
    const mode = MODES.find((candidate) => anchorValues[candidate] === value);
    if (!mode) {
      fail(`a createTheme sets ${anchor} to ${value}, which is neither mode's value`);
    }
    if (byMode[mode]) fail(`two createTheme calls both resolve to the ${mode} mode`);
    byMode[mode] = theme;
  }
  for (const mode of MODES) {
    if (!byMode[mode]) fail(`${THEME_SOURCE} has no createTheme for the ${mode} mode`);
  }
  return byMode as Record<Mode, Map<string, string>>;
}

/**
 * `themes.ts` restates every palette value by hand, so this is what catches it drifting
 * from `tokens.stylex.ts`.
 */
function checkThemesMatchTokens(
  themes: Record<Mode, Map<string, string>>,
  colorTokens: string[],
  values: Map<string, ModeValues>,
): void {
  for (const mode of MODES) {
    for (const name of colorTokens) {
      const expected = values.get(name)?.[mode];
      const actual = themes[mode].get(name);
      if (actual === undefined) fail(`the ${mode} theme is missing ${name}`);
      if (actual !== expected) {
        fail(`the ${mode} theme sets ${name} to ${actual}, but the token source says ${expected}`);
      }
    }
  }
}

function block(selector: string, mode: Mode, lines: string[], indent = ''): string {
  const body = [`color-scheme: ${mode};`, ...lines].map((line) => `${indent}  ${line}`);
  return [`${indent}${selector} {`, ...body, `${indent}}`].join('\n');
}

function buildCss(
  tokens: SourceToken[],
  values: Map<string, ModeValues>,
  themes: Record<Mode, Map<string, string>>,
  reducedMotion: Map<string, string>,
): string {
  const declarations = (mode: Mode): string[] =>
    tokens.map((token) => `${token.name}: ${values.get(token.name)?.[mode]};`);

  // The [data-theme] blocks carry the compiled themes. A theme only overrides the color
  // group, so every other token falls back to that mode's value.
  const themed = (mode: Mode): string[] =>
    tokens.map((token) => {
      const value = themes[mode].get(token.name) ?? values.get(token.name)?.[mode];
      return `${token.name}: ${value};`;
    });

  const sections = [
    block(':root', 'dark', declarations('dark')),
    [
      `@media ${LIGHT_MEDIA} {`,
      block(':root', 'light', declarations('light'), '  '),
      '}',
    ].join('\n'),
    block('[data-theme="dark"]', 'dark', themed('dark')),
    block('[data-theme="light"]', 'light', themed('light')),
  ];

  if (reducedMotion.size > 0) {
    const selector = [':root', '[data-theme="dark"]', '[data-theme="light"]'].join(',\n  ');
    const lines = [...reducedMotion].map(([name, value]) => `    ${name}: ${value};`);
    sections.push([`@media ${REDUCED_MOTION_MEDIA} {`, `  ${selector} {`, ...lines, '  }', '}'].join('\n'));
  }

  const banner = [
    '/* Ultima design tokens. Generated by packages/tokens/scripts/build-tokens.ts. */',
    '/* Do not edit: every value here comes from the StyleX token sources. */',
  ].join('\n');
  return `${[banner, ...sections].join('\n\n')}\n`;
}

function channel(hex: string, at: number): number {
  const value = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const digits = hex.replace('#', '');
  return 0.2126 * channel(digits, 0) + 0.7152 * channel(digits, 2) + 0.0722 * channel(digits, 4);
}

function contrastRatio(a: string, b: string): number {
  const [first, second] = [luminance(a), luminance(b)];
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const ROLES = ['accent', 'highlight', 'success', 'warning', 'danger'];

type Pairing = { foreground: string; background: string; minimum: number };

/** The Contrast gate table from docs/spec/ultima.md. */
function pairings(): Pairing[] {
  const table: Pairing[] = [];
  const add = (foreground: string, background: string, minimum: number) =>
    table.push({
      foreground: `--ult-color-${foreground}`,
      background: `--ult-color-${background}`,
      minimum,
    });

  for (const foreground of ['text', 'text-muted', 'text-subtle']) {
    for (const background of ['surface', 'surface-raised', 'surface-sunken', 'surface-hover']) {
      add(foreground, background, 4.5);
    }
  }
  for (const background of ['surface', 'surface-raised']) {
    add('border-strong', background, 3);
    add('border-focus', background, 3);
  }
  for (const role of ROLES) {
    for (const background of ['surface', 'surface-raised', `${role}-subtle`]) {
      add(`${role}-text`, background, 4.5);
    }
    for (const background of [role, `${role}-hover`, `${role}-active`]) {
      add(`${role}-contrast`, background, 4.5);
    }
  }
  for (const background of ['action', 'action-hover', 'action-active']) {
    add('action-contrast', background, 4.5);
  }
  return table;
}

function runGate(values: Map<string, ModeValues>): ContrastResult[] {
  return pairings().map((pairing) => {
    const foreground = values.get(pairing.foreground);
    const background = values.get(pairing.background);
    if (!foreground || !background) {
      fail(`the contrast gate names ${pairing.foreground} on ${pairing.background}, which is not a token`);
    }
    const ratios = MODES.map(
      (mode) => Math.round(contrastRatio(foreground[mode], background[mode]) * 100) / 100,
    ) as [number, number];
    return {
      ...pairing,
      dark: ratios[0],
      light: ratios[1],
      pass: ratios.every((ratio) => ratio >= pairing.minimum),
    };
  });
}

function buildJson(
  tokens: SourceToken[],
  values: Map<string, ModeValues>,
  contrast: ContrastResult[],
): string {
  const entries: Record<string, TokenEntry> = {};
  for (const token of tokens) {
    const resolved = values.get(token.name);
    if (!resolved) continue;
    const perMode = (mode: Mode) => {
      const ref = token.paletteSteps?.[mode];
      return ref
        ? { scale: ref.scale, step: ref.step, value: resolved[mode] }
        : { value: resolved[mode] };
    };
    entries[token.name] = { group: token.group, dark: perMode('dark'), light: perMode('light') };
  }
  const json: TokensJson = { version: 0, tokens: entries, contrast };
  return `${JSON.stringify(json, null, 2)}\n`;
}

function fail(message: string): never {
  console.error(`@ultima/tokens build: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const compiled = collect(await compileCssRules());
  const tokens = readTokenSource();
  const values = resolveValues(tokens, compiled);

  checkAgainstPalette(tokens, values);
  const colorTokens = tokens.filter((token) => token.paletteSteps).map((token) => token.name);
  const themes = themesByMode(compiled, colorTokens, values);
  checkThemesMatchTokens(themes, colorTokens, values);

  const css = buildCss(tokens, values, themes, compiled.reducedMotion);
  for (const substring of FORBIDDEN) {
    if (css.includes(substring)) fail(`tokens.css contains ${substring}, which the export forbids`);
  }

  const contrast = runGate(values);
  const failures = contrast.filter((result) => !result.pass);
  for (const { foreground, background, minimum, dark, light } of failures) {
    console.error(
      `@ultima/tokens build: ${foreground} on ${background} is ${dark}:1 dark and ${light}:1 light, minimum ${minimum}:1`,
    );
  }
  if (failures.length > 0) process.exit(1);

  const dist = join(packageDir, 'dist');
  mkdirSync(dist, { recursive: true });
  writeFileSync(join(dist, 'tokens.css'), css);
  writeFileSync(join(dist, 'tokens.json'), buildJson(tokens, values, contrast));
  const table = (mode: Mode) => Object.fromEntries([...values].map(([name, value]) => [name, value[mode]]));
  writeFileSync(join(dist, 'DESIGN.md'), toDefaultDesignMd({ dark: table('dark'), light: table('light') }));
  console.log(
    `@ultima/tokens: wrote dist/tokens.css and dist/tokens.json (${tokens.length} tokens, ${contrast.length} pairings pass)`,
  );
  console.log('@ultima/tokens: wrote dist/DESIGN.md');
}

await main();
