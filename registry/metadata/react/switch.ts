import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'switch',
  kind: 'react',
  title: 'Switch',
  description: 'An on-off toggle with a sliding thumb, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: "import { Switch } from '@/components/ui/switch';\n\n<label>\n  Notifications\n  <Switch.Root>\n    <Switch.Thumb />\n  </Switch.Root>\n</label>",
  primaryExport: 'Switch',
  release: 'v0',
  order: 14,
  group: 'forms',
  replaces: { roles: ['switch'] },
} satisfies ReactDescriptor;
