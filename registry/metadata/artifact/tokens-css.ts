import type { ArtifactDescriptor } from '../schema.ts';

export default {
  id: 'tokens-css',
  kind: 'artifact',
  title: 'Ultima tokens as CSS',
  description: 'The generated token stylesheet, for a project that cannot run StyleX.',
  contract: 'docs/spec/ultima.md#the-tokens-css-export',
  installDocs: 'Import \'./ultima-tokens.css\' once, from your root layout or entry stylesheet, then read the tokens with var(--ult-color-surface) and friends. Set data-theme="dark" or "light" on <html> to pin a mode; without it the file follows the operating system.',
  producer: 'tokens-build',
  output: 'packages/tokens/dist/tokens.css',
  fileType: 'registry:file',
  target: '~/ultima-tokens.css',
} satisfies ArtifactDescriptor;
