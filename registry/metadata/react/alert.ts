import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'alert',
  kind: 'react',
  title: 'Alert',
  description: 'A static in-page callout in six tones.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: 'import { Alert } from \'@/components/ui/alert\';\n\n<Alert.Root tone="warning">\n  <Alert.Title>Disk almost full</Alert.Title>\n  <Alert.Description>87% of 500 GB used.</Alert.Description>\n</Alert.Root>',
  primaryExport: 'Alert',
  release: 'v0.1',
  order: 8,
} satisfies ReactDescriptor;
