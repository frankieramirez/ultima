'use client';

import { Chart as ReactChart } from '@tanstack/charts/react';
import { createChartScene } from '@tanstack/charts/scene';

const engine = { ReactChart, createChartScene };

export function Chart() {
  return <svg data-engine={Object.keys(engine).length} />;
}
