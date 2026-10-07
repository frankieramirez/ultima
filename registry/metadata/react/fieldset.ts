import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'fieldset',
  kind: 'react',
  title: 'Fieldset',
  description: 'A legend and related controls as a real fieldset, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: 'import { Field } from \'@/components/ui/field\';\nimport { Fieldset } from \'@/components/ui/fieldset\';\nimport { Input } from \'@/components/ui/input\';\n\n<Fieldset.Root>\n  <Fieldset.Legend>Account</Fieldset.Legend>\n  <Field.Root name="email">\n    <Field.Label>Email</Field.Label>\n    <Input type="email" />\n  </Field.Root>\n</Fieldset.Root>',
  primaryExport: 'Fieldset',
  release: 'v0.1',
  order: 2,
  group: 'forms',
} satisfies ReactDescriptor;
