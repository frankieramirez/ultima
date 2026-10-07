import { readFileSync } from 'node:fs';
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
