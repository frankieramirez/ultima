import { Chart } from '@tanstack/charts/react';
import { mountChart } from '@tanstack/charts';

export function Page() {
  return <Chart mount={mountChart} />;
}
