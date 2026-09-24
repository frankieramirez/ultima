import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'button',
  kind: 'react',
  title: 'Button',
  description: 'A button in three variants, three sizes, and two tones, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Button } from \'@/components/ui/button\';\n\n<Button variant="solid" size="md" tone="accent">Save</Button>',
  primaryExport: 'Button',
  release: 'v0',
  order: 1,
  replaces: { elements: ['button'], roles: ['button'] },
} satisfies ReactDescriptor;
