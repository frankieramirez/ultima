import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'input',
  kind: 'react',
  title: 'Input',
  description: 'A text input in three sizes, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Input } from \'@/components/ui/input\';\n\n<label htmlFor="email">Email</label>\n<Input id="email" size="md" />',
  primaryExport: 'Input',
  release: 'v0',
  order: 13,
} satisfies ReactDescriptor;
