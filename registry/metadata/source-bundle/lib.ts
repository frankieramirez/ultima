import type { SourceBundleDescriptor } from '../schema.ts';

export default {
  id: 'lib',
  kind: 'source-bundle',
  title: 'Ultima component helpers',
  description: 'The shared prop types every Ultima component is built on, plus the clip-hidden style for visually hidden elements.',
  contract: 'docs/spec/ultima.md#the-shared-lib',
  installDocs: "import type { PartProps, PlainProps, StyleProp } from '@/lib/component';\nimport { visuallyHidden, visuallyHiddenFocusable } from '@/lib/visually-hidden';",
  inventory: 'lib',
} satisfies SourceBundleDescriptor;
