import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'toggle-group',
  kind: 'react',
  title: 'Toggle Group',
  description: 'A segmented group of toggle buttons with roving focus, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { ToggleGroup } from \'@/components/ui/toggle-group\';\n\n<ToggleGroup.Root aria-label="Layout" defaultValue={[\'list\']}>\n  <ToggleGroup.Item value="list">List</ToggleGroup.Item>\n  <ToggleGroup.Item value="grid">Grid</ToggleGroup.Item>\n</ToggleGroup.Root>',
  primaryExport: 'ToggleGroup',
  release: 'v0',
  order: 17,
  group: 'forms',
} satisfies ReactDescriptor;
