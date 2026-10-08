import type { CompositionExample } from './compositions.ts';

export default [
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
] satisfies CompositionExample[];
