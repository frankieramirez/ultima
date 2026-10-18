'use client';

import * as stylex from '@stylexjs/stylex';
import { barY } from '@tanstack/charts/bar';
import { createChartRuntime } from '@tanstack/charts/runtime';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { createChartScene, defineChart } from '@tanstack/charts/scene';
import type { ChartScene } from '@tanstack/charts/types';
import type { PartProps } from '@ultima/ui/lib/component';
import type { ComponentProps } from 'react';

const styles = stylex.create({
  root: {
    display: 'block',
  },
});

const engine = { barY, createChartRuntime, scaleBand, scaleLinear, createChartScene, defineChart };

type ChartProps = PartProps<ComponentProps<'svg'>>;

function Chart({ style, ...props }: ChartProps) {
  const scene: ChartScene | undefined = undefined;
  return <svg {...props} data-engine={Object.keys(engine).length} data-scene={scene === undefined ? 'none' : 'drawn'} {...stylex.props(styles.root, style)} />;
}

export { Chart, type ChartProps };
