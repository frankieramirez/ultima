import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'dialog',
  kind: 'react',
  title: 'Dialog',
  description: 'A modal overlay with a title, a description, and a close slot rendered by the caller.',
  contract: 'docs/spec/ultima.md#the-v0-set',
  installDocs: 'import { Dialog } from \'@/components/ui/dialog\';\n\n<Dialog.Root>\n  <Dialog.Trigger render={<Button />}>Open</Dialog.Trigger>\n  <Dialog.Portal>\n    <Dialog.Backdrop />\n    <Dialog.Viewport>\n      <Dialog.Popup>\n        <Dialog.Title>Title</Dialog.Title>\n        <Dialog.Description>Description</Dialog.Description>\n        <Dialog.Close render={<Button variant="ghost">Close</Button>} />\n      </Dialog.Popup>\n    </Dialog.Viewport>\n  </Dialog.Portal>\n</Dialog.Root>',
  primaryExport: 'Dialog',
  release: 'v0',
  order: 10,
} satisfies ReactDescriptor;
