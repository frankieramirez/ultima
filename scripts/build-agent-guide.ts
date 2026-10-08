/**
 * Writes the agent guide, `apps/docs/public/llms.txt`, from `docs/spec/ultima.md`,
 * the registry manifest, and the tokens JSON export. Per the Agent surface section
 * of the specification and ADR 0005, guidance is hosted and generated: this file is
 * the only thing an agent in a consumer's repository reads, and Ultima installs no
 * documentation, so nothing here may be a second copy of a convention.
 */
import { readFileSync } from 'node:fs';
import type { RecipeProjection } from './catalogue/compositions.ts';

const MAX_BYTES = 64 * 1024;

const CONVENTIONS = [
  'Props every component accepts',
  'Compound components',
  'Variants, sizes, and tones',
  'State styling',
  'Tokens in component code',
  "What a component may assume about the consumer's CSS",
  'Focus ring',
];

const UI_ALIAS = '@/components/ui';

const AXES = [
  { suffix: 'Variant', prop: 'variant' },
  { suffix: 'Size', prop: 'size' },
  { suffix: 'Tone', prop: 'tone' },
];

export type GuideComponent = { name: string; title: string; description: string; source: string };

/** One catalogue group's components, alphabetical; groups come in display order. */
export type GuideGroup = { label: string; components: GuideComponent[] };

export type GuideBlock = { name: string; title: string; description: string; primaryExport: string; builtFrom: string[] };

type TokensJson = { tokens: Record<string, { group: string }> };

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DETAILS_APPENDIX = /^<details>[\s\S]*?^<\/details>[^\n]*\n?/gm;

function section(spec: string, heading: string): string {
  const found = new RegExp(`^(#{2,4}) ${escapeForRegExp(heading)}\\s*$`, 'm').exec(spec);
  if (!found) throw new Error(`docs/spec/ultima.md has no heading "${heading}"`);
  const level = (found[1] as string).length;
  const body = spec.slice(found.index + found[0].length);
  const sameOrHigher = new RegExp(`^#{1,${level}} `, 'm').exec(body);
  return body
    .slice(0, sameOrHigher ? sameOrHigher.index : undefined)
    .replace(DETAILS_APPENDIX, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const KEY = /^(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*(?=[:,}])/;

function objectKeys(source: string, openBrace: number): string[] {
  const keys: string[] = [];
  let depth = 0;
  let expectKey = false;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index] as string;
    if (char === '{' || char === '[' || char === '(') {
      depth += 1;
      expectKey = depth === 1;
    } else if (char === '}' || char === ']' || char === ')') {
      depth -= 1;
      if (depth === 0) return keys;
      expectKey = depth === 1;
    } else if (char === ',' && depth === 1) {
      expectKey = true;
    } else if (expectKey && depth === 1 && !/\s/.test(char)) {
      const key = KEY.exec(source.slice(index));
      if (key) {
        keys.push((key[1] ?? key[2] ?? key[3]) as string);
        index += key[0].length - 1;
      }
      expectKey = false;
    }
  }
  throw new Error('unterminated object literal');
}

function tableValues(source: string, table: string, file: string): string[] {
  const declaration = new RegExp(`\\bconst\\s+${table}\\s*=\\s*(?:stylex\\.create\\s*\\(\\s*)?\\{`).exec(source);
  if (!declaration) throw new Error(`${file}.tsx declares no table "${table}"`);
  const openBrace = declaration.index + declaration[0].length - 1;
  const values = objectKeys(source, openBrace);
  if (values.length === 0) throw new Error(`${file}.tsx table "${table}" resolved to no values`);
  return values;
}

function axesOf({ name, source }: GuideComponent): { prop: string; values: string[] }[] {
  return AXES.flatMap(({ suffix, prop }) => {
    const union = new RegExp(`\\btype\\s+\\w+${suffix}\\s*=\\s*keyof\\s+typeof\\s+(\\w+)\\s*;`).exec(source);
    return union ? [{ prop, values: tableValues(source, union[1] as string, name) }] : [];
  });
}

const ELEMENT_AXIS = /\bgetAttribute\('([a-z-]+)'\)\s*,\s*([A-Z][\w]*)\s*,/g;

function elementAxesOf({ name, source }: GuideComponent): { prop: string; values: string[] }[] {
  const picked = new Map<string, string[]>();
  for (const match of source.matchAll(ELEMENT_AXIS)) {
    const attribute = match[1] as string;
    const table = match[2] as string;
    const declaration = new RegExp(`\\bconst\\s+${table}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s+const`).exec(
      source,
    );
    if (!declaration) {
      throw new Error(`${name}.element.ts: attribute "${attribute}" picks from "${table}", no string array`);
    }
    const values = [...(declaration[1] as string).matchAll(/'([^']+)'/g)].map(
      (value) => value[1] as string,
    );
    if (values.length === 0) {
      throw new Error(`${name}.element.ts table "${table}" resolved to no values`);
    }
    picked.set(attribute, values);
  }
  return AXES.flatMap(({ prop }) => {
    const values = picked.get(prop);
    return values ? [{ prop, values }] : [];
  });
}

function exportedName({ name, source }: GuideComponent): string {
  const list = /\bexport\s*\{([\s\S]*?)\}/.exec(source);
  if (!list) throw new Error(`${name}.tsx has no export list`);
  const values = (list[1] as string)
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && !entry.startsWith('type '));
  const [component, ...rest] = values;
  if (!component) throw new Error(`${name}.tsx exports no value; a component file exports its component`);
  if (rest.length > 1 || rest.some((value) => value !== `use${component}`)) {
    throw new Error(
      `${name}.tsx exports ${values.join(', ')}; a component file exports ${component} and at most use${component}`,
    );
  }
  return component;
}

function describeComponent(component: GuideComponent): string {
  const axes = axesOf(component);
  return [
    `#### ${component.title}`,
    '',
    component.description,
    '',
    '```bash',
    `npx shadcn add @ultima/${component.name}`,
    '```',
    '',
    '```tsx',
    `import { ${exportedName(component)} } from '${UI_ALIAS}/${component.name}';`,
    '```',
    '',
    axes.length === 0
      ? 'No axis props.'
      : axes.map(({ prop, values }) => `- \`${prop}\`: ${values.map((value) => `\`${value}\``).join(' | ')}`).join('\n'),
  ].join('\n');
}

const ELEMENTS_LEAD =
  "Every element below is the same component as its React counterpart, compiled to a custom element for a host that cannot run React. A single-part component is one `ult-<item>` tag and a compound component is an `ult-<item>-<part>` family, one tag per part. Attributes stand in for props: each axis is an attribute carrying the React prop's values verbatim. Elements render into light DOM over `/tokens.css`, and the style slot is `part=` on the parts an element renders plus your own CSS. Serve one file per element from `/elements/`, or `/elements/ultima.js` for the set; `/elements-gallery.html` is the live example of every element in both modes.";

function describeElement(element: GuideComponent): string {
  const axes = elementAxesOf(element);
  return [
    `### ${element.title}`,
    '',
    element.description,
    '',
    `Tag: \`<${element.name}>\``,
    '',
    '```bash',
    `npx shadcn add @ultima/${element.name}`,
    '```',
    '',
    '```html',
    `<script type="module" src="/elements/${element.name}.js"></script>`,
    '```',
    '',
    axes.length === 0
      ? 'No axis attributes.'
      : axes
          .map(({ prop, values }) => `- \`${prop}\`: ${values.map((value) => `\`${value}\``).join(' | ')}`)
          .join('\n'),
  ].join('\n');
}

const BLOCKS_LEAD =
  'A block installs one working screen, built from the components above, as several files under `components/<block>/` that you own from then on. Render its root component, which takes no props, from a route of your own. A control whose effect leaves the screen has no handler: that handler is yours to write.';

function describeBlock(block: GuideBlock): string {
  return [
    `### ${block.title}`,
    '',
    block.description,
    '',
    '```bash',
    `npx shadcn add @ultima/${block.name}`,
    '```',
    '',
    '```tsx',
    `import { ${block.primaryExport} } from '@/components/${block.name}/${block.name}';`,
    '```',
    '',
    `Built from: ${block.builtFrom.join(', ')}.`,
  ].join('\n');
}

function describeRecipe(recipe: RecipeProjection): string {
  return [
    `### ${recipe.title}`,
    '',
    recipe.description,
    '',
    `Canonical example and copy/download source: https://ultima.systems${recipe.url}`,
    '',
    `Items: ${recipe.items.join(', ')}. Engine dependencies: ${recipe.dependencies.join(', ') || 'None'}.`,
    '',
    '```bash',
    recipe.install,
    ...(recipe.engines ? [recipe.engines] : []),
    '```',
  ].join('\n');
}

function describeTokens(tokens: TokensJson['tokens']): string {
  const groups = new Map<string, string[]>();
  for (const [name, { group }] of Object.entries(tokens)) {
    groups.set(group, [...(groups.get(group) ?? []), name]);
  }
  return [...groups]
    .map(([group, names]) => `### ${group}\n\n${names.map((name) => `\`${name}\``).join(', ')}`)
    .join('\n\n');
}

function htmlTagsIn(markdown: string): string[] {
  const prose = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  return [...prose.matchAll(/<\/?[A-Za-z][^>]*>/g)].map((match) => match[0]);
}

function themeDiscovery(spec: string): string {
  const workflow = section(spec, 'Discover and maintain the product theme');
  const boundary = '**Deterministic freshness belongs in the CLI.**';
  if (!workflow.includes(boundary)) throw new Error('Theme discovery has no diagnostics boundary');
  return workflow.slice(0, workflow.indexOf(boundary)).split('\n\n')
    .filter((paragraph) => !paragraph.startsWith('Decided on ') && !paragraph.startsWith('For example, '))
    .join('\n\n').trim();
}

export function agentGuide({
  specPath,
  tokensJsonPath,
  groups,
  elements,
  blocks = [],
  recipes = [],
}: {
  specPath: string;
  tokensJsonPath: string;
  groups: GuideGroup[];
  elements: GuideComponent[];
  blocks?: GuideBlock[];
  recipes?: RecipeProjection[];
}): string {
  const spec = readFileSync(specPath, 'utf8');
  const { tokens } = JSON.parse(readFileSync(tokensJsonPath, 'utf8')) as TokensJson;

  const guide = `${[
    '# Ultima',
    '',
    elements.length === 0
      ? 'Ultima is a design system for React, built on Base UI and StyleX and distributed as a shadcn-compatible registry: you install the source into your own repository and own it from then on. This file is generated from Ultima\'s specification and its registry manifest on every build, and it is the hosted source of Ultima\'s conventions and component APIs for an agent working in a consumer\'s repository. The consumer CLI\'s `install` manages only the `ultima-design` pointer skill and project hook entries, which point here and restate no convention; it writes no root documents. A `DESIGN.md` at the project root arrives only when the consumer explicitly installs a Theme Studio theme item or the `design-md` item: it describes their theme, they own it, and they revise or re-export it when the theme changes.'
      : 'Ultima is a design system with two render targets: React components built on Base UI and StyleX, and custom elements for a host that cannot run React. It is distributed as a shadcn-compatible registry: you install the source into your own repository and own it from then on. This file is generated from Ultima\'s specification and its registry manifest on every build, and it is the hosted source of Ultima\'s conventions and component APIs for an agent working in a consumer\'s repository. The consumer CLI\'s `install` manages only the `ultima-design` pointer skill and project hook entries, which point here and restate no convention; it writes no root documents. A `DESIGN.md` at the project root arrives only when the consumer explicitly installs a Theme Studio theme item or the `design-md` item: it describes their theme, they own it, and they revise or re-export it when the theme changes.',
    '',
    '## Install',
    '',
    section(spec, 'Entry point'),
    '',
    '## Theme adoption',
    '',
    'Choose a theme in [Theme Studio](https://ultima.systems/theme-studio); follow the [install walkthrough](https://ultima.systems/install#theme-adoption) to install, apply and check it.',
    '',
    '### Choose and export',
    '',
    section(spec, 'Choose and export'),
    '',
    '### Apply to Vite and Next.js',
    '',
    section(spec, 'Apply to Vite and Next.js'),
    '',
    '### Check the installed result',
    '',
    section(spec, 'Check the installed result'),
    '',
    '## Discover and maintain the product theme',
    '',
    themeDiscovery(spec),
    '',
    'Report the paths and manual comparison coverage you verified. Ordinary `doctor` checks setup; it does not certify theme freshness or rendered adoption.',
    '',
    '## Principles',
    '',
    section(spec, 'Principles'),
    '',
    '## Conventions',
    '',
    CONVENTIONS.map((heading) => `### ${heading}\n\n${section(spec, heading)}`).join('\n\n'),
    '',
    '## Components',
    '',
    groups.map(({ label, components }) => [`### ${label}`, ...components.map(describeComponent)].join('\n\n')).join('\n\n'),
    ...(elements.length === 0
      ? []
      : ['', '## Elements', '', ELEMENTS_LEAD, '', elements.map(describeElement).join('\n\n')]),
    ...(blocks.length === 0 ? [] : ['', '## Blocks', '', BLOCKS_LEAD, '', blocks.map(describeBlock).join('\n\n')]),
    ...(recipes.length === 0 ? [] : [
      '', '## Recipes', '',
      'Copyable compositions, listed at https://ultima.systems/recipes. Recipes have no registry item: install the dependencies below, then copy every file shown at the canonical example. Source uses the default components.json aliases; substitute your configured aliases. Keep interactive source behind a Next.js client boundary. Run ultima-design doctor and ultima-design check, build your application, and exercise the documented states in both modes. Installed copy-bundle compilation is not yet verified.',
      '', recipes.map(describeRecipe).join('\n\n'),
    ]),
    '',
    '## Tokens',
    '',
    'Names are stable across releases; values are not. Both modes\' values are at `/tokens.json`, and the same tokens as CSS custom properties are at `/tokens.css`.',
    '',
    describeTokens(tokens),
    '',
    '## CLI',
    '',
    section(spec, 'Agent guide'),
  ].join('\n')}\n`;

  const tags = htmlTagsIn(guide);
  if (tags.length > 0) throw new Error(`llms.txt is plain Markdown, but holds ${tags.length} HTML tags: ${tags[0]}`);
  const bytes = Buffer.byteLength(guide);
  if (bytes > MAX_BYTES) throw new Error(`llms.txt is ${bytes} bytes, over the ${MAX_BYTES} byte limit`);
  return guide;
}
