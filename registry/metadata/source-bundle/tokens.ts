import type { SourceBundleDescriptor } from '../schema.ts';

export default {
  id: 'tokens',
  kind: 'source-bundle',
  title: 'Ultima tokens',
  description: "Ultima's design tokens and the dark and light themes, as StyleX variables.",
  contract: 'docs/spec/ultima.md#tokens',
  installDocs: "import { color, space, text } from '@/lib/tokens.stylex';\nimport { colorScheme, darkTheme, lightTheme } from '@/lib/themes';\n\nApply colorScheme to <html> and a theme to any subtree to pin it.",
  inventory: 'tokens',
} satisfies SourceBundleDescriptor;
