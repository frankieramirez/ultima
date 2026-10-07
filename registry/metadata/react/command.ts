import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'command',
  kind: 'react',
  title: 'Command',
  description: 'A free-text action palette: an input that filters a list of actions, anchored or inline, on Base UI.',
  contract: 'docs/spec/ultima.md#the-command-set',
  installDocs: 'import { Command } from \'@/components/ui/command\';\n\n<Command.Root items={[\'New file\', \'Open report\', \'Export PDF\']}>\n  <Command.InputGroup>\n    <Command.Input placeholder="Search actions" aria-label="Search actions" />\n    <Command.Clear aria-label="Clear" />\n    <Command.Trigger aria-label="Open actions">\n      <Command.Icon />\n    </Command.Trigger>\n  </Command.InputGroup>\n  <Command.Portal>\n    <Command.Positioner>\n      <Command.Popup>\n        <Command.Empty>No action matches.</Command.Empty>\n        <Command.List>\n          {(action) => <Command.Item key={action} value={action}>{action}</Command.Item>}\n        </Command.List>\n      </Command.Popup>\n    </Command.Positioner>\n  </Command.Portal>\n</Command.Root>\n\nFor the palette, render the list in place: <Command.Root open inline items={...}> and drop Portal, Positioner, and Popup. The filter prop takes your own scorer; without it the default Collator filter runs.',
  primaryExport: 'Command',
  release: 'v0.2',
  order: 15,
  group: 'overlays',
} satisfies ReactDescriptor;
