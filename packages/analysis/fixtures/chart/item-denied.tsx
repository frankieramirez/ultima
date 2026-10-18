'use client';

import { mountChart } from '@tanstack/charts';
import { Chart as ReactChart } from '@tanstack/charts/react';
import { createTooltip } from '@tanstack/charts/tooltip';
import { createChartScene } from '@tanstack/charts/scene';

const engine = { mountChart, ReactChart, createTooltip, createChartScene };

function Chart() {
  return <svg data-engine={Object.keys(engine).length} />;
}

export { Chart };
