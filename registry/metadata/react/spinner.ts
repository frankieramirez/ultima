import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'spinner',
  kind: 'react',
  title: 'Spinner',
  description: 'A looping loading mark drawn in CSS, sized and colored by its surrounding text.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: "import { Spinner } from '@/components/ui/spinner';\n\n<Spinner />\n\nThe mark is aria-hidden. Put aria-busy on the container being waited on, and announce the wait through a live region rather than the glyph.",
  primaryExport: 'Spinner',
  release: 'v0.1',
  order: 13,
} satisfies ReactDescriptor;
