import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'toggle',
  kind: 'react',
  title: 'Toggle',
  description: 'A two-state button in two variants and three sizes, on Base UI.',
  contract: 'docs/spec/ultima.md#the-toggle-accordion-avatar-and-scroll-area-set',
  installDocs: "import { Toggle } from '@/components/ui/toggle';\n\n<Toggle>Bold</Toggle>\n\nThe name is the text content; an icon-only toggle passes aria-label and squares the box with a style override on paddingInline. There is no value prop: value identifies a toggle to a ToggleGroup, and a toggle inside one is ToggleGroup.Item, which keeps both.",
  primaryExport: 'Toggle',
  release: 'v0.2',
  order: 12,
  group: 'forms',
} satisfies ReactDescriptor;
