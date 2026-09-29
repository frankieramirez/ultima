import type { ArtifactDescriptor } from '../schema.ts';

export default {
  id: 'design-md',
  kind: 'artifact',
  title: 'Ultima design system',
  description: 'The default Ultima design system as a root DESIGN.md file.',
  contract: 'docs/spec/theme-studio.md#design-md-export',
  installDocs: 'Installs DESIGN.md at the project root. Review it for your application, then keep it in sync with your theme. Theme Studio exports a DESIGN.md with the values of your current draft.',
  producer: 'tokens-build',
  output: 'packages/tokens/dist/DESIGN.md',
  fileType: 'registry:file',
  target: '~/DESIGN.md',
} satisfies ArtifactDescriptor;
