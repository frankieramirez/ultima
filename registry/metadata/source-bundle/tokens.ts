import type { SourceBundleDescriptor } from '../schema.ts';

export default {
  id: 'tokens',
  kind: 'source-bundle',
  title: 'Ultima tokens',
  description: "Ultima's design tokens and the dark and light themes, as StyleX variables.",
  contract: 'docs/spec/ultima.md#tokens',
  installDocs: "import { color, space, text } from '@/lib/tokens.stylex';\nimport { colorScheme, darkShadow, darkTheme, lightShadow, lightTheme } from '@/lib/themes';\n\nApply colorScheme to <html>. To pin a subtree to one mode, apply that mode's theme and shadow together: stylex.props(lightTheme, lightShadow, colorScheme.light).",
  inventory: 'tokens',
} satisfies SourceBundleDescriptor;
