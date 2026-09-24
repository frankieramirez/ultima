import type { RecipeDescriptor } from '../schema.ts';

export default {
  id: 'carousel',
  kind: 'recipe',
  title: 'Carousel',
  description: 'Aspect Ratio slides stepped by Buttons, scrolled by Embla.',
  contract: 'docs/spec/ultima.md#carousel',
  page: 'aspect-ratio',
  section: 'carousel',
  release: 'v0.2',
  demos: [
    'apps/docs/src/demos/aspect-ratio/carousel.tsx',
  ],
} satisfies RecipeDescriptor;
