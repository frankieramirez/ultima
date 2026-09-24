import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'progress',
  kind: 'react',
  title: 'Progress',
  description: 'A task completion bar in five tones, determinate or indeterminate, on Base UI.',
  contract: 'docs/spec/ultima.md#the-v01-set',
  installDocs: 'import { Progress } from \'@/components/ui/progress\';\n\n<Progress.Root value={64} tone="highlight">\n  <Progress.Label>Uploading</Progress.Label>\n  <Progress.Track>\n    <Progress.Indicator />\n  </Progress.Track>\n  <Progress.Value />\n</Progress.Root>\n\nPass value={null} for an indeterminate bar.',
  primaryExport: 'Progress',
  release: 'v0.1',
  order: 11,
  replaces: { elements: ['progress'], roles: ['progressbar'] },
} satisfies ReactDescriptor;
