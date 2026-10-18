import { barY } from '@tanstack/charts/bar';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { defineChart } from '@tanstack/charts/scene';

const definition = defineChart({ marks: [barY([{ day: 'Mon', orders: 3 }], { x: 'day', y: 'orders' })], y: { scale: scaleLinear } });

export default function ChartDemo() {
  return <p>{definition === undefined ? 'none' : 'set'}</p>;
}
