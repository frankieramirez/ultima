import type { RecipeDescriptor } from '../schema.ts';

export default {
  id: 'react-hook-form',
  kind: 'recipe',
  title: 'React Hook Form',
  description: 'Field wired to React Hook Form, the engine the consumer installs.',
  contract: 'docs/spec/ultima.md#forms',
  page: 'field',
  section: 'react-hook-form',
  release: 'v0.1',
  demos: [
    'apps/docs/src/demos/field/react-hook-form.tsx',
  ],
} satisfies RecipeDescriptor;
