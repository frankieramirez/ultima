import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'alert-dialog',
  kind: 'react',
  title: 'Alert Dialog',
  description: 'A confirmation overlay that Escape closes and a backdrop click does not, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: 'import { AlertDialog } from \'@/components/ui/alert-dialog\';\nimport { Button } from \'@/components/ui/button\';\n\n<AlertDialog.Root>\n  <AlertDialog.Trigger render={<Button />}>Delete report</AlertDialog.Trigger>\n  <AlertDialog.Portal>\n    <AlertDialog.Backdrop />\n    <AlertDialog.Viewport>\n      <AlertDialog.Popup>\n        <AlertDialog.Title>Delete report</AlertDialog.Title>\n        <AlertDialog.Description>This cannot be undone.</AlertDialog.Description>\n        <AlertDialog.Close render={<Button variant="ghost" />}>Cancel</AlertDialog.Close>\n        <AlertDialog.Close render={<Button tone="danger" />}>Delete</AlertDialog.Close>\n      </AlertDialog.Popup>\n    </AlertDialog.Viewport>\n  </AlertDialog.Portal>\n</AlertDialog.Root>',
  primaryExport: 'AlertDialog',
  release: 'v0.1',
  order: 9,
  replaces: { roles: ['alertdialog'] },
} satisfies ReactDescriptor;
