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
  },
  {
    id: 'style-overrides',
    title: 'Component style overrides',
    route: '/build-a-screen',
    anchor: 'component-style-overrides',
    files: [
      { source: 'apps/docs/src/examples/complete-screen/style-overrides.tsx', destination: 'components/examples/style-overrides.tsx' },
    ],
  },
  {
    id: 'interaction-states',
    title: 'Interaction states',
    route: '/build-a-screen',
    anchor: 'interaction-states',
    files: [
      { source: 'apps/docs/src/examples/complete-screen/interaction-states.tsx', destination: 'components/examples/interaction-states.tsx' },
    ],
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
  },
  {
    id: 'settings-01-adaptation',
    title: 'Adapt an existing block',
    block: 'settings-01',
    route: '/build-a-screen',
    anchor: 'adapt-an-existing-block',
    files: [],
  },
] satisfies CompositionExample[];
