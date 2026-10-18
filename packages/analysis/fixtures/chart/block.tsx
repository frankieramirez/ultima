import { barY } from '@tanstack/charts/bar';
import { defineChart } from '@tanstack/charts/scene';
import { Chart } from '@ultima/ui/chart';

const definition = defineChart({ marks: [barY([{ day: 'Mon', orders: 3 }], { x: 'day', y: 'orders' })] });

export function Region() {
  return <Chart data-definition={definition === undefined ? 'none' : 'set'} />;
}
