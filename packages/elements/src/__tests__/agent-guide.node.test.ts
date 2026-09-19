import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

import { agentGuide, type GuideComponent } from '../../../../scripts/build-agent-guide.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function element(name: string): GuideComponent {
  return {
    name,
    title: `${name} element`,
    description: `Ultima ${name} as a custom element.`,
    source: readFileSync(join(root, 'packages/elements/src', `${name}.element.ts`), 'utf8'),
  };
}

function guide(elements: GuideComponent[]): string {
  return agentGuide({
    specPath: join(root, 'docs/spec/ultima.md'),
    tokensJsonPath: join(root, 'packages/tokens/dist/tokens.json'),
    components: [],
    elements,
  });
}

test('emits an Elements section once an element item exists', () => {
  const output = guide([element('ult-button')]);
  expect(output).toContain('## Elements');
  expect(output).toContain('`<ult-button>`');
  expect(output).toContain('npx shadcn add @ultima/ult-button');
  expect(output).toContain('/elements/ult-button.js');
  expect(output).toContain('/elements/ultima.js');
  expect(output).toContain('/elements.html');
  expect(output).toContain('- `variant`: `solid` | `outline` | `ghost`');
  expect(output).toContain('- `size`: `sm` | `md` | `lg`');
  expect(output).toContain('- `tone`: `accent` | `danger`');
});

test('names both render targets in the opening paragraph', () => {
  const output = guide([element('ult-button')]);
  expect(output).toContain('React components');
  expect(output).toContain('custom elements');
});

test('an element with no axes declares no axis attributes', () => {
  expect(guide([element('ult-card')])).toContain('No axis attributes.');
});

test('emits no Elements heading while no element item exists', () => {
  const output = guide([]);
  expect(output).not.toContain('## Elements');
  expect(output).toContain('design system for React');
});
