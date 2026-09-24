import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'button-group',
  kind: 'react',
  title: 'Button Group',
  description: 'A row of buttons joined as one control, in three variants and two tones, on Base UI.',
  docsDescription: 'A row of buttons joined as one control, with per-item variant and tone overrides.',
  contract: 'docs/spec/ultima.md#the-button-group-input-group-input-otp-and-native-select-set',
  installDocs: 'import { ButtonGroup } from \'@/components/ui/button-group\';\n\n<ButtonGroup.Root aria-label="Text actions">\n  <ButtonGroup.Item>Cut</ButtonGroup.Item>\n  <ButtonGroup.Item>Copy</ButtonGroup.Item>\n  <ButtonGroup.Item>Paste</ButtonGroup.Item>\n</ButtonGroup.Root>\n\nvariant, size, and tone sit on Root and reach every Item; an Item takes its own variant and tone, which win, and no size.',
  primaryExport: 'ButtonGroup',
  release: 'v0.2',
  order: 18,
} satisfies ReactDescriptor;
