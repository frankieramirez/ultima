import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'tabs',
  kind: 'react',
  title: 'Tabs',
  description: 'Tabbed sections in an underline or a segmented variant, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Tabs } from \'@/components/ui/tabs\';\n\n<Tabs.Root variant="underline" defaultValue="tokens">\n  <Tabs.List>\n    <Tabs.Tab value="tokens">Tokens</Tabs.Tab>\n    <Tabs.Tab value="themes">Themes</Tabs.Tab>\n    <Tabs.Indicator />\n  </Tabs.List>\n  <Tabs.Panel value="tokens">Anything.</Tabs.Panel>\n</Tabs.Root>',
  primaryExport: 'Tabs',
  release: 'v0',
  order: 5,
  group: 'navigation',
  replaces: { roles: ['tab', 'tablist', 'tabpanel'] },
} satisfies ReactDescriptor;
