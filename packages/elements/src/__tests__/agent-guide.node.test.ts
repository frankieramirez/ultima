import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { agentGuide, type GuideComponent, type GuideGroup } from '../../../../scripts/build-agent-guide.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function element(name: string): GuideComponent {
  return {
    name,
    title: `${name} element`,
    description: `Ultima ${name} as a custom element.`,
    source: readFileSync(join(root, 'packages/elements/src', `${name}.element.ts`), 'utf8'),
  };
}

function guide(elements: GuideComponent[], groups: GuideGroup[] = []): string {
  return agentGuide({
    specPath: join(root, 'docs/spec/ultima.md'),
    tokensJsonPath: join(root, 'packages/tokens/dist/tokens.json'),
    groups,
    elements,
  });
}

function component(name: string, title: string): GuideComponent {
  return { name, title, description: `${title}, for the guide.`, source: readFileSync(join(root, 'packages/ui/src', `${name}.tsx`), 'utf8') };
}

test('emits an Elements section once an element item exists', () => {
  const output = guide([element('ult-button')]);
  expect(output).toContain('## Elements');
  expect(output).toContain('`<ult-button>`');
  expect(output).toContain('npx shadcn add @ultima/ult-button');
  expect(output).toContain('/elements/ult-button.js');
  expect(output).toContain('/elements/ultima.js');
  expect(output).toContain('/elements-gallery.html');
  expect(output).toContain('- `variant`: `solid` | `outline` | `ghost`');
  expect(output).toContain('- `size`: `sm` | `md` | `lg`');
  expect(output).toContain('- `tone`: `accent` | `danger`');
});

test('names both render targets in the opening paragraph', () => {
  const output = guide([element('ult-button')]);
  expect(output).toContain('React components');
  expect(output).toContain('custom elements');
});

test('names the opt-in DESIGN.md as consumer-owned for both render targets', () => {
  for (const output of [guide([]), guide([element('ult-button')])]) {
    expect(output).not.toContain('installs no documentation');
    expect(output).toContain('`DESIGN.md`');
    expect(output).toContain('`design-md`');
    expect(output).toContain('`ultima-design` pointer skill');
  }
});

test('an element with no axes declares no axis attributes', () => {
  expect(guide([element('ult-card')])).toContain('No axis attributes.');
});

test('emits no Elements heading while no element item exists', () => {
  const output = guide([]);
  expect(output).not.toContain('## Elements');
  expect(output).toContain('design system for React');
});

test('publishes adoption, discovery and implemented diagnostics from the owning specification', () => {
  const spec = readFileSync(join(root, 'docs/spec/ultima.md'), 'utf8');
  const output = guide([]);
  expect(output).toContain('## Theme adoption');
  expect(output).toContain('## Discover and maintain the product theme');
  expect(output).toContain('https://ultima.systems/theme-studio');
  expect(output).toContain('https://ultima.systems/install#theme-adoption');
  const discovery = output.slice(output.indexOf('## Discover and maintain'), output.indexOf('## Principles'));
  for (const paragraph of ['Before the first UI edit,', 'Report the application and boundary,', 'Fetch the configured registry', '**Resolve conflicts', '**Update a linked theme', 'Consumer prose outside', 'Run local `doctor`']) {
    const source = spec.slice(spec.indexOf(paragraph)).split('\n\n')[0]!;
    expect(discovery).toContain(source);
  }
  const inputs = ['Explicit user instructions', 'Local `DESIGN.md`', 'Entry/layout imports', 'Associated draft JSON', 'Installed token source', 'Hosted conventions'];
  expect(inputs.map((input) => discovery.indexOf(input))).toEqual([...inputs.map((input) => discovery.indexOf(input))].sort((a, b) => a - b));
  expect(discovery).toContain('npx --no-install ultima-design');
  expect(discovery).toContain('Draft missing or its version/recipe/preset cannot be resolved');
  expect(discovery).toContain('Generated CSS was hand-edited');
  for (const paragraph of ['**Deterministic freshness belongs in the CLI.**', 'The report states `match`', '`doctor --theme` keeps']) {
    const source = spec.slice(spec.indexOf(paragraph)).split('\n\n')[0]!;
    expect(discovery).toContain(source);
  }
  expect(output.match(/## Discover and maintain the product theme/g)).toHaveLength(1);
  expect(output).not.toContain('Guidance ownership and implementation consumers');
  expect(output).not.toContain('Required verification scenarios for implementation');
  expect(Buffer.byteLength(output)).toBeLessThanOrEqual(64 * 1024);
});

test('regeneration follows adoption and discovery prose changes in the spec', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ultima-guide-'));
  try {
    const specPath = join(directory, 'spec.md');
    writeFileSync(specPath, readFileSync(join(root, 'docs/spec/ultima.md'), 'utf8')
      .replace('A fresh project can use Neutral immediately.', 'Spec-derived adoption sentinel.')
      .replace('Before the first UI edit, identify the consumer application root', 'Spec-derived discovery sentinel'));
    const output = agentGuide({ specPath, tokensJsonPath: join(root, 'packages/tokens/dist/tokens.json'), groups: [], elements: [] });
    expect(output).toContain('Spec-derived adoption sentinel.');
    expect(output).toContain('Spec-derived discovery sentinel');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('retains the byte limit with adoption and discovery present', () => {
  expect(() => guide([], [{ label: 'Large', components: [{ ...component('button', 'Button'), description: 'x'.repeat(64 * 1024) }] }])).toThrow('over the 65536 byte limit');
});

test('lists the components under one heading per group, in the order given', () => {
  const output = guide([], [
    { label: 'Forms', components: [component('button', 'Button'), component('input', 'Input')] },
    { label: 'Feedback', components: [component('alert', 'Alert')] },
  ]);
  const components = output.slice(output.indexOf('\n## Components\n'), output.indexOf('\n## Tokens\n'));
  expect([...components.matchAll(/^#{3,4} .+$/gm)].map(([line]) => line)).toEqual([
    '### Forms',
    '#### Button',
    '#### Input',
    '### Feedback',
    '#### Alert',
  ]);
  expect(components).toContain('npx shadcn add @ultima/input');
});
