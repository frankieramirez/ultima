import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'toast',
  kind: 'react',
  title: 'Toast',
  description: 'A stacked notification in six tones, queued from a manager, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: "import { Button } from '@/components/ui/button';\nimport { Toast } from '@/components/ui/toast';\n\nMount Provider, Portal, and Viewport once; they stay mounted when the stack is empty.\n\n<Toast.Provider>\n  <Toast.Portal>\n    <Toast.Viewport>{/* map Toast.useToastManager().toasts to Toast.Root */}</Toast.Viewport>\n  </Toast.Portal>\n</Toast.Provider>\n\nToast.useToastManager().add({ title: 'Report exported', type: 'success' });",
  primaryExport: 'Toast',
  release: 'v0.1',
  order: 10,
  group: 'overlays',
} satisfies ReactDescriptor;
