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
  {
    id: 'projects',
    title: 'Projects screen',
    files: [
      { source: 'apps/docs/src/examples/complete-screen/projects.tsx', destination: 'components/projects/projects.tsx' },
      { source: 'apps/docs/src/examples/complete-screen/projects-data.ts', destination: 'components/projects/projects-data.ts' },
      { source: 'apps/docs/src/examples/complete-screen/screen.stylex.ts', destination: 'components/projects/screen.stylex.ts' },
    ],
  },
] satisfies CompositionExample[];
