import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'checkbox',
  kind: 'react',
  title: 'Checkbox',
  description: 'A checkbox with a check, a dash for mixed, and an optional group, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: "import { Checkbox } from '@/components/ui/checkbox';\n\n<label>\n  Accept terms\n  <Checkbox.Root>\n    <Checkbox.Indicator />\n  </Checkbox.Root>\n</label>",
  primaryExport: 'Checkbox',
  release: 'v0.1',
  order: 3,
  replaces: { elements: ['input[type=checkbox]'], roles: ['checkbox'] },
} satisfies ReactDescriptor;
