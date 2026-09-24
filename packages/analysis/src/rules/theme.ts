// The consumer's semantic color overrides: docs/spec/ultima.md, Consumer CLI, Check, with Overriding and
// Contrast gate. ULT-APP-THEME-001: overriding a role's base color supplies its state tokens too.
// ULT-APP-CONTRAST-001: every override passes the contrast gate's pairings in each mode it applies to.
// Both read `stylex.createTheme` over the `color` group and CSS rules declaring `--ult-color-*`. A scope
// bound to one mode is checked in that mode and every other scope in both; a token a scope leaves unset
// resolves to Ultima's default. The pairings and the ratio are the token package's own gate. File-local.
import { PAIRINGS, contrastRatio } from '@ultima/tokens/gate';
import postcss, { CssSyntaxError } from 'postcss';
import ts from 'typescript';

import type { Diagnostic, Position } from '../diagnostic.ts';
import { APP_RULES, CHECK_SPEC } from '../rules.ts';
import type { Scope } from '../scope.ts';
import { parseSource, positionAt } from '../sources.ts';
import { type Evaluator, type Pieces, createEvaluator, styleXBindings, styleXCall, topLevelName, unwrap } from '../stylex.ts';
import { type Context, severityOf } from './context.ts';

type Mode = 'dark' | 'light';
const MODES: readonly Mode[] = ['dark', 'light'];

const PREFIX = '--ult-color-';
const SCHEME = /prefers-color-scheme\s*:\s*(dark|light)/;
const DATA_THEME = /\[data-theme\s*=\s*["']?(dark|light)["']?\s*\]/;
const VAR = /^var\(\s*(--[\w-]+)\s*(?:,[^]*)?\)$/;
/** The mode each of Ultima's own themes pins a scope to, by its exported name. */
const MODE_THEMES: Record<string, Mode> = { darkTheme: 'dark', lightTheme: 'light' };

/** Where an override is declared, which is where its findings point. */
type Site = { file: string; start: Position; end: Position; symbol?: string; target: string; selector?: string; expression: string };

/** One value an override can take: literal CSS text, or why it cannot be read. */
type Raw = { text: string } | { unresolved: string };

type Override = { token: string; values: Raw[]; site: Site };

/** One override scope: what it sets in each mode it applies to. A mode it does not apply to is absent. */
type ThemeScope = Partial<Record<Mode, Map<string, Override>>>;

type Resolved = { values: string[] } | { site: Site; reason: string };

export function checkThemes(context: Context): void {
  const { scope } = context;
  const enabled = new Set(scope.rules ?? []);
  const defaults = scope.colorDefaults;
  if (!defaults || !(enabled.has('ULT-APP-THEME-001') || enabled.has('ULT-APP-CONTRAST-001'))) return;
  for (const { path, kind } of scope.inventory) {
    const scopes = kind === 'app' ? createThemes(context, path) : kind === 'stylesheet' ? cssScopes(context, path) : [];
    for (const theme of scopes) judge(context, theme, defaults, enabled);
  }
}

// ---------------------------------------------------------------------------------------------
// Judging one scope
// ---------------------------------------------------------------------------------------------

function short(token: string): string {
  return token.startsWith(PREFIX) ? token.slice(PREFIX.length) : token;
}

function list(tokens: string[]): string {
  return tokens.length <= 1 ? tokens.join('') : `${tokens.slice(0, -1).join(', ')} and ${tokens[tokens.length - 1]}`;
}

function inModes(modes: Mode[]): string {
  return modes.length === MODES.length ? 'in both modes' : `in ${modes[0]} mode`;
}

function judge(context: Context, theme: ThemeScope, defaults: NonNullable<Scope['colorDefaults']>, enabled: Set<string>): void {
  // A role is a base color with interaction states: `<role>-hover` and `<role>-active` beside it.
  const bases = Object.keys(defaults.dark).filter((token) => `${token}-hover` in defaults.dark && `${token}-active` in defaults.dark);
  const missing = new Map<Site, { token: string; lacking: Set<string>; modes: Mode[] }>();
  const failing = new Map<Site, Map<Mode, string[]>>();
  const unresolved = new Map<Site, string>();

  for (const mode of MODES) {
    const overrides = theme[mode];
    if (!overrides || overrides.size === 0) continue;

    if (enabled.has('ULT-APP-THEME-001')) {
      for (const base of bases) {
        const override = overrides.get(base);
        const lacking = [`${base}-hover`, `${base}-active`].filter((token) => !overrides.has(token));
        if (!override || lacking.length === 0) continue;
        const entry = missing.get(override.site) ?? { token: base, lacking: new Set<string>(), modes: [] };
        for (const token of lacking) entry.lacking.add(token);
        entry.modes.push(mode);
        missing.set(override.site, entry);
      }
    }

    if (!enabled.has('ULT-APP-CONTRAST-001')) continue;
    const table = defaults[mode];
    const cache = new Map<string, Resolved>();
    const resolve = (token: string, trail: readonly string[] = []): Resolved => {
      const cached = cache.get(token);
      if (cached) return cached;
      const override = overrides.get(token);
      let result: Resolved;
      if (!override) {
        // Ultima's defaults are opaque hex for every gated token, which the CLI's tests hold.
        const color = parseColor(table[token] ?? '');
        result = { values: typeof color === 'string' ? [color] : [] };
      } else if (trail.includes(token)) {
        result = { site: override.site, reason: `${token} refers to itself through var()` };
      } else {
        const values: string[] = [];
        result = { values };
        for (const raw of override.values) {
          if ('unresolved' in raw) {
            result = { site: override.site, reason: raw.unresolved };
            break;
          }
          const text = raw.text.trim();
          const reference = VAR.exec(text)?.[1];
          if (reference !== undefined) {
            if (!reference.startsWith(PREFIX)) {
              result = { site: override.site, reason: `${text} reads ${reference}, which is not a semantic color token` };
              break;
            }
            const inner = resolve(reference, [...trail, token]);
            if ('reason' in inner) {
              result = inner;
              break;
            }
            values.push(...inner.values);
            continue;
          }
          const color = parseColor(text);
          if (typeof color !== 'string') {
            result = { site: override.site, reason: color.reason };
            break;
          }
          values.push(color);
        }
      }
      cache.set(token, result);
      return result;
    };

    for (const pairing of PAIRINGS) {
      const at = overrides.get(pairing.foreground) ?? overrides.get(pairing.background);
      if (!at) continue;
      const foreground = resolve(pairing.foreground);
      const background = resolve(pairing.background);
      const problem = 'reason' in foreground ? foreground : 'reason' in background ? background : undefined;
      if (problem) {
        unresolved.set(problem.site, problem.reason);
        continue;
      }
      if (!('values' in foreground) || !('values' in background)) continue;
      let worst = Number.POSITIVE_INFINITY;
      for (const ink of foreground.values) for (const ground of background.values) worst = Math.min(worst, contrastRatio(ink, ground));
      if (worst >= pairing.minimum) continue;
      const byMode = failing.get(at.site) ?? new Map<Mode, string[]>();
      byMode.set(mode, [...(byMode.get(mode) ?? []), `${short(pairing.foreground)} on ${short(pairing.background)} is ${worst.toFixed(2)}:1 against ${pairing.minimum}:1`]);
      failing.set(at.site, byMode);
    }
  }

  for (const [site, { token, lacking, modes }] of missing) {
    const tokens = [...lacking];
    report(context, site, 'ULT-APP-THEME-001', {
      message: `Overriding ${token} without ${list(tokens)} leaves ${tokens.length === 1 ? 'it' : 'them'} at Ultima's default ${inModes(modes)}, so the ${short(token)} states no longer step from its base color`,
      repair: `Set ${list(tokens)} in the same override, next to ${token}.`,
      link: APP_RULES['ULT-APP-THEME-001'].link,
    });
  }
  for (const [site, byMode] of failing) {
    const modes = [...byMode.keys()];
    const detail = [...byMode].map(([mode, pairs]) => `in ${mode} mode: ${pairs.join('; ')}`).join('; and ');
    report(context, site, 'ULT-APP-CONTRAST-001', {
      message: `${site.target}: ${site.expression} fails the contrast gate ${detail}`,
      repair:
        modes.length === MODES.length
          ? 'Choose a value that meets every listed pairing in both modes, or give each mode its own value: a prefers-color-scheme block, or a theme applied with lightTheme or darkTheme.'
          : `Choose a value that meets every listed pairing in ${modes[0]} mode, or bind the override to the mode it was designed for: a prefers-color-scheme block, or a theme applied with lightTheme or darkTheme.`,
      link: APP_RULES['ULT-APP-CONTRAST-001'].link,
    });
  }
  for (const [site, reason] of unresolved) {
    report(context, site, 'ULT-ANALYSIS-001', {
      message: `ULT-APP-CONTRAST-001 cannot measure ${site.target}: ${reason}`,
      repair: `Write ${site.target} as a literal hex or rgb() color, a var() of another ${PREFIX}* token, or a token read the checker follows.`,
      link: CHECK_SPEC,
    });
  }
}

function report(context: Context, site: Site, ruleId: string, { message, repair, link }: { message: string; repair: string; link: string }): void {
  const diagnostic: Diagnostic = {
    ruleId,
    severity: severityOf(ruleId),
    file: site.file,
    start: site.start,
    end: site.end,
    ...(site.symbol !== undefined && { symbol: site.symbol }),
    target: site.target,
    ...(site.selector !== undefined && { selector: site.selector }),
    expression: site.expression,
    message: `${message.charAt(0).toUpperCase()}${message.slice(1)}.`,
    repair,
    link,
  };
  context.diagnostics.push(diagnostic);
}

// ---------------------------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------------------------

const NAMED: Record<string, string> = { black: '#000000', white: '#ffffff' };

function hex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0');
}

/** An opaque color as `#rrggbb`, which the gate's ratio reads, or why it cannot be measured. */
export function parseColor(text: string): string | { reason: string } {
  const value = text.trim().toLowerCase();
  const translucent = { reason: `${text.trim()} is translucent, and its contrast depends on what is under it` };
  if (value in NAMED) return NAMED[value] as string;
  const digits = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(value)?.[1];
  if (digits !== undefined) {
    const full = digits.length <= 4 ? [...digits].map((digit) => digit + digit).join('') : digits;
    if (full.length === 8 && full.slice(6) !== 'ff') return translucent;
    return `#${full.slice(0, 6)}`;
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(value)?.[1];
  if (rgb !== undefined) {
    const parts = rgb.split(/\s*[,/]\s*|\s+/).filter((part) => part !== '');
    const number = (part: string, scale: number) => (part.endsWith('%') ? (Number(part.slice(0, -1)) / 100) * scale : Number(part));
    const channels = parts.slice(0, 3).map((part) => number(part, 255));
    const alpha = parts[3] === undefined ? 1 : number(parts[3], 1);
    if (parts.length >= 3 && parts.length <= 4 && [...channels, alpha].every(Number.isFinite)) {
      if (alpha < 1) return translucent;
      return `#${channels.map(hex).join('')}`;
    }
  }
  return { reason: `${text.trim()} is not a color the checker can measure` };
}

// ---------------------------------------------------------------------------------------------
// stylex.createTheme over the color group
// ---------------------------------------------------------------------------------------------

function createThemes(context: Context, path: string): ThemeScope[] {
  const { scope } = context;
  const parsed = context.source(path);
  const file = parsed?.segments[0]?.file;
  if (!parsed || !file) return [];
  const evaluator = createEvaluator(scope, path, file);
  if (evaluator.bindings.namespaces.size === 0 && ![...evaluator.bindings.calls.values()].includes('createTheme')) return [];

  const siteOf = (node: ts.Node, target: string, expression: ts.Node): Site => {
    const symbol = topLevelName(node);
    return {
      file: path,
      start: positionAt(parsed.text, node.getStart(file)),
      end: positionAt(parsed.text, node.getEnd()),
      ...(symbol !== undefined && { symbol }),
      target,
      expression: expression.getText(file).replace(/\s+/g, ' '),
    };
  };
  /** A table or member the checker cannot read leaves both rules incomplete there. */
  const unreadable = (node: ts.Node, reason: string) =>
    report(context, siteOf(node, 'stylex.createTheme', node), 'ULT-ANALYSIS-001', {
      message: `ULT-APP-THEME-001 and ULT-APP-CONTRAST-001 cannot read this override: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}`,
      repair: 'Write the createTheme table as an object literal, or a module-scope const of one, with literal keys.',
      link: CHECK_SPEC,
    });

  const themes: ThemeScope[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && styleXCall(node, evaluator.bindings) === 'createTheme') {
      const [group, table] = node.arguments;
      const ref = group ? evaluator.group(group) : undefined;
      if (ref?.group?.keys.some((key) => key.startsWith(PREFIX))) {
        const modes = appliedModes(file, evaluator, node);
        const object = table ? evaluator.object(table) : undefined;
        if (!object) unreadable(table ?? node, 'The createTheme table is not an object the checker can read');
        else {
          const theme: ThemeScope = {};
          for (const mode of modes) theme[mode] = new Map();
          for (const member of object.properties) {
            if (!ts.isPropertyAssignment(member)) {
              unreadable(member, 'A createTheme member that is not a plain property');
              continue;
            }
            const token = evaluator.key(member.name);
            if (token === undefined) {
              unreadable(member.name, 'A computed createTheme key the checker cannot resolve');
              continue;
            }
            if (!token.startsWith(PREFIX)) continue;
            const site = siteOf(member, token, member.initializer);
            for (const mode of modes) {
              const values = valuesIn(scope, evaluator, member.initializer, mode);
              if (values) theme[mode]?.set(token, { token, values, site });
            }
          }
          themes.push(theme);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return themes;
}

/**
 * The modes a theme applies in. Applied beside `lightTheme` or `darkTheme`, in a `stylex.props` or
 * `stylex.attrs` call or a `style` prop, it is bound to that mode; applied alone, never applied in
 * this file, or not held in a const, it applies in both.
 */
function appliedModes(file: ts.SourceFile, evaluator: Evaluator, call: ts.CallExpression): Mode[] {
  const holder = ts.isVariableDeclaration(call.parent) && ts.isIdentifier(call.parent.name) ? call.parent.name.text : undefined;
  if (holder === undefined) return [...MODES];
  const modeNames = new Map<string, Mode>();
  for (const statement of file.statements) {
    const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      const mode = MODE_THEMES[(element.propertyName ?? element.name).text];
      if (mode) modeNames.set(element.name.text, mode);
    }
  }
  const found = new Set<Mode>();
  let applied = false;
  const identifiers = (node: ts.Node, out: Set<string>): Set<string> => {
    if (ts.isIdentifier(node)) out.add(node.text);
    else if (!ts.isPropertyAccessExpression(node)) ts.forEachChild(node, (child) => void identifiers(child, out));
    else identifiers(node.expression, out);
    return out;
  };
  const application = (expressions: readonly ts.Node[]) => {
    const names = new Set<string>();
    for (const expression of expressions) identifiers(expression, names);
    if (!names.has(holder)) return;
    applied = true;
    const modes = [...names].flatMap((name) => (modeNames.has(name) ? [modeNames.get(name) as Mode] : []));
    for (const mode of modes.length > 0 ? modes : MODES) found.add(mode);
  };
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ['props', 'attrs'].includes(styleXCall(node, evaluator.bindings) ?? '')) application(node.arguments);
    if (ts.isJsxAttribute(node) && node.name.getText(file) === 'style' && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      application([node.initializer.expression]);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return applied ? MODES.filter((mode) => found.has(mode)) : [...MODES];
}

/**
 * What one createTheme value sets in a mode: a plain value everywhere, or a conditional object whose
 * `prefers-color-scheme` branch for the mode wins over `default` and the other conditions. Undefined
 * when the value sets nothing in that mode.
 */
function valuesIn(scope: Scope, evaluator: Evaluator, initializer: ts.Expression, mode: Mode): Raw[] | undefined {
  const conditional = ts.isObjectLiteralExpression(unwrap(initializer)) || ts.isIdentifier(unwrap(initializer)) ? evaluator.object(initializer) : undefined;
  if (!conditional) return raws(scope, evaluator, [initializer]);
  const branches: { scheme?: Mode; value: ts.Expression }[] = [];
  const problems: Raw[] = [];
  for (const member of conditional.properties) {
    const key = ts.isPropertyAssignment(member) ? evaluator.key(member.name) : undefined;
    if (!ts.isPropertyAssignment(member) || key === undefined) {
      problems.push({ unresolved: 'A condition in the value the checker cannot read' });
      continue;
    }
    const scheme = SCHEME.exec(key)?.[1] as Mode | undefined;
    branches.push({ ...(scheme !== undefined && { scheme }), value: member.initializer });
  }
  const own = branches.filter(({ scheme }) => scheme === mode);
  const picked = own.length > 0 ? own : branches.filter(({ scheme }) => scheme === undefined);
  if (picked.length === 0 && problems.length === 0) return undefined;
  return [...problems, ...raws(scope, evaluator, picked.map(({ value }) => value))];
}

function raws(scope: Scope, evaluator: Evaluator, expressions: ts.Expression[]): Raw[] {
  const out: Raw[] = [];
  for (const expression of expressions) {
    const before = evaluator.unresolved.length;
    const alternatives = evaluator.value(expression);
    const missed = evaluator.unresolved.splice(before);
    if (missed.length > 0) {
      out.push({ unresolved: (missed[0] as { reason: string }).reason });
      continue;
    }
    for (const alternative of alternatives) out.push(rawOf(scope, alternative));
  }
  return out;
}

/** One evaluated alternative as CSS text: a palette read becomes its value, a semantic color read a var(). */
function rawOf(scope: Scope, alternative: Pieces): Raw {
  let text = '';
  for (const piece of alternative) {
    if (piece.kind === 'text') text += piece.text;
    else if (piece.kind === 'token' && piece.palette) {
      const value = paletteValue(scope, piece.label);
      if (value === undefined) return { unresolved: `${piece.label} is a palette value the checker cannot find` };
      text += value;
    } else if (piece.kind === 'token') {
      const token = /\['(--[\w-]+)'\]$/.exec(piece.label)?.[1];
      if (!piece.known || token === undefined || !token.startsWith(PREFIX)) return { unresolved: `${piece.label} is not a semantic color token` };
      text += `var(${token})`;
    } else if (piece.kind === 'runtime') {
      return { unresolved: `${piece.label} is computed at run time or imported from a module the checker does not follow` };
    } else return { unresolved: 'The value is empty or not a color' };
  }
  return { text };
}

const palettes = new WeakMap<Scope, Map<string, Map<string, string>>>();

/** A palette constant's literal value, `mithril.dark1` or `mithril['dark1']`, read from the scope's token sources. */
function paletteValue(scope: Scope, label: string): string | undefined {
  let values = palettes.get(scope);
  if (!values) {
    values = new Map();
    palettes.set(scope, values);
    for (const path of scope.tokenSources) {
      const text = scope.files.read(path);
      const file = text === undefined ? undefined : parseSource(path, text).segments[0]?.file;
      if (!file) continue;
      const bindings = styleXBindings(file);
      for (const statement of file.statements) {
        if (!ts.isVariableStatement(statement)) continue;
        for (const declaration of statement.declarationList.declarations) {
          const init = declaration.initializer ? unwrap(declaration.initializer) : undefined;
          if (!init || !ts.isIdentifier(declaration.name) || !ts.isCallExpression(init) || styleXCall(init, bindings) !== 'defineConsts') continue;
          const table = init.arguments[0] ? unwrap(init.arguments[0]) : undefined;
          if (!table || !ts.isObjectLiteralExpression(table)) continue;
          const steps = new Map<string, string>();
          for (const member of table.properties) {
            if (ts.isPropertyAssignment(member) && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) && ts.isStringLiteralLike(member.initializer)) {
              steps.set(member.name.text, member.initializer.text);
            }
          }
          if (!values.has(declaration.name.text)) values.set(declaration.name.text, steps);
        }
      }
    }
  }
  const match = /^([\w$]+)(?:\.([\w$]+)|\['([^']+)'\])$/.exec(label);
  return match ? values.get(match[1] as string)?.get((match[2] ?? match[3]) as string) : undefined;
}

// ---------------------------------------------------------------------------------------------
// CSS rules declaring --ult-color-*
// ---------------------------------------------------------------------------------------------

/**
 * Override scopes in a stylesheet, one per selector and non-color-scheme condition. A declaration
 * under a `prefers-color-scheme` block or a `[data-theme]` selector is bound to that mode, and the
 * same selector's unbound declarations apply beneath it, as the cascade applies them.
 */
function cssScopes(context: Context, path: string): ThemeScope[] {
  const text = context.scope.files.read(path);
  if (text === undefined || !text.includes(PREFIX)) return [];
  let root: postcss.Root;
  try {
    root = postcss.parse(text, { from: undefined });
  } catch (error) {
    const at = error instanceof CssSyntaxError ? { line: error.line ?? 1, column: error.column ?? 1 } : { line: 1, column: 1 };
    report(context, { file: path, start: at, end: at, target: 'stylesheet', expression: '' }, 'ULT-ANALYSIS-001', {
      message: `The stylesheet does not parse${error instanceof CssSyntaxError ? `: ${error.reason}` : ''}, so its ${PREFIX}* overrides cannot be read`,
      repair: 'Fix the syntax error; a stylesheet that does not parse leaves its overrides unchecked.',
      link: CHECK_SPEC,
    });
    return [];
  }

  const groups = new Map<string, { unbound: Map<string, Override>; dark: Map<string, Override>; light: Map<string, Override> }>();
  root.walkDecls((declaration) => {
    const token = declaration.prop;
    if (!token.startsWith(PREFIX)) return;
    const selectors: string[] = [];
    const conditions: string[] = [];
    let mode: Mode | undefined;
    let media = false;
    for (let node: postcss.Node | undefined = declaration.parent as postcss.Node | undefined; node && node.type !== 'root'; node = node.parent as postcss.Node | undefined) {
      if (node.type === 'rule') selectors.unshift((node as postcss.Rule).selector);
      else if (node.type === 'atrule') {
        const { name, params } = node as postcss.AtRule;
        const scheme = name === 'media' ? SCHEME.exec(params)?.[1] : undefined;
        if (scheme) {
          mode = scheme as Mode;
          media = true;
        }
        else if (name !== 'layer') conditions.unshift(`@${name} ${params}`);
      }
    }
    const selector = selectors.join(' ');
    if (!mode) {
      const parts = selector.split(',').map((part) => DATA_THEME.exec(part)?.[1]);
      if (parts.length > 0 && parts.every((part) => part !== undefined && part === parts[0])) mode = parts[0] as Mode;
    }
    const key = [...conditions, selector].join(' ');
    const group = groups.get(key) ?? { unbound: new Map(), dark: new Map(), light: new Map() };
    groups.set(key, group);
    const { start, end } = declaration.source ?? {};
    const site: Site = {
      file: path,
      start: { line: start?.line ?? 1, column: start?.column ?? 1 },
      end: { line: end?.line ?? start?.line ?? 1, column: (end?.column ?? start?.column ?? 0) + 1 },
      target: token,
      selector: [...(media ? [`@media (prefers-color-scheme: ${mode})`] : []), ...conditions, selector].join(' '),
      expression: declaration.value,
    };
    (mode ? group[mode] : group.unbound).set(token, { token, values: [{ text: declaration.value }], site });
  });

  return [...groups.values()].map(({ unbound, dark, light }) => {
    const theme: ThemeScope = {};
    if (unbound.size > 0 || dark.size > 0) theme.dark = new Map([...unbound, ...dark]);
    if (unbound.size > 0 || light.size > 0) theme.light = new Map([...unbound, ...light]);
    return theme;
  });
}
