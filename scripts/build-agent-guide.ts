/**
 * Writes the agent guide, `apps/docs/public/llms.txt`, from `docs/spec/ultima.md`,
 * the registry manifest, and the tokens JSON export. Per the Agent surface section
 * of the specification and ADR 0005, guidance is hosted and generated: this file is
 * the only thing an agent in a consumer's repository reads, and Ultima installs no
 * documentation, so nothing here may be a second copy of a convention.
 */
import { readFileSync } from 'node:fs';

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
    `### ${component.title}`,
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
  "Every element below is the same component as its React counterpart, compiled to a custom element for a host that cannot run React. A single-part component is one `ult-<item>` tag and a compound component is an `ult-<item>-<part>` family, one tag per part. Attributes stand in for props: each axis is an attribute carrying the React prop's values verbatim. Elements render into light DOM over `/tokens.css`, and the style slot is `part=` on the parts an element renders plus your own CSS. Serve one file per element from `/elements/`, or `/elements/ultima.js` for the set; `/elements.html` is the live example of every element in both modes.";

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

export function agentGuide({
  specPath,
  tokensJsonPath,
  components,
  elements,
}: {
  specPath: string;
  tokensJsonPath: string;
  components: GuideComponent[];
  elements: GuideComponent[];
}): string {
  const spec = readFileSync(specPath, 'utf8');
  const { tokens } = JSON.parse(readFileSync(tokensJsonPath, 'utf8')) as TokensJson;

  const guide = `${[
    '# Ultima',
    '',
    elements.length === 0
      ? 'Ultima is a design system for React, built on Base UI and StyleX and distributed as a shadcn-compatible registry: you install the source into your own repository and own it from then on. This file is generated from Ultima\'s specification and its registry manifest on every build, and it is the whole of Ultima\'s guidance for an agent working in a consumer\'s repository, because Ultima installs no documentation of its own.'
      : 'Ultima is a design system with two render targets: React components built on Base UI and StyleX, and custom elements for a host that cannot run React. It is distributed as a shadcn-compatible registry: you install the source into your own repository and own it from then on. This file is generated from Ultima\'s specification and its registry manifest on every build, and it is the whole of Ultima\'s guidance for an agent working in a consumer\'s repository, because Ultima installs no documentation of its own.',
    '',
    '## Install',
    '',
    section(spec, 'Entry point'),
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
    components.map(describeComponent).join('\n\n'),
    ...(elements.length === 0
      ? []
      : ['', '## Elements', '', ELEMENTS_LEAD, '', elements.map(describeElement).join('\n\n')]),
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
