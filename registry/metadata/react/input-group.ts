import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'input-group',
  kind: 'react',
  title: 'Input Group',
  description: 'A field box holding an input with leading and trailing addons, in three sizes.',
  contract: 'docs/spec/ultima.md#the-button-group-input-group-input-otp-and-native-select-set',
  installDocs: 'import { InputGroup } from \'@/components/ui/input-group\';\n\n<InputGroup.Root>\n  <InputGroup.Addon>@</InputGroup.Addon>\n  <InputGroup.Input placeholder="handle" />\n  <InputGroup.Addon align="end">.dev</InputGroup.Addon>\n</InputGroup.Root>\n\nRoot is a visual box with no role; a Field or Fieldset owns the semantics. The name is the inner input\'s own: a label, aria-label, or Field.Label. align on Addon positions it, not the DOM order.',
  primaryExport: 'InputGroup',
  release: 'v0.2',
  order: 19,
  group: 'forms',
} satisfies ReactDescriptor;
