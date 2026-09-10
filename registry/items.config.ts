/**
 * `docs` is printed by the shadcn CLI after an install.
 */

export type RegistryItemDescription = {
  title: string;
  description: string;
  docs: string;
  /** Setup items only: their files are authored, so their npm packages cannot be derived. */
  dependencies?: string[];
  devDependencies?: string[];
};

export const items: Record<string, RegistryItemDescription> = {
  tokens: {
    title: 'Ultima tokens',
    description: "Ultima's design tokens and the dark and light themes, as StyleX variables.",
    docs: "import { color, space, text } from '@/lib/tokens.stylex';\nimport { colorScheme, darkTheme, lightTheme } from '@/lib/themes';\n\nApply colorScheme to <html> and a theme to any subtree to pin it.",
  },
  lib: {
    title: 'Ultima component helpers',
    description: 'The shared prop types every Ultima component is built on.',
    docs: "import type { PartProps, PlainProps, StyleProp } from '@/lib/component';",
  },
  button: {
    title: 'Button',
    description: 'A button in three variants, three sizes, and two tones, on Base UI.',
    docs: "import { Button } from '@/components/ui/button';\n\n<Button variant=\"solid\" size=\"md\" tone=\"accent\">Save</Button>",
  },
  'dropdown-menu': {
    title: 'Dropdown Menu',
    description: 'A keyboard-navigable menu with items, submenus, and selection controls, on Base UI.',
    docs: "import { Button } from '@/components/ui/button';\nimport { DropdownMenu } from '@/components/ui/dropdown-menu';\n\n<DropdownMenu.Root>\n  <DropdownMenu.Trigger render={<Button />}>Actions</DropdownMenu.Trigger>\n  <DropdownMenu.Portal>\n    <DropdownMenu.Positioner>\n      <DropdownMenu.Popup>\n        <DropdownMenu.Item>Settings</DropdownMenu.Item>\n      </DropdownMenu.Popup>\n    </DropdownMenu.Positioner>\n  </DropdownMenu.Portal>\n</DropdownMenu.Root>",
  },
  badge: {
    title: 'Badge',
    description: 'A small static label in two variants and six tones.',
    docs: "import { Badge } from '@/components/ui/badge';\n\n<Badge variant=\"subtle\" tone=\"success\">Passing</Badge>",
  },
  card: {
    title: 'Card',
    description: 'A surface with a header, body, and footer for grouping related content.',
    docs: "import { Card } from '@/components/ui/card';\n\n<Card.Root>\n  <Card.Header>\n    <Card.Title>Ultima</Card.Title>\n    <Card.Description>A design system.</Card.Description>\n  </Card.Header>\n  <Card.Body>Anything.</Card.Body>\n</Card.Root>",
  },
  collapsible: {
    title: 'Collapsible',
    description: 'A disclosure that animates its panel open and closed, on Base UI.',
    docs: "import { Button } from '@/components/ui/button';\nimport { Collapsible } from '@/components/ui/collapsible';\n\n<Collapsible.Root>\n  <Collapsible.Trigger render={<Button variant=\"ghost\" />}>Details</Collapsible.Trigger>\n  <Collapsible.Panel>Anything.</Collapsible.Panel>\n</Collapsible.Root>",
  },
  code: {
    title: 'Code',
    description: 'Monospaced code, inline in a sentence or as a block.',
    docs: "import { Code } from '@/components/ui/code';\n\n<Code>npx shadcn add @ultima/button</Code>\n<Code variant=\"block\">{source}</Code>",
  },
  input: {
    title: 'Input',
    description: 'A text input in three sizes, on Base UI.',
    docs: 'import { Input } from \'@/components/ui/input\';\n\n<label htmlFor="email">Email</label>\n<Input id="email" size="md" />',
  },
  meter: {
    title: 'Meter',
    description: 'A bounded measurement as a toned bar, on Base UI.',
    docs: 'import { Meter } from \'@/components/ui/meter\';\n\n<Meter.Root value={72}>\n  <Meter.Label>Disk used</Meter.Label>\n  <Meter.Track>\n    <Meter.Indicator tone="warning" />\n  </Meter.Track>\n  <Meter.Value tone="warning" />\n</Meter.Root>',
  },
  stat: {
    title: 'Stat',
    description: 'A single number with its label, for dashboards and summaries.',
    docs: "import { Stat } from '@/components/ui/stat';\n\n<Stat.Root>\n  <Stat.Label>Tokens</Stat.Label>\n  <Stat.Value>95</Stat.Value>\n</Stat.Root>",
  },
  select: {
    title: 'Select',
    description: 'A form control for choosing a predefined value from a popup list.',
    docs: "import { Select } from '@/components/ui/select';\n\n<Select.Root>\n  <Select.Label>Fruit</Select.Label>\n  <Select.Trigger>\n    <Select.Value placeholder=\"Pick a fruit\" />\n    <Select.Icon />\n  </Select.Trigger>\n  <Select.Portal>\n    <Select.Positioner>\n      <Select.Popup>\n        <Select.List>\n          <Select.Item value=\"apple\">\n            <Select.ItemIndicator />\n            <Select.ItemText>Apple</Select.ItemText>\n          </Select.Item>\n        </Select.List>\n      </Select.Popup>\n    </Select.Positioner>\n  </Select.Portal>\n</Select.Root>",
  },
  switch: {
    title: 'Switch',
    description: 'An on-off toggle with a sliding thumb, on Base UI.',
    docs: "import { Switch } from '@/components/ui/switch';\n\n<label>\n  Notifications\n  <Switch.Root>\n    <Switch.Thumb />\n  </Switch.Root>\n</label>",
  },
  table: {
    title: 'Table',
    description: 'A data table as native table parts, with an optional caption.',
    docs: "import { Table } from '@/components/ui/table';\n\n<Table.Root>\n  <Table.Caption>Latency by region</Table.Caption>\n  <Table.Head>\n    <Table.Row>\n      <Table.HeadCell>Region</Table.HeadCell>\n    </Table.Row>\n  </Table.Head>\n  <Table.Body>\n    <Table.Row>\n      <Table.Cell>us-east-1</Table.Cell>\n    </Table.Row>\n  </Table.Body>\n</Table.Root>",
  },
  tabs: {
    title: 'Tabs',
    description: 'Tabbed sections in an underline or a segmented variant, on Base UI.',
    docs: 'import { Tabs } from \'@/components/ui/tabs\';\n\n<Tabs.Root variant="underline" defaultValue="tokens">\n  <Tabs.List>\n    <Tabs.Tab value="tokens">Tokens</Tabs.Tab>\n    <Tabs.Tab value="themes">Themes</Tabs.Tab>\n    <Tabs.Indicator />\n  </Tabs.List>\n  <Tabs.Panel value="tokens">Anything.</Tabs.Panel>\n</Tabs.Root>',
  },
  tooltip: {
    title: 'Tooltip',
    description: 'A short overlay on hover or focus, labelled through aria-label on its trigger.',
    docs: "import { Tooltip } from '@/components/ui/tooltip';\n\n<Tooltip.Provider>\n  <Tooltip.Root>\n    <Tooltip.Trigger aria-label=\"Copied\" render={<Button />}>Copy</Tooltip.Trigger>\n    <Tooltip.Portal>\n      <Tooltip.Positioner>\n        <Tooltip.Popup>Copied</Tooltip.Popup>\n      </Tooltip.Positioner>\n    </Tooltip.Portal>\n  </Tooltip.Root>\n</Tooltip.Provider>",
  },
  dialog: {
    title: 'Dialog',
    description: 'A modal overlay with a title, a description, and a close slot rendered by the caller.',
    docs: "import { Dialog } from '@/components/ui/dialog';\n\n<Dialog.Root>\n  <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>\n  <Dialog.Portal>\n    <Dialog.Backdrop />\n    <Dialog.Viewport>\n      <Dialog.Popup>\n        <Dialog.Title>Title</Dialog.Title>\n        <Dialog.Description>Description</Dialog.Description>\n        <Dialog.Close render={<Button variant=\"ghost\">Close</Button>} />\n      </Dialog.Popup>\n    </Dialog.Viewport>\n  </Dialog.Portal>\n</Dialog.Root>",
  },
  'setup-vite': {
    title: 'Ultima setup for Vite',
    description:
      'components.json and ultima.vite.ts, the StyleX plugin preconfigured. Universal item: installs without Tailwind and without an existing components.json.',
    docs: 'Ultima on Vite, three steps:\n1. Add "paths": { "@/*": ["./src/*"] } to tsconfig.json and tsconfig.app.json. Without it the CLI writes files into a literal ./@/ directory.\n2. In vite.config.ts, import { ultimaStylex } from \'./ultima.vite.ts\' and put ultimaStylex() in plugins, before the React plugin.\n3. Wrap any global CSS reset in an @layer, or it beats every component style.\n\nThen: npx shadcn add @ultima/button',
    dependencies: ['@stylexjs/stylex'],
    devDependencies: ['@stylexjs/unplugin', 'unplugin'],
  },
  'setup-next': {
    title: 'Ultima setup for Next.js App Router',
    description:
      'components.json, babel.config.js, postcss.config.js, and the @stylex; stylesheet. Universal item: installs without Tailwind and without an existing components.json.',
    docs: "Ultima on Next.js, two steps:\n1. Import './ultima.css' from app/layout.tsx.\n2. Wrap any global CSS reset in an @layer. create-next-app ships `* { padding: 0 }`, which beats every component style.\n\nThen: npx shadcn add @ultima/button",
    dependencies: ['@stylexjs/stylex'],
    devDependencies: ['@stylexjs/babel-plugin', '@stylexjs/postcss-plugin'],
  },
  'tokens-css': {
    title: 'Ultima tokens as CSS',
    description: 'The generated token stylesheet, for a project that cannot run StyleX.',
    docs: "Import './ultima-tokens.css' once, from your root layout or entry stylesheet, then read the tokens with var(--ult-color-surface) and friends. Set data-theme=\"dark\" or \"light\" on <html> to pin a mode; without it the file follows the operating system.",
  },
};
