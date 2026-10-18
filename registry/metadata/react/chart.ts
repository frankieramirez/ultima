import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'chart',
  kind: 'react',
  title: 'Chart',
  description: 'A figure that draws a TanStack Charts definition as SVG painted with tokens.',
  contract: 'docs/spec/ultima.md#chart',
  installDocs:
    "import { barY } from '@tanstack/charts/bar';\nimport { scaleBand } from '@tanstack/charts/scales/band';\nimport { scaleLinear } from '@tanstack/charts/scales/linear';\nimport { defineChart } from '@tanstack/charts/scene';\nimport { Chart } from '@/components/ui/chart';\n\nconst definition = defineChart({\n  marks: [barY(rows, { x: 'day', y: 'requests' })],\n  scales: { x: { scale: scaleBand }, y: { scale: scaleLinear, nice: true } },\n});\n\n<Chart.Root definition={definition} height={240}>\n  <Chart.Caption>Requests per weekday</Chart.Caption>\n  <Chart.Plot />\n</Chart.Root>\n\nThe definition is TanStack's grammar, imported from /scene and one entry per mark and scale. Give Root exactly one of height (CSS pixels) or aspectRatio, and put a Table holding the same rows beside the chart.",
  primaryExport: 'Chart',
  release: 'v0.2',
  order: 24,
  group: 'data-display',
} satisfies ReactDescriptor;
