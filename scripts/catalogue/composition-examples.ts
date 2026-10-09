import type { CompositionExample } from './compositions.ts';

export default [
  {
    id: 'projects',
    title: 'Responsive screen',
    route: '/build-a-screen',
    anchor: 'responsive-screen',
    files: [
      { source: 'apps/docs/src/examples/complete-screen/projects.tsx', destination: 'components/projects/projects.tsx' },
      { source: 'apps/docs/src/examples/complete-screen/projects-data.ts', destination: 'components/projects/projects-data.ts' },
      { source: 'apps/docs/src/examples/complete-screen/screen.stylex.ts', destination: 'components/projects/screen.stylex.ts' },
    ],
    feature: 'screen-composition',
    scenarios: ['screen-composition.copy-bundles'],
  },
  {
    id: 'typography',
    title: 'Typography',
    recipe: 'typography',
    route: '/components/code',
    anchor: 'typography',
    files: [
      { source: 'apps/docs/src/demos/code/typography.tsx', destination: 'examples/demos/code/typography.tsx' },
    ],
    feature: 'screen-composition',
    scenarios: ['screen-composition.copy-bundles'],
  },
  {
    id: 'style-overrides',
    title: 'Component style overrides',
    route: '/build-a-screen',
    anchor: 'component-style-overrides',
    files: [
      { source: 'apps/docs/src/examples/complete-screen/style-overrides.tsx', destination: 'components/examples/style-overrides.tsx' },
    ],
    feature: 'screen-composition',
    scenarios: ['screen-composition.copy-bundles'],
  },
  {
    id: 'interaction-states',
    title: 'Interaction states',
    route: '/build-a-screen',
    anchor: 'interaction-states',
    files: [
      { source: 'apps/docs/src/examples/complete-screen/interaction-states.tsx', destination: 'components/examples/interaction-states.tsx' },
    ],
    feature: 'screen-composition',
    scenarios: ['screen-composition.copy-bundles'],
  },
  {
    id: 'product-tokens',
    title: 'Product semantic tokens',
    route: '/build-a-screen',
    anchor: 'product-semantic-tokens',
    files: [
      { source: 'apps/docs/src/examples/complete-screen/projects.tsx', destination: 'components/projects/projects.tsx' },
      { source: 'apps/docs/src/examples/complete-screen/projects-data.ts', destination: 'components/projects/projects-data.ts' },
      { source: 'apps/docs/src/examples/complete-screen/screen.stylex.ts', destination: 'components/projects/screen.stylex.ts' },
    ],
    feature: 'screen-composition',
    scenarios: ['screen-composition.copy-bundles'],
  },
  {
    id: 'settings-01-adaptation',
    title: 'Adapt an existing block',
    block: 'settings-01',
    route: '/build-a-screen',
    anchor: 'adapt-an-existing-block',
    files: [],
    feature: 'screen-composition',
    scenarios: ['screen-composition.copy-bundles'],
  },
] satisfies CompositionExample[];
