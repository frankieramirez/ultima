'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { createChartRuntime } from '@tanstack/charts/runtime';
import type { ChartDefinition, ChartLayoutOptions, ChartScene, ChartSize, SceneArea, SceneDot, SceneLabel, SceneNode, ScenePolyline, SceneRect } from '@tanstack/charts/types';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { createContext, type ComponentProps, type ReactNode, use, useCallback, useId, useLayoutEffect, useMemo, useState } from 'react';

const styles = stylex.create({
  root: {
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    fontFamily: font['--ult-font-sans'],
    gap: space['--ult-space-3'],
    margin: 0,
    minWidth: 0,
  },
  caption: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
  },
  /** Every label in the scene is measured and painted at this one size. */
  plot: {
    display: 'block',
    fontFamily: 'inherit',
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-regular'],
    inlineSize: '100%',
    overflow: 'visible',
  },
  rule: {
    fill: 'none',
    stroke: color['--ult-color-border'],
    strokeWidth: border.hairline,
  },
  tick: {
    fill: color['--ult-color-text-subtle'],
  },
  label: {
    fill: color['--ult-color-text-muted'],
  },
  /** Bars, bands and dots fill solid in their series color: no mark is translucent. */
  mark: {
    fill: 'currentColor',
  },
  /** A round join keeps a sharp turn on its data point, where a miter would overshoot it. */
  line: {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinejoin: 'round',
    strokeWidth: border.focus,
  },
  legend: {
    color: color['--ult-color-text-muted'],
    columnGap: space['--ult-space-6'],
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: text['--ult-text-3'],
    fontWeight: font['--ult-font-weight-regular'],
    lineHeight: font['--ult-font-leading-snug'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
    rowGap: space['--ult-space-2'],
  },
  legendItem: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
  },
  swatch: {
    backgroundColor: 'currentColor',
    blockSize: space['--ult-space-4'],
    borderRadius: radius['--ult-radius-xs'],
    flexShrink: 0,
    inlineSize: space['--ult-space-4'],
  },
});

/** Marks and swatches take the series tokens by their group's position in the color domain, wrapping after six. */
const series = stylex.create({
  one: { color: color['--ult-color-series-1'] },
  two: { color: color['--ult-color-series-2'] },
  three: { color: color['--ult-color-series-3'] },
  four: { color: color['--ult-color-series-4'] },
  five: { color: color['--ult-color-series-5'] },
  six: { color: color['--ult-color-series-6'] },
});
const SERIES = [series.one, series.two, series.three, series.four, series.five, series.six];

type ChartContextValue = {
  captionId: string;
  scene: ChartScene | null;
  height: number | undefined;
  aspectRatio: number | undefined;
  setPlot: (plot: SVGSVGElement | null) => void;
};

const ChartContext = createContext<ChartContextValue | null>(null);

function useChartContext(part: string): ChartContextValue {
  const context = use(ChartContext);
  if (!context) throw new Error(`Chart.${part} must be used inside Chart.Root.`);
  return context;
}

/** Exactly one of `height`, in CSS pixels, or `aspectRatio`, width over height. Neither has a default. */
type ChartSizeProps = { height: number; aspectRatio?: never } | { aspectRatio: number; height?: never };

type ChartRootProps = PartProps<useRender.ComponentProps<'figure'>> &
  ChartSizeProps & {
    /** A `defineChart({ marks })` result. Its `theme`, `tooltip`, `keyboard`, `focusRing` and `svgAnimation` are ignored. */
    definition: ChartDefinition;
  };
type ChartCaptionProps = PartProps<useRender.ComponentProps<'figcaption'>>;
type ChartPlotProps = PartProps<Omit<ComponentProps<'svg'>, 'children'>>;
type ChartLegendProps = PartProps<Omit<useRender.ComponentProps<'ul'>, 'children'>>;

/** Text layout with the plot's own computed font, so the scene's label boxes match the labels painted. */
function measurer(plot: SVGSVGElement): ChartLayoutOptions {
  const computed = getComputedStyle(plot);
  const context = plot.ownerDocument.createElement('canvas').getContext('2d');
  if (!context) return {};
  context.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
  return {
    measureText(label, options) {
      context.textAlign = options.anchor === 'middle' ? 'center' : options.anchor;
      context.textBaseline = options.baseline === 'auto' ? 'alphabetic' : options.baseline;
      const metrics = context.measureText(label);
      return {
        x: -metrics.actualBoundingBoxLeft,
        y: -metrics.actualBoundingBoxAscent,
        width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
        height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
      };
    },
  };
}

function Root({ definition, height, aspectRatio, ref, render, style, ...props }: ChartRootProps) {
  const captionId = useId();
  const [runtime] = useState(() => createChartRuntime());
  const [plot, setPlot] = useState<SVGSVGElement | null>(null);
  const [frame, setFrame] = useState<{ size: ChartSize; layout: ChartLayoutOptions } | null>(null);

  useLayoutEffect(() => {
    if (!plot) return;
    const layout = measurer(plot);
    const measure = ({ width, height }: { width: number; height: number }) => {
      if (width > 0 && height > 0) setFrame((last) => (last?.layout === layout && last.size.width === width && last.size.height === height ? last : { size: { width, height }, layout }));
    };
    measure(plot.getBoundingClientRect());
    const observer = new ResizeObserver(([entry]) => entry && measure(entry.contentRect));
    observer.observe(plot);
    return () => observer.disconnect();
  }, [plot]);

  const scene = useMemo(() => (frame ? runtime.render(definition, frame.size, frame.layout) : null), [runtime, definition, frame]);
  const element = useRender({
    defaultTagName: 'figure',
    ref,
    render,
    props: { 'aria-labelledby': captionId, ...props, ...stylex.props(styles.root, style) },
  });
  return <ChartContext value={{ aspectRatio, captionId, height, scene, setPlot }}>{element}</ChartContext>;
}

function Caption({ ref, render, style, ...props }: ChartCaptionProps) {
  const { captionId } = useChartContext('Caption');
  return useRender({ defaultTagName: 'figcaption', ref, render, props: { id: captionId, ...props, ...stylex.props(styles.caption, style) } });
}

/** The scale that drew a label as one of its ticks, if any: band ticks are category names, the rest values. */
function tickScale(scene: ChartScene, label: SceneLabel) {
  return Object.values(scene.scales).find((scale) =>
    scale.ticks.some((tick) => tick.label === label.text && (Math.abs(tick.position - label.x) < 0.5 || Math.abs(tick.position - label.y) < 0.5)),
  );
}

function labelPaint(scene: ChartScene, label: SceneLabel) {
  const scale = tickScale(scene, label);
  return scale && scale.type !== 'band' ? styles.tick : styles.label;
}

/**
 * A group's place in the color domain, read as the slot its color takes in the ordinal range, which
 * follows the domain: the color string is matched, never painted.
 */
function seriesPaint(scene: ChartScene, groupColor: string | undefined) {
  const position = groupColor ? scene.colors.range.indexOf(groupColor) : -1;
  return SERIES[Math.max(position, 0) % SERIES.length];
}

/** A bar's point, the first of a line's or a band's points, or the point a dot marks. */
function markPaint(scene: ChartScene, mark: SceneRect | ScenePolyline | SceneArea | SceneDot) {
  const point = mark.interaction?.point ?? mark.interaction?.points?.[0] ?? mark.pointOwner;
  return seriesPaint(scene, point?.color);
}

/** Draws one scene node from its geometry alone: the scene's paint, class names and focus layers are not Ultima's. */
function draw(scene: ChartScene, node: SceneNode): ReactNode {
  switch (node.kind) {
    case 'group':
      return node.focus ? null : <g key={node.key}>{node.children.map((child) => draw(scene, child))}</g>;
    case 'rule':
      return <line key={node.key} x1={node.x1} x2={node.x2} y1={node.y1} y2={node.y2} {...stylex.props(styles.rule)} />;
    case 'polyline':
      return <polyline key={node.key} points={node.points.join(' ')} {...stylex.props(styles.line, markPaint(scene, node))} />;
    case 'area':
      return <polygon key={node.key} points={node.points.join(' ')} {...stylex.props(styles.mark, markPaint(scene, node))} />;
    case 'dot':
      return <circle key={node.key} cx={node.x} cy={node.y} r={node.radius} {...stylex.props(styles.mark, markPaint(scene, node))} />;
    case 'rect':
      return <rect key={node.key} height={node.height} width={node.width} x={node.x} y={node.y} {...stylex.props(styles.mark, markPaint(scene, node))} />;
    case 'label':
      return (
        <text
          key={node.key}
          dominantBaseline={node.baseline}
          textAnchor={node.anchor}
          transform={node.rotate ? `rotate(${node.rotate} ${node.x} ${node.y})` : undefined}
          x={node.x}
          y={node.y}
          {...stylex.props(labelPaint(scene, node))}
        >
          {node.text}
        </text>
      );
    default:
      return null;
  }
}

function Plot({ ref, style, ...props }: ChartPlotProps) {
  const { aspectRatio, captionId, height, scene, setPlot } = useChartContext('Plot');
  const plotRef = useCallback(
    (plot: SVGSVGElement | null) => {
      setPlot(plot);
      if (typeof ref === 'function') ref(plot);
      else if (ref) ref.current = plot;
    },
    [ref, setPlot],
  );
  const { style: injected, ...stylexProps } = stylex.props(styles.plot, style);
  return (
    <svg
      {...props}
      ref={plotRef}
      aria-labelledby={captionId}
      aria-roledescription="chart"
      role="img"
      {...stylexProps}
      style={{ ...injected, aspectRatio, height }}
    >
      {scene?.nodes.map((node) => draw(scene, node))}
    </svg>
  );
}

/** One swatch and text label per color group, in domain order. Not interactive. */
function Legend({ ref, render, style, ...props }: ChartLegendProps) {
  const { scene } = useChartContext('Legend');
  const items = scene?.colors.domain.map((group) => (
    <li key={group} {...stylex.props(styles.legendItem)}>
      <span aria-hidden="true" {...stylex.props(styles.swatch, seriesPaint(scene, scene.colors.map(group)))} />
      {group}
    </li>
  ));
  return useRender({ defaultTagName: 'ul', ref, render, props: { ...props, children: items, ...stylex.props(styles.legend, style) } });
}

const Chart = {
  Root,
  Caption,
  Plot,
  Legend,
};

export { Chart, type ChartRootProps, type ChartCaptionProps, type ChartPlotProps, type ChartLegendProps };
