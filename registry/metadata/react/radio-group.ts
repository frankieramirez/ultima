import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'radio-group',
  kind: 'react',
  title: 'Radio Group',
  description: 'A radio group with a filled-circle indicator, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: 'import { RadioGroup } from \'@/components/ui/radio-group\';\n\n<RadioGroup.Root aria-label="Plan" defaultValue="pro">\n  <RadioGroup.Item value="hobby">\n    <RadioGroup.Indicator />\n  </RadioGroup.Item>\n  <RadioGroup.Item value="pro">\n    <RadioGroup.Indicator />\n  </RadioGroup.Item>\n</RadioGroup.Root>',
  primaryExport: 'RadioGroup',
  release: 'v0.1',
  order: 4,
} satisfies ReactDescriptor;
