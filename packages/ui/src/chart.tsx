'use client';

import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { createChartRuntime } from '@tanstack/charts/runtime';
import type { ChartDefinition, ChartLayoutOptions, ChartScene, ChartSize, SceneLabel, SceneNode, SceneRect } from '@tanstack/charts/types';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
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
});

/** Marks take the series tokens by their group's position in the color domain, wrapping after six. */
const series = stylex.create({
  one: { fill: color['--ult-color-series-1'] },
  two: { fill: color['--ult-color-series-2'] },
  three: { fill: color['--ult-color-series-3'] },
  four: { fill: color['--ult-color-series-4'] },
  five: { fill: color['--ult-color-series-5'] },
  six: { fill: color['--ult-color-series-6'] },
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

/** Text layout with the plot's own computed font, so the scene's label boxes match the labels painted. */
function measurer(plot: SVGSVGElement): ChartLayoutOptions {
  const computed = getComputedStyle(plot);
  const context = plot.ownerDocument.createElement('canvas').getContext('2d');
  if (!context) return { typography: { fontFamily: computed.fontFamily } };
  context.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
  return {
    typography: { fontFamily: computed.fontFamily },
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
 * The mark's place in the color domain, read as the slot its point's color takes in the ordinal range,
 * which follows the domain: the color string is matched, never painted.
 */
function markPaint(scene: ChartScene, mark: SceneRect) {
  const point = mark.interaction?.point ?? mark.interaction?.points?.[0] ?? mark.pointOwner;
  const position = point ? scene.colors.range.indexOf(point.color) : -1;
  return SERIES[Math.max(position, 0) % SERIES.length];
}

/** Draws one scene node from its geometry alone: the scene's paint, class names and focus layers are not Ultima's. */
function draw(scene: ChartScene, node: SceneNode, clipPrefix: string): ReactNode {
  switch (node.kind) {
    case 'group': {
      if (node.focus) return null;
      const clipId = node.clip && `${clipPrefix}${node.key}`;
      const translate = node.translateX || node.translateY ? `translate(${node.translateX ?? 0} ${node.translateY ?? 0})` : undefined;
      return (
        <g key={node.key} clipPath={clipId && `url(#${CSS.escape(clipId)})`} transform={translate}>
          {node.clip ? (
            <clipPath id={clipId}>
              <rect height={node.clip.height} width={node.clip.width} x={node.clip.x} y={node.clip.y} />
            </clipPath>
          ) : null}
          {node.children.map((child) => draw(scene, child, clipPrefix))}
        </g>
      );
    }
    case 'rule':
      return <line key={node.key} x1={node.x1} x2={node.x2} y1={node.y1} y2={node.y2} {...stylex.props(styles.rule)} />;
    case 'rect':
      return <rect key={node.key} height={node.height} width={node.width} x={node.x} y={node.y} {...stylex.props(markPaint(scene, node))} />;
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
  const clipPrefix = useId();
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
      {scene?.nodes.map((node) => draw(scene, node, clipPrefix))}
    </svg>
  );
}

const Chart = {
  Root,
  Caption,
  Plot,
};

export { Chart, type ChartRootProps, type ChartCaptionProps, type ChartPlotProps };
