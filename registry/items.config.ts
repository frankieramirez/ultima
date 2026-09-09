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
  code: {
    title: 'Code',
    description: 'Monospaced code, inline in a sentence or as a block.',
    docs: "import { Code } from '@/components/ui/code';\n\n<Code>npx shadcn add @ultima/button</Code>\n<Code variant=\"block\">{source}</Code>",
  },
  stat: {
    title: 'Stat',
    description: 'A single number with its label, for dashboards and summaries.',
    docs: "import { Stat } from '@/components/ui/stat';\n\n<Stat.Root>\n  <Stat.Label>Tokens</Stat.Label>\n  <Stat.Value>95</Stat.Value>\n</Stat.Root>",
  },
  table: {
    title: 'Table',
    description: 'A data table as native table parts, with an optional caption.',
    docs: "import { Table } from '@/components/ui/table';\n\n<Table.Root>\n  <Table.Caption>Latency by region</Table.Caption>\n  <Table.Head>\n    <Table.Row>\n      <Table.HeadCell>Region</Table.HeadCell>\n    </Table.Row>\n  </Table.Head>\n  <Table.Body>\n    <Table.Row>\n      <Table.Cell>us-east-1</Table.Cell>\n    </Table.Row>\n  </Table.Body>\n</Table.Root>",
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
