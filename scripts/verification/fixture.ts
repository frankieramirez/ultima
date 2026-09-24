/** A small valid feature map on top of the catalogue fixture, for the negative cases to break. */
import { validFixture as validCatalogue } from '../catalogue/fixture.ts';

export const FEATURE = 'verification/features/button.json';
export const SCENARIO = 'verification/scenarios/button/press.json';
export const UI_BINDING = 'packages/ui/src/__tests__/button.test.tsx';
export const PRODUCTION_BINDING = 'apps/docs/tests/production/button.press.ts';

export const PRODUCTION_VARIANTS = { mode: ['dark', 'light'], viewport: ['desktop', 'narrow'], motion: ['normal'] };

export const feature = (changes: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  id: 'button',
  title: 'Button',
  summary: 'A pressable control.',
  aliases: ['press'],
  contract: 'docs/spec/ultima.md#plain-components',
  items: ['button'],
  sourceRoots: ['apps/docs/src/studio'],
  extraDependencies: [],
  supporting: [],
  ...changes,
});

export const scenario = (changes: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  id: 'button.press',
  title: 'Pressing a button',
  intent: 'A press fires once.',
  contract: 'docs/spec/ultima.md#plain-components',
  aliases: ['click'],
  items: ['button'],
  sources: ['packages/ui/src/button.tsx'],
  demos: ['apps/docs/src/demos/button/basic.tsx'],
  routes: [
    { kind: 'item', item: 'button' },
    { kind: 'application', definition: 'apps/docs/src/router.tsx', pathname: '/studio' },
  ],
  fixtures: [{ name: 'basic demo', path: 'apps/docs/src/demos/button/basic.tsx', reset: 'fresh-context' }],
  preconditions: ['The page is loaded.'],
  steps: [{ action: 'Press the button.', expect: 'It fires once.' }],
  targets: [
    { target: 'ui-vitest', variants: 'default' },
    { target: 'production', variants: PRODUCTION_VARIANTS },
  ],
  ...changes,
});

export const uiBinding = (id = 'button.press', target = 'ui-vitest') =>
  [
    "import { test } from 'vitest';",
    "import { scenario } from '../../../../scripts/verification/register.ts';",
    `test('presses', scenario('${id}', '${target}', async () => {}));`,
  ].join('\n');

export const productionBinding = (id = 'button.press') =>
  [
    "import { productionScenario } from '../../../../scripts/verification/production.ts';",
    `export default productionScenario('${id}', 'production', async () => {});`,
  ].join('\n');

export function validFixture(): Record<string, string> {
  return {
    ...validCatalogue(),
    'apps/docs/src/studio/draft.ts': 'export const draft = {};\n',
    'apps/docs/src/router.tsx': "const studio = createRoute({ getParentRoute: () => root, path: '/studio' });\n",
    [FEATURE]: JSON.stringify(feature()),
    [SCENARIO]: JSON.stringify(scenario()),
    [UI_BINDING]: uiBinding(),
    [PRODUCTION_BINDING]: productionBinding(),
  };
}
