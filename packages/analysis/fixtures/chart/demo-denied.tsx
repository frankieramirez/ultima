import { Chart } from '@tanstack/charts/react';
import { defineChart } from '@tanstack/charts/scene';

const definition = defineChart({ marks: [] });

export default function ChartDemo() {
  return <Chart definition={definition} />;
}
