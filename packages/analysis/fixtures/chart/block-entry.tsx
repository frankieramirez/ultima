import { lineY } from '@tanstack/charts/line';
import { defineChart } from '@tanstack/charts/scene';

const definition = defineChart({ marks: [lineY([{ day: 'Mon', orders: 3 }], { x: 'day', y: 'orders' })] });

export function Trend() {
  return <p>{definition === undefined ? 'none' : 'set'}</p>;
}
