/**
 * `pnpm scaffold <kind> <id> --from <request.json> [--write]`, per Scaffolding in
 * docs/spec/agent-infrastructure.md.
 *
 * A dry run by default: it validates the request against the catalogue model with the planned files
 * laid over the checkout, and prints what it would create and regenerate. `--write` plans again,
 * creates each authored file exclusively, records a manifest under `.scaffold/`, and regenerates the
 * wiring through `generate`. There is no overwrite mode, and nothing is ever deleted.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { OptimizerPolicy } from './browser.ts';
import { KINDS, shapeProblems } from './descriptors.ts';
import { type Files, diskFiles } from './files.ts';
import { GenerationError, check, generate, recording } from './generate.ts';
import { type Diagnostic, loadCatalogue } from './model.ts';
import { optimizerPolicy } from './optimizer-policy.ts';
import { planOutputs } from './projections.ts';
import { headingAnchors } from './source.ts';

/** Every file the scaffold creates carries it until the author finishes the work; ULT-SOURCE-001 rejects it. */
export const INCOMPLETE_MARKER = '@ultima-scaffold-incomplete';

export const SCAFFOLD_KINDS = ['react', 'element', 'recipe', 'block'] as const;
export type ScaffoldKind = (typeof SCAFFOLD_KINDS)[number];

export const MANIFESTS = '.scaffold';
const LOCK = `${MANIFESTS}/lock`;

const PROOF_BAR = [
  'Every combination renders',
  'The name resolves',
  'The focus ring lands where the contract says',
  'The primitive is still wired',
  'Documented state drives its style',
  'Typecheck passes',
  'Behavior this component wires itself',
  'CSS the primitive reads',
] as const;

/** docs/spec/ultima.md#what-a-block-build-ticket-proves */
const BLOCK_PROOF = [
  'It renders',
  'Its structure resolves',
  'axe passes',
  'Behavior the block wires itself',
  'The recipes it follows still hold',
  'Typecheck passes',
] as const;

const AXES = ['variant', 'size', 'tone'] as const;
type Axis = (typeof AXES)[number];

type Primitive =
  | { kind: 'native'; element: string }
  | { kind: 'base-ui'; module: string; export: string }
  | { kind: 'zag'; module: string; element: string };

type Part = { name: string; styled: boolean; element?: string };

type ReactBrief = {
  primitive: Primitive;
  shape: 'plain' | 'compound';
  parts?: Part[];
  axes: Partial<Record<Axis, { values: string[]; default: string; part?: string }>>;
  proofBar: string[];
};

type ElementBrief = {
  enums: Record<string, string[]>;
  parity: { axes: Record<string, string[]>; parts: string[]; stateMap: Record<string, string> };
  proof: string[];
};

type RecipeBrief = { proof: string[] };

type BlockBrief = { proof: string[] };

export type Request = { descriptor: Record<string, unknown>; brief: Record<string, unknown> };

export type Plan = {
  kind: ScaffoldKind;
  id: string;
  /** Authored files to create, in creation order. */
  create: Map<string, string>;
  /** Generated projections whose bytes change. */
  regenerate: string[];
  /** Author edits the scaffold prints and never applies. */
  snippets: { path: string; text: string }[];
  remaining: string[];
  /** Generation waits for an author step, such as applying a recipe's page snippet. */
  generationWaits?: string;
};

export class ScaffoldError extends Error {
  readonly exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const CONSTANT = /^[A-Z][A-Z0-9_]*$/;
const TAG = /^[a-z][a-z0-9]*$/;
const VALUE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';
const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(isText);

const pascal = (id: string) => id.replace(/(^|-)([a-z0-9])/g, (_, _dash, letter: string) => letter.toUpperCase());
const camel = (id: string) => id.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
const partKey = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);

function unknownFields(value: Record<string, unknown>, allowed: string[], where: string): string[] {
  return Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .map((key) => `${where}.${key} is not a known field`);
}

/** A TypeScript single-quoted string literal. */
function quote(text: string): string {
  const body = JSON.stringify(text)
    .slice(1, -1)
    .replace(/\\(.)|'/g, (match, escaped: string | undefined) => (escaped === '"' ? '"' : match === "'" ? "\\'" : match));
  return `'${body}'`;
}

function literal(value: unknown, indent: string): string {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string')) return `[${value.map(quote).join(', ')}]`;
    const inner = `${indent}  `;
    return `[\n${value.map((item) => `${inner}${literal(item, inner)},`).join('\n')}\n${indent}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined);
  const key = (name: string) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : quote(name));
  if (indent !== '' && entries.every(([, item]) => typeof item !== 'object' || (Array.isArray(item) && item.every((i) => typeof i === 'string')))) {
    return entries.length === 0 ? '{}' : `{ ${entries.map(([name, item]) => `${key(name)}: ${literal(item, indent)}`).join(', ')} }`;
  }
  const inner = `${indent}  `;
  return `{\n${entries.map(([name, item]) => `${inner}${key(name)}: ${literal(item, inner)},`).join('\n')}\n${indent}}`;
}

const DESCRIPTOR_TYPES: Record<ScaffoldKind, string> = {
  react: 'ReactDescriptor',
  element: 'ElementDescriptor',
  recipe: 'RecipeDescriptor',
  block: 'BlockDescriptor',
};

const FIELD_ORDER: Record<ScaffoldKind, string[]> = {
  react: ['id', 'kind', 'title', 'description', 'docsDescription', 'contract', 'installDocs', 'primaryExport', 'release', 'order', 'group'],
  element: ['id', 'kind', 'title', 'description', 'contract', 'installDocs', 'reactItem', 'order', 'registryDependencies', 'tags', 'attributes', 'example'],
  recipe: ['id', 'kind', 'title', 'description', 'contract', 'page', 'section', 'release', 'demos'],
  block: ['id', 'kind', 'title', 'description', 'contract', 'installDocs', 'primaryExport', 'recipes'],
};

function descriptorText(kind: ScaffoldKind, descriptor: Record<string, unknown>): string {
  const ordered = Object.fromEntries(FIELD_ORDER[kind].filter((key) => key in descriptor).map((key) => [key, descriptor[key]]));
  const type = DESCRIPTOR_TYPES[kind];
  return `import type { ${type} } from '../schema.ts';\n\nexport default ${literal(ordered, '')} satisfies ${type};\n`;
}

// ---------------------------------------------------------------------------------------------------
// Request validation: every decision the templates need, or a named precondition.

function briefProblems(kind: ScaffoldKind, brief: Record<string, unknown>, descriptor: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (kind === 'react') {
    problems.push(...unknownFields(brief, ['primitive', 'shape', 'parts', 'axes', 'proofBar'], 'brief'));
    const primitive = brief.primitive;
    if (!isObject(primitive)) problems.push('brief.primitive is missing: name the settled primitive, { "kind": "native" | "base-ui" | "zag", ... }');
    else if (primitive.kind === 'native') {
      problems.push(...unknownFields(primitive, ['kind', 'element'], 'brief.primitive'));
      if (brief.shape === 'plain' && !(isText(primitive.element) && TAG.test(primitive.element))) {
        problems.push('brief.primitive.element is missing: a native plain component names its element, such as "div"');
      }
    } else if (primitive.kind === 'base-ui') {
      problems.push(...unknownFields(primitive, ['kind', 'module', 'export'], 'brief.primitive'));
      if (!(isText(primitive.module) && /^@base-ui\/react\/[a-z0-9-]+$/.test(primitive.module))) {
        problems.push('brief.primitive.module is not a Base UI entry point, "@base-ui/react/<name>"');
      }
      if (!(isText(primitive.export) && PASCAL.test(primitive.export))) problems.push('brief.primitive.export is missing: the Base UI export to compose');
    } else if (primitive.kind === 'zag') {
      problems.push(...unknownFields(primitive, ['kind', 'module', 'element'], 'brief.primitive'));
      if (!(isText(primitive.module) && /^@zag-js\/[a-z0-9-]+$/.test(primitive.module))) {
        problems.push('brief.primitive.module is not a Zag machine package, "@zag-js/<name>" (ADR 0002 bounds which components may use one)');
      }
      if (brief.shape === 'plain' && !(isText(primitive.element) && TAG.test(primitive.element))) {
        problems.push('brief.primitive.element is missing: the element a plain Zag component renders');
      }
    } else problems.push('brief.primitive.kind is not one of native, base-ui, zag');

    if (brief.shape !== 'plain' && brief.shape !== 'compound') problems.push('brief.shape is missing: "plain" or "compound"');
    const parts = brief.parts;
    if (brief.shape === 'plain' && parts !== undefined) problems.push('brief.parts is for a compound; a plain component is its one part');
    if (brief.shape === 'compound') {
      if (!Array.isArray(parts) || parts.length === 0) problems.push('brief.parts is missing: every part of the compound, in namespace order');
      else {
        const names = new Set<string>();
        parts.forEach((part, index) => {
          const where = `brief.parts[${index}]`;
          if (!isObject(part)) return problems.push(`${where} is not an object`);
          problems.push(...unknownFields(part, ['name', 'styled', 'element'], where));
          if (!(isText(part.name) && PASCAL.test(part.name))) problems.push(`${where}.name is not a PascalCase part name`);
          else if (names.has(part.name)) problems.push(`${where}.name "${part.name}" repeats`);
          else names.add(part.name);
          if (typeof part.styled !== 'boolean') problems.push(`${where}.styled is missing: whether the part paints (Styled parts)`);
          const native = isObject(primitive) && primitive.kind !== 'base-ui';
          if (native && !(isText(part.element) && TAG.test(part.element))) problems.push(`${where}.element is missing: the element this part renders`);
          if (!native && part.element !== undefined) problems.push(`${where}.element is for a native or Zag part; a Base UI part renders its own`);
        });
      }
    }

    const axes = brief.axes;
    if (!isObject(axes)) problems.push('brief.axes is missing: {} for none, or variant, size and tone with their values and default');
    else {
      for (const [axis, spec] of Object.entries(axes)) {
        const where = `brief.axes.${axis}`;
        if (!(AXES as readonly string[]).includes(axis)) {
          problems.push(`${where} is not an axis: a component has at most variant, size and tone`);
          continue;
        }
        if (!isObject(spec)) {
          problems.push(`${where} is not an object`);
          continue;
        }
        problems.push(...unknownFields(spec, ['values', 'default', 'part'], where));
        if (!isTextList(spec.values) || !spec.values.every((value) => VALUE.test(value))) problems.push(`${where}.values is not a list of lowercase values`);
        else if (new Set(spec.values).size !== spec.values.length) problems.push(`${where}.values repeats a value`);
        else if (!spec.values.includes(spec.default as string)) problems.push(`${where}.default is missing or not one of its values`);
        const partNames = Array.isArray(parts) ? parts.filter(isObject).map((part) => part.name) : [];
        if (brief.shape === 'compound' && !partNames.includes(spec.part)) problems.push(`${where}.part is missing: the compound part that takes the axis`);
        if (brief.shape === 'plain' && spec.part !== undefined) problems.push(`${where}.part is for a compound`);
      }
      if (brief.shape === 'compound' && axes.variant && axes.tone && (axes.variant as { part?: unknown }).part !== (axes.tone as { part?: unknown }).part) {
        problems.push('brief.axes: variant and tone merge into one lookup, so they sit on the same part');
      }
    }

    if (!Array.isArray(brief.proofBar) || brief.proofBar.length !== PROOF_BAR.length || !brief.proofBar.every(isText)) {
      problems.push(`brief.proofBar is missing: eight answers, one per proof-bar item (${PROOF_BAR.join('; ')}); "none, because …" is an answer`);
    }
  }

  if (kind === 'element') {
    problems.push(...unknownFields(brief, ['enums', 'parity', 'proof'], 'brief'));
    const enums = brief.enums;
    const symbols = Array.isArray(descriptor.attributes)
      ? descriptor.attributes.filter(isObject).flatMap((attribute) => (isText(attribute.symbol) ? [attribute.symbol] : []))
      : [];
    if (!isObject(enums)) problems.push('brief.enums is missing: the values of each attribute `symbol`, {} for none');
    else {
      for (const [symbol, values] of Object.entries(enums)) {
        if (!CONSTANT.test(symbol)) problems.push(`brief.enums.${symbol} is not a CONSTANT_CASE table name`);
        if (!isTextList(values) || !values.every((value) => VALUE.test(value))) problems.push(`brief.enums.${symbol} is not a list of lowercase values`);
        if (!symbols.includes(symbol)) problems.push(`brief.enums.${symbol} is not the symbol of any descriptor attribute`);
      }
      for (const symbol of symbols) {
        if (!(symbol in enums)) problems.push(`brief.enums.${symbol} is missing: descriptor attributes read it`);
      }
    }
    const parity = brief.parity;
    if (!isObject(parity)) {
      problems.push('brief.parity is missing: the parity mapping to the React item, { axes, parts, stateMap }; it is never guessed');
    } else {
      problems.push(...unknownFields(parity, ['axes', 'parts', 'stateMap'], 'brief.parity'));
      if (!isObject(parity.axes) || !Object.values(parity.axes).every(isTextList)) problems.push('brief.parity.axes is not an object of value lists');
      if (!isTextList(parity.parts)) problems.push('brief.parity.parts is not a list of part names');
      if (!isObject(parity.stateMap) || !Object.values(parity.stateMap).every(isText)) problems.push('brief.parity.stateMap is not an object of strings');
    }
    if (!isTextList(brief.proof)) problems.push('brief.proof is missing: the behavior and accessibility each element test must prove');
  }

  if (kind === 'recipe') {
    problems.push(...unknownFields(brief, ['proof'], 'brief'));
    if (!isTextList(brief.proof)) problems.push('brief.proof is missing: what the recipe’s tests must prove, per its checklist authority');
  }

  if (kind === 'block') {
    problems.push(...unknownFields(brief, ['proof'], 'brief'));
    if (!Array.isArray(brief.proof) || brief.proof.length !== BLOCK_PROOF.length || !brief.proof.every(isText)) {
      problems.push(`brief.proof is missing: six answers, one per proof item (${BLOCK_PROOF.join('; ')}); "none, because …" is an answer`);
    }
  }
  return problems;
}

/** The request's own problems, with `id` and `kind` taken from the command line. */
export function requestProblems(kind: ScaffoldKind, id: string, request: unknown, files: Files): string[] {
  if (!isObject(request)) return ['the request is not a JSON object'];
  const problems = unknownFields(request, ['descriptor', 'brief'], 'request');
  const descriptor = request.descriptor;
  const brief = request.brief;
  if (!isObject(descriptor)) problems.push('request.descriptor is missing');
  if (!isObject(brief)) problems.push('request.brief is missing: the settled authoring decisions');
  if (!isObject(descriptor) || !isObject(brief)) return problems;
  if (descriptor.id !== undefined && descriptor.id !== id) problems.push(`descriptor.id "${String(descriptor.id)}" contradicts the command's "${id}"`);
  if (descriptor.kind !== undefined && descriptor.kind !== kind) problems.push(`descriptor.kind "${String(descriptor.kind)}" contradicts the command's "${kind}"`);

  const shape = shapeProblems(kind, { ...descriptor, id, kind });
  const release = descriptor.release;
  const releases = releaseIds(files);
  if ((kind === 'react' || kind === 'recipe') && release === undefined) {
    problems.push(`descriptor.release is missing: one of ${releases.join(', ')}`);
  }
  if (kind === 'react' || kind === 'element') {
    if (descriptor.order === undefined) {
      const next = appendPosition(files, kind, typeof release === 'string' ? release : undefined);
      problems.push(
        next === undefined
          ? 'descriptor.order is missing: choose the release first'
          : `descriptor.order is missing: the next free position ${kind === 'react' ? `in ${String(release)}` : 'among elements'} is ${next}; accept it by adding "order": ${next}`,
      );
    }
  }
  if (kind === 'react') {
    const groups = groupIds(files);
    if (descriptor.group === undefined) problems.push(`descriptor.group is missing: one of ${groups.join(', ')}`);
    else if (!groups.includes(descriptor.group as string)) {
      problems.push(`descriptor.group ${JSON.stringify(descriptor.group)} is not one of ${groups.join(', ')}`);
    }
  }
  problems.push(
    ...shape.filter((problem) => !['descriptor.order is missing', 'descriptor.release is missing', 'descriptor.group is missing'].includes(problem)),
  );
  problems.push(...briefProblems(kind, brief, descriptor));

  if ((kind === 'react' || kind === 'block') && isText(descriptor.primaryExport) && !PASCAL.test(descriptor.primaryExport)) {
    problems.push(`descriptor.primaryExport "${descriptor.primaryExport}" is not a PascalCase root name`);
  }
  if (kind === 'element' && Array.isArray(descriptor.tags) && descriptor.tags.some((tag) => !(isText(tag) && /^ult-[a-z0-9-]+$/.test(tag)))) {
    problems.push('descriptor.tags holds a name that is not an ult-* custom element tag');
  }
  if (kind === 'recipe' && Array.isArray(descriptor.demos)) {
    for (const demo of descriptor.demos) {
      if (!(isText(demo) && /^apps\/docs\/src\/demos\/[a-z0-9-]+\/[a-z0-9-]+\.tsx$/.test(demo))) {
        problems.push(`descriptor.demos entry "${String(demo)}" is not apps/docs/src/demos/<page>/<name>.tsx`);
      }
    }
  }
  return problems;
}

function releaseIds(files: Files): string[] {
  return loadCatalogue(files).catalogue.releases.map((release) => release.id);
}

function groupIds(files: Files): string[] {
  return loadCatalogue(files).catalogue.groups.map((group) => group.id);
}

function appendPosition(files: Files, kind: 'react' | 'element', release: string | undefined): number | undefined {
  const { catalogue } = loadCatalogue(files);
  if (kind === 'element') return Math.max(0, ...catalogue.elements.map((entry) => entry.order)) + 1;
  if (release === undefined) return undefined;
  return Math.max(0, ...catalogue.react.filter((entry) => entry.release === release).map((entry) => entry.order)) + 1;
}

// ---------------------------------------------------------------------------------------------------
// Templates. Each file names what is still unwritten under the marker.

const marker = (what: string) => `// ${INCOMPLETE_MARKER}: ${what}`;

function reactSource(id: string, descriptor: Record<string, unknown>, brief: ReactBrief): { text: string; exports: string[] } {
  const name = descriptor.primaryExport as string;
  const { primitive, shape } = brief;
  const axes = AXES.filter((axis) => brief.axes[axis]);
  const base = primitive.kind === 'base-ui' ? `Base${primitive.export}` : undefined;
  const imports: string[] = [];
  if (primitive.kind === 'base-ui') imports.push(`import { ${primitive.export} as ${base} } from '${primitive.module}';`);
  if (primitive.kind === 'zag') {
    imports.push(`import * as ${camel(primitive.module.slice('@zag-js/'.length))} from '${primitive.module}';`);
    imports.push("import { normalizeProps, useMachine } from '@zag-js/react';");
  }
  imports.push("import * as stylex from '@stylexjs/stylex';");
  imports.push(`import type { ${primitive.kind === 'base-ui' ? 'PartProps' : 'PlainProps'} } from '@ultima/ui/lib/component';`);
  if (primitive.kind === 'base-ui') imports.push("import type { ComponentProps } from 'react';");

  const parts: Part[] =
    shape === 'plain'
      ? [{ name: 'Root', styled: true, ...(primitive.kind !== 'base-ui' && { element: primitive.element }) }]
      : (brief.parts as Part[]);
  const styled = parts.filter((part) => part.styled);
  const tables: string[] = [];
  tables.push(`const styles = stylex.create({\n${styled.map((part) => `  ${partKey(part.name)}: {},`).join('\n')}\n});`);
  const axisPart = (axis: Axis) => (shape === 'plain' ? 'Root' : (brief.axes[axis]?.part as string));
  const merged = brief.axes.variant && brief.axes.tone;
  for (const axis of axes) {
    const spec = brief.axes[axis] as { values: string[] };
    if (axis === 'tone' && merged) continue;
    if (axis === 'variant' && merged) {
      const tones = (brief.axes.tone as { values: string[] }).values;
      for (const variant of spec.values) {
        tables.push(`const ${camel(variant)} = stylex.create({\n${tones.map((tone) => `  ${quoteKey(tone)}: {},`).join('\n')}\n});`);
      }
      tables.push(`const variants = { ${spec.values.map((variant) => (camel(variant) === variant ? variant : `${quoteKey(variant)}: ${camel(variant)}`)).join(', ')} };`);
      continue;
    }
    tables.push(`const ${axis}s = stylex.create({\n${spec.values.map((value) => `  ${quoteKey(value)}: {},`).join('\n')}\n});`);
  }

  const types: string[] = [];
  const unions: string[] = [];
  const propsTypes: string[] = [];
  for (const axis of axes) {
    const union = `${name}${pascal(axis)}`;
    types.push(`type ${union} = keyof typeof ${axis}s;`);
    unions.push(union);
  }
  if (merged) types[axes.indexOf('tone')] = `type ${name}Tone = keyof typeof ${camel((brief.axes.variant as { values: string[] }).values[0] as string)};`;

  const functions: string[] = [];
  const members: string[] = [];
  for (const part of parts) {
    const propsName = shape === 'plain' ? `${name}Props` : `${name}${part.name}Props`;
    propsTypes.push(propsName);
    const partAxes = axes.filter((axis) => axisPart(axis) === part.name);
    const axisFields = partAxes.map((axis) => `  ${axis}?: ${name}${pascal(axis)};`);
    const element = base ? (shape === 'plain' ? base : `${base}.${part.name}`) : (part.element as string);
    const own = base ? `PartProps<ComponentProps<typeof ${element}>>` : `PlainProps<'${element}'>`;
    const passThrough = base && !part.styled && partAxes.length === 0;
    if (passThrough) {
      types.push(`type ${propsName} = ComponentProps<typeof ${element}>;`);
      members.push(`${part.name}: ${element}`);
      continue;
    }
    types.push(axisFields.length > 0 ? `type ${propsName} = ${own} & {\n${axisFields.join('\n')}\n};` : `type ${propsName} = ${own};`);
    const defaults = partAxes.map((axis) => `${axis} = ${quote((brief.axes[axis] as { default: string }).default)}`);
    const lookups = [
      ...(part.styled ? [`styles.${partKey(part.name)}`] : []),
      ...partAxes.flatMap((axis) => (axis === 'tone' && merged ? [] : axis === 'variant' && merged ? ['variants[variant][tone]'] : [`${axis}s[${axis}]`])),
      'style',
    ];
    const fn = shape === 'plain' ? name : part.name;
    functions.push(
      [
        `function ${fn}({ ${[...defaults, 'style', '...props'].join(', ')} }: ${propsName}) {`,
        `  return <${element} {...props} {...stylex.props(${lookups.join(', ')})} />;`,
        '}',
      ].join('\n'),
    );
    members.push(part.name);
  }
  if (shape === 'compound') functions.push(`const ${name} = {\n${members.map((member) => `  ${member},`).join('\n')}\n};`);

  const exported = [name, ...propsTypes, ...unions];
  const text = [
    "'use client';",
    '',
    marker(`${name} is a skeleton. Write its styles from tokens, wire ${primitive.kind === 'zag' ? 'the machine and ' : ''}the contract at ${descriptor.contract as string}, then remove this line.`),
    ...imports,
    '',
    tables.join('\n\n'),
    '',
    types.join('\n'),
    '',
    functions.join('\n\n'),
    '',
    `export { ${[name, ...exported.slice(1).map((type) => `type ${type}`)].join(', ')} };`,
    '',
  ].join('\n');
  return { text, exports: exported };
}

function quoteKey(value: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : quote(value);
}

function reactTest(id: string, name: string, brief: ReactBrief): string {
  const answers = brief.proofBar;
  return [
    marker(`every proof-bar item below is a todo, not coverage. Write the tests and delete the todos.`),
    "import { test } from 'vitest';",
    '',
    '/**',
    ' * Proof bar (docs/spec/ultima.md#what-a-build-ticket-proves)',
    ...PROOF_BAR.map((item, index) => ` * ${index + 1}. ${item}: ${answers[index] as string}`),
    ' */',
    '',
    ...PROOF_BAR.map((item, index) => `test.todo(${quote(`${name}: ${item}`)});`),
    '',
  ].join('\n');
}

function reactPage(id: string, descriptor: Record<string, unknown>, brief: ReactBrief, demo: { name: string; component: string; source: string }): string {
  const title = descriptor.title as string;
  const summary = (descriptor.docsDescription ?? descriptor.description) as string;
  const rows = AXES.filter((axis) => brief.axes[axis]).map((axis) => {
    const spec = brief.axes[axis] as { values: string[]; default: string; part?: string };
    const where = spec.part && brief.shape === 'compound' ? ` On \`${spec.part}\`.` : '';
    return `| \`${axis}\` | ${spec.values.map((value) => `\`'${value}'\``).join(' \\| ')} | \`'${spec.default}'\` |${where} |`;
  });
  return [
    "import { Demo } from '../../demo';",
    `import ${demo.component} from '../../demos/${id}/${demo.name}';`,
    `import ${demo.source} from '../../demos/${id}/${demo.name}?raw';`,
    '',
    `{/* ${INCOMPLETE_MARKER}: write a section per behavior, the Props notes and the Accessibility row from ${descriptor.contract as string}, then remove this comment. */}`,
    '',
    `# ${title}`,
    '',
    summary,
    '',
    '## Install',
    '',
    '```bash',
    `npx shadcn add @ultima/${id}`,
    '```',
    '',
    '## Usage',
    '',
    `<Demo component={${demo.component}} source={${demo.source}} />`,
    '',
    '## Props',
    '',
    '| Prop | Type | Default | Notes |',
    '| --- | --- | --- | --- |',
    ...rows,
    '| `style` | `StyleXStyles` | — | The style slot, merged last. There is no `className`. |',
    '',
    '## Accessibility',
    '',
  ].join('\n');
}

function reactDemo(descriptor: Record<string, unknown>, brief: ReactBrief, component: string): string {
  const name = descriptor.primaryExport as string;
  const root = brief.shape === 'compound' ? `${name}.${(brief.parts as Part[])[0]?.name as string}` : name;
  return [
    marker('show the component doing one thing its contract names, then remove this line.'),
    `import { ${name} } from '@ultima/ui';`,
    '',
    `export default function ${component}() {`,
    `  return <${root} />;`,
    '}',
    '',
  ].join('\n');
}

function elementSource(id: string, descriptor: Record<string, unknown>, brief: ElementBrief): string {
  const tags = descriptor.tags as string[];
  const enums = Object.entries(brief.enums).map(([symbol, values]) => `const ${symbol} = [${values.map(quote).join(', ')}] as const;`);
  const classes = tags.map((tag) => `class ${pascal(tag)} extends HTMLElement {}`);
  const defines = [...tags].reverse().map((tag) => `if (!customElements.get('${tag}')) customElements.define('${tag}', ${pascal(tag)});`);
  return [
    marker(`${id} registers its tags and nothing else. Write its styles and behavior to ${descriptor.contract as string}, then remove this line.`),
    "import * as stylex from '@stylexjs/stylex';",
    '',
    ...(enums.length > 0 ? [...enums, ''] : []),
    'const styles = stylex.create({\n  root: {},\n});',
    '',
    ...classes,
    '',
    ...defines,
    '',
  ].join('\n');
}

function todoTests(what: string, proof: string[]): string {
  return [
    marker(`every item below is a todo, not coverage. Write the tests and delete the todos.`),
    "import { test } from 'vitest';",
    '',
    ...proof.map((item) => `test.todo(${quote(`${what}: ${item}`)});`),
    '',
  ].join('\n');
}

function blockEntry(descriptor: Record<string, unknown>): string {
  const name = descriptor.primaryExport as string;
  return [
    "'use client';",
    '',
    marker(`${name} is a skeleton. Write the screen to ${descriptor.contract as string}, one file per region in this folder, then remove this line.`),
    "import * as stylex from '@stylexjs/stylex';",
    '',
    'const styles = stylex.create({\n  root: {},\n});',
    '',
    `export function ${name}() {`,
    '  return <div {...stylex.props(styles.root)} />;',
    '}',
    '',
  ].join('\n');
}

function blockTest(name: string, brief: BlockBrief): string {
  return [
    marker('every proof item below is a todo, not coverage. Write the tests and delete the todos.'),
    "import { test } from 'vitest';",
    '',
    '/**',
    ' * What a block build ticket proves (docs/spec/ultima.md#what-a-block-build-ticket-proves)',
    ...BLOCK_PROOF.map((item, index) => ` * ${index + 1}. ${item}: ${brief.proof[index] as string}`),
    ' */',
    '',
    ...BLOCK_PROOF.map((item) => `test.todo(${quote(`${name}: ${item}`)});`),
    '',
  ].join('\n');
}

function recipeDemo(component: string): string {
  return [
    marker('write the recipe’s composition, then remove this line.'),
    `export default function ${component}() {`,
    '  return null;',
    '}',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------------------------------
// Planning.

function overlay(base: Files, added: Map<string, string>): Files {
  return {
    read: (path) => added.get(path) ?? base.read(path),
    list(path) {
      const entries = new Map((base.list(path) ?? []).map((entry) => [entry.name, entry.directory]));
      const prefix = `${path}/`;
      for (const file of added.keys()) {
        if (!file.startsWith(prefix)) continue;
        const [name, ...rest] = file.slice(prefix.length).split('/');
        entries.set(name as string, rest.length > 0 || entries.get(name as string) === true);
      }
      if (entries.size === 0) return base.list(path);
      return [...entries].map(([name, directory]) => ({ name, directory })).sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}

function authoredFiles(kind: ScaffoldKind, id: string, request: Request, files: Files) {
  const descriptor = { id, kind, ...request.descriptor } as Record<string, unknown>;
  const create = new Map<string, string>();
  const snippets: Plan['snippets'] = [];
  const remaining: string[] = [];
  let exports: string[] = [];
  create.set(`registry/metadata/${kind}/${id}.ts`, descriptorText(kind, descriptor));

  if (kind === 'react') {
    const brief = request.brief as unknown as ReactBrief;
    const name = descriptor.primaryExport as string;
    const demo = { name: 'basic', component: 'Basic', source: 'basicSource' };
    const source = reactSource(id, descriptor, brief);
    exports = source.exports;
    create.set(`packages/ui/src/${id}.tsx`, source.text);
    create.set(`packages/ui/src/__tests__/${id}.test.tsx`, reactTest(id, name, brief));
    create.set(`apps/docs/src/demos/${id}/${demo.name}.tsx`, reactDemo(descriptor, brief, demo.component));
    create.set(`apps/docs/src/content/components/${id}.mdx`, reactPage(id, descriptor, brief, demo));
    remaining.push(
      `Style every part from tokens and wire the contract at ${descriptor.contract as string} in packages/ui/src/${id}.tsx.`,
      ...PROOF_BAR.map((item, index) => `Proof bar ${index + 1}, ${item}: ${brief.proofBar[index] as string}`),
      `Write the page: a section per behavior, the Props notes, and the Accessibility row restated from the contract.`,
      'Replace the demo with one the contract names; axe covers every demo the page renders.',
    );
  }

  if (kind === 'element') {
    const brief = request.brief as unknown as ElementBrief;
    const reactItem = descriptor.reactItem as string;
    const alias = camel(id.replace(/^ult-/, ''));
    create.set(`packages/elements/src/${id}.element.ts`, elementSource(id, descriptor, brief));
    create.set(`packages/elements/src/__tests__/${id}.test.ts`, todoTests(id, brief.proof));
    snippets.push({
      path: 'packages/elements/src/__tests__/parity.test.ts',
      text: [
        '// With the other imports:',
        `import element${pascal(alias)} from '../${id}.element.ts?raw';`,
        `import react${pascal(alias)} from '../../../ui/src/${reactItem}.tsx?raw';`,
        '',
        '// In ELEMENTS, by tag:',
        literal(
          { tag: id, element: `@@element${pascal(alias)}`, react: `@@react${pascal(alias)}`, ...brief.parity },
          '',
        ).replace(/'@@(\w+)'/g, '$1'),
      ].join('\n'),
    });
    remaining.push(
      `Write the element's styles and behavior in packages/elements/src/${id}.element.ts; it registers ${(descriptor.tags as string[]).join(', ')} and nothing more.`,
      ...brief.proof.map((item) => `Element test: ${item}`),
      'Apply the parity entry below by hand; the parity mapping is authored, never generated.',
      'Add the family to the docs element fixture if its specimens are not already there, and prove the served, staged and embedded bundles agree.',
    );
  }

  if (kind === 'recipe') {
    const brief = request.brief as unknown as RecipeBrief;
    const page = descriptor.page as string;
    const pagePath = `apps/docs/src/content/components/${page}.mdx`;
    const pageText = files.read(pagePath);
    const demos = (descriptor.demos as string[]).map((path) => {
      const base = path.slice(path.lastIndexOf('/') + 1, -'.tsx'.length);
      return { path, base, component: pascal(base), source: `${camel(base)}Source` };
    });
    for (const demo of demos) create.set(demo.path, recipeDemo(demo.component));
    create.set(`apps/docs/src/__tests__/${id}.test.tsx`, todoTests(id, brief.proof));
    const section = descriptor.section as string;
    const hasSection = pageText !== undefined && headingAnchors(pageText).has(section);
    const title = descriptor.title as string;
    const heading = headingAnchors(`## ${title}`).has(section) ? `## ${title}` : `## <a heading whose anchor is #${section}>`;
    const imports = demos.flatMap((demo) => [
      `import ${demo.component} from '../../demos/${page}/${demo.base}';`,
      `import ${demo.source} from '../../demos/${page}/${demo.base}?raw';`,
    ]);
    snippets.push({
      path: pagePath,
      text: [
        '{/* With the imports: */}',
        ...(pageText?.includes("from '../../demo'") ? [] : ["import { Demo } from '../../demo';"]),
        ...imports,
        '',
        hasSection ? `{/* In the existing #${section} section: */}` : '{/* A new section, where the page’s order calls for it: */}',
        ...(hasSection ? [] : [heading, '']),
        ...demos.map((demo) => `<Demo component={${demo.component}} source={${demo.source}} />`),
      ].join('\n'),
    });
    remaining.push(
      `Write each demo's composition: ${demos.map((demo) => demo.path).join(', ')}.`,
      ...brief.proof.map((item) => `Recipe test: ${item}`),
      `Apply the page snippet below to ${pagePath} by hand; the scaffold never rewrites a page.`,
    );
  }
  if (kind === 'block') {
    const brief = request.brief as unknown as BlockBrief;
    const name = descriptor.primaryExport as string;
    create.set(`packages/blocks/src/${id}/${id}.tsx`, blockEntry(descriptor));
    create.set(`packages/blocks/src/__tests__/${id}.test.tsx`, blockTest(name, brief));
    remaining.push(
      `Write ${name}'s regions to ${descriptor.contract as string}: the entry lays them out, and each region is its own file in packages/blocks/src/${id}/, glyphs in a private icons.tsx.`,
      ...BLOCK_PROOF.map((item, index) => `Proof item ${index + 1}, ${item}: ${brief.proof[index] as string}`),
      `Install it alone into fresh Vite and Next.js apps through scripts/smoke-install.sh.`,
    );
  }
  remaining.push(`Remove every ${INCOMPLETE_MARKER} marker. ULT-SOURCE-001 rejects them once \`pnpm check:architecture\` lands (#453).`);
  return { descriptor, create, snippets, remaining, exports };
}

/** Diagnostics a recipe carries until the author applies its page snippet. */
function awaitsSnippet(kind: ScaffoldKind, descriptorPath: string, diagnostic: Diagnostic): boolean {
  return (
    kind === 'recipe' &&
    diagnostic.path === descriptorPath &&
    (diagnostic.code === 'demo-not-on-page' || (diagnostic.code === 'broken-anchor' && / has no heading #/.test(diagnostic.message)))
  );
}

export function planScaffold(files: Files, kind: ScaffoldKind, id: string, request: unknown, policy: OptimizerPolicy): Plan {
  if (!KEBAB.test(id)) throw new ScaffoldError(`"${id}" is not a kebab-case id`, 2);
  if (kind === 'element' && !id.startsWith('ult-')) throw new ScaffoldError(`an element family is named ult-<react item>, not "${id}"`, 2);

  const problems = requestProblems(kind, id, request, files);
  if (problems.length > 0) throw new ScaffoldError(`the request is missing decisions or contradicts itself; nothing was written\n${problems.map((p) => `  ${p}`).join('\n')}`);
  const { descriptor, create, snippets, remaining, exports } = authoredFiles(kind, id, request as Request, files);

  const before = loadCatalogue(files).catalogue;
  const collisions: string[] = [];
  for (const other of KINDS) {
    if (files.read(`registry/metadata/${other}/${id}.ts`) !== undefined) collisions.push(`id "${id}" is already registry/metadata/${other}/${id}.ts`);
  }
  for (const path of create.keys()) {
    if (files.read(path) !== undefined) collisions.push(`${path} already exists`);
  }
  if (kind === 'react' && files.list(`apps/docs/src/demos/${id}`) !== undefined) collisions.push(`apps/docs/src/demos/${id}/ already exists`);
  if (kind === 'block' && files.list(`packages/blocks/src/${id}`) !== undefined) collisions.push(`packages/blocks/src/${id}/ already exists`);
  for (const name of exports) {
    const holder = before.exports.get(name);
    if (holder) collisions.push(`public export "${name}" is already exported by ${holder.item}`);
  }
  if (kind === 'react') {
    const holder = before.react.find((entry) => entry.release === descriptor.release && entry.order === descriptor.order);
    if (holder) collisions.push(`order ${String(descriptor.order)} in release ${String(descriptor.release)} is already "${holder.id}"`);
  }
  if (kind === 'element') {
    const holder = before.elements.find((entry) => entry.order === descriptor.order);
    if (holder) collisions.push(`element order ${String(descriptor.order)} is already "${holder.id}"`);
  }
  if (collisions.length > 0) {
    throw new ScaffoldError(`the request collides with existing work, which the scaffold never changes; nothing was written\n${collisions.map((c) => `  ${c}`).join('\n')}`);
  }

  const descriptorPath = `registry/metadata/${kind}/${id}.ts`;
  const planned = overlay(files, create);
  const { outputs, diagnostics } = planOutputs(planned, policy);
  const waiting = diagnostics.filter((d) => awaitsSnippet(kind, descriptorPath, d));
  const blocking = diagnostics.filter((d) => !awaitsSnippet(kind, descriptorPath, d));
  if (blocking.length > 0) {
    throw new ScaffoldError(
      `the catalogue model rejects the planned item; nothing was written\n${blocking.map((d) => `  ${d.code} ${d.path}: ${d.message}`).join('\n')}`,
    );
  }
  const regenerate = waiting.length > 0 ? [] : [...outputs].filter(([path, text]) => files.read(path) !== text).map(([path]) => path);
  return {
    kind,
    id,
    create,
    regenerate,
    snippets,
    remaining,
    ...(waiting.length > 0 && { generationWaits: 'the page snippet is applied; then run `pnpm catalogue:generate`' }),
  };
}

// ---------------------------------------------------------------------------------------------------
// Writing.

export type Manifest = {
  kind: ScaffoldKind;
  id: string;
  status: 'writing' | 'generating' | 'complete' | 'failed';
  planned: string[];
  created: string[];
  regenerated: string[];
  error?: string;
};

const manifestPath = (id: string) => `${MANIFESTS}/${id}.json`;

function readManifest(root: string, id: string): Manifest | undefined {
  try {
    return JSON.parse(readFileSync(join(root, manifestPath(id)), 'utf8')) as Manifest;
  } catch {
    return undefined;
  }
}

/** A partial scaffold from an earlier run stops this one, naming the files and the way out. */
function refuseAfterPartial(root: string, id: string): void {
  const manifest = readManifest(root, id);
  if (!manifest || manifest.status === 'complete') return;
  const present = [...new Set([...manifest.created, ...manifest.planned])].filter((path) => existsSync(join(root, path)));
  throw new ScaffoldError(
    [
      `an earlier scaffold of "${id}" stopped while ${manifest.status}${manifest.error ? `: ${manifest.error.split('\n')[0]}` : ''}.`,
      present.length > 0 ? `These files from it exist:\n${present.map((p) => `  ${p}`).join('\n')}` : 'None of its files exist.',
      manifest.status === 'generating' || (manifest.status === 'failed' && manifest.created.length === manifest.planned.length)
        ? `Every authored file was created. Fix the error, then run \`pnpm catalogue:generate\`, and delete ${manifestPath(id)}.`
        : `Inspect them: finish them by hand and run \`pnpm catalogue:generate\`, or delete them yourself. Then delete ${manifestPath(id)} to scaffold again.`,
      'The scaffold does not delete or overwrite them.',
    ].join('\n'),
  );
}

export type WriteOptions = {
  policy?: OptimizerPolicy;
  /** Runs after the plan and before the recheck; tests edit inputs here. */
  beforeWrite?: () => void;
  /** Runs before each authored file is created; tests interrupt the write here. */
  beforeCreate?: (path: string) => void;
};

export function writeScaffold(root: string, kind: ScaffoldKind, id: string, request: unknown, options: WriteOptions = {}): Plan & { manifest: Manifest } {
  const policy = options.policy ?? optimizerPolicy;
  mkdirSync(join(root, MANIFESTS), { recursive: true });
  try {
    writeFileSync(join(root, LOCK), `${process.pid}\n`, { flag: 'wx' });
  } catch {
    throw new ScaffoldError(`${LOCK} exists: another scaffold is running here, or one was killed. Remove it once none is.`);
  }
  try {
    refuseAfterPartial(root, id);
    const stale = check(root, policy);
    if (stale.diagnostics.length > 0 || Object.values(stale.freshness).some((paths) => paths.length > 0)) {
      throw new ScaffoldError('the generated wiring is invalid or stale before scaffolding; run `pnpm catalogue:check` and repair it first. Nothing was written.');
    }
    const { files, changed } = recording(diskFiles(root));
    const plan = planScaffold(files, kind, id, request, policy);
    options.beforeWrite?.();
    const moved = changed();
    if (moved.length > 0) {
      throw new ScaffoldError(`changed while planning, so nothing was written; rerun once edits settle:\n${moved.map((p) => `  ${p}`).join('\n')}`);
    }

    const manifest: Manifest = { kind, id, status: 'writing', planned: [...plan.create.keys()], created: [], regenerated: [] };
    const record = () => writeFileSync(join(root, manifestPath(id)), `${JSON.stringify(manifest, null, 2)}\n`);
    record();
    try {
      for (const [path, text] of plan.create) {
        options.beforeCreate?.(path);
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), text, { flag: 'wx' });
        manifest.created.push(path);
        record();
      }
      if (!plan.generationWaits) {
        manifest.status = 'generating';
        record();
        manifest.regenerated = generate(root, { policy }).written;
      }
      manifest.status = 'complete';
      record();
    } catch (error) {
      manifest.status = 'failed';
      manifest.error = (error as Error).message;
      if (error instanceof GenerationError) manifest.regenerated = error.written;
      record();
      const unwritten = manifest.planned.filter((path) => !manifest.created.includes(path));
      throw new ScaffoldError(
        [
          `the scaffold stopped: ${(error as Error).message}`,
          `created: ${manifest.created.length > 0 ? manifest.created.join(', ') : 'none'}`,
          ...(unwritten.length > 0 ? [`not created: ${unwritten.join(', ')}`] : []),
          ...(manifest.regenerated.length > 0 ? [`regenerated: ${manifest.regenerated.join(', ')}`] : []),
          `The manifest is ${manifestPath(id)}. Nothing was deleted; a rerun stops until you resolve these files.`,
        ].join('\n'),
      );
    }
    return { ...plan, manifest };
  } finally {
    rmSync(join(root, LOCK), { force: true });
  }
}

// ---------------------------------------------------------------------------------------------------
// The command.

const USAGE = 'usage: pnpm scaffold <react | element | recipe | block> <id> --from <request.json> [--write]';

export function formatPlan(plan: Plan, written: boolean): string {
  const lines = [
    written ? `scaffold: wrote ${plan.kind} ${plan.id}` : `scaffold: ${plan.kind} ${plan.id}, dry run; pass --write to apply`,
    written ? 'created:' : 'would create:',
    ...[...plan.create.keys()].map((path) => `  ${path}`),
  ];
  if (plan.generationWaits) lines.push(`generated wiring: waits until ${plan.generationWaits}`);
  else lines.push(written ? 'regenerated:' : 'would regenerate:', ...(plan.regenerate.length > 0 ? plan.regenerate : ['nothing']).map((path) => `  ${path}`));
  lines.push(`every created file carries ${INCOMPLETE_MARKER}. Remaining work, which the scaffold does not stand in for:`);
  lines.push(...plan.remaining.map((item) => `  - ${item}`));
  for (const snippet of plan.snippets) lines.push(`unapplied snippet for ${snippet.path}:`, ...snippet.text.split('\n').map((line) => `    ${line}`));
  return lines.join('\n');
}

export function main(argv: string[], root: string, cwd = process.cwd()): number {
  const [kind, id, ...rest] = argv;
  const from = rest.flatMap((arg, index) => (rest[index - 1] === '--from' ? [arg] : []))[0];
  const write = rest.includes('--write');
  const extra = rest.filter((arg, index) => arg !== '--from' && arg !== '--write' && rest[index - 1] !== '--from');
  if (kind === 'setup' || kind === 'artifact' || kind === 'source-bundle') {
    throw new ScaffoldError(
      `${kind} records are not scaffolded: their install destinations and files are packaging decisions, authored against registry/metadata/schema.ts by hand.`,
      2,
    );
  }
  if (!(SCAFFOLD_KINDS as readonly string[]).includes(kind ?? '') || !id || !from || extra.length > 0) throw new ScaffoldError(USAGE, 2);
  let request: unknown;
  try {
    request = JSON.parse(readFileSync(resolve(cwd, from), 'utf8'));
  } catch (error) {
    throw new ScaffoldError(`cannot read the request ${from}: ${(error as Error).message}`, 2);
  }
  if (write) {
    console.log(formatPlan(writeScaffold(root, kind as ScaffoldKind, id, request), true));
    return 0;
  }
  const stale = check(root);
  if (stale.diagnostics.length > 0 || Object.values(stale.freshness).some((paths) => paths.length > 0)) {
    console.error('scaffold: the generated wiring is invalid or stale; --write refuses until `pnpm catalogue:check` passes');
  }
  console.log(formatPlan(planScaffold(diskFiles(root), kind as ScaffoldKind, id, request, optimizerPolicy), false));
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
  try {
    process.exitCode = main(process.argv.slice(2), root, process.env.INIT_CWD ?? process.cwd());
  } catch (error) {
    if (!(error instanceof ScaffoldError)) throw error;
    console.error(`scaffold: ${error.message}`);
    process.exitCode = error.exitCode;
  }
}
