import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'field',
  kind: 'react',
  title: 'Field',
  description: 'A label, description, and error bound to one control, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: 'import { Field } from \'@/components/ui/field\';\nimport { Input } from \'@/components/ui/input\';\n\n<Field.Root name="email">\n  <Field.Label>Email</Field.Label>\n  <Input type="email" required />\n  <Field.Description>We never share this.</Field.Description>\n  <Field.Error />\n</Field.Root>',
  primaryExport: 'Field',
  release: 'v0.1',
  order: 1,
  group: 'forms',
  elementless: ['Validity'],
} satisfies ReactDescriptor;
