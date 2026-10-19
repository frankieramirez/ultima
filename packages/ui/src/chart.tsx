'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import * as stylex from '@stylexjs/stylex';
import { createChartRuntime } from '@tanstack/charts/runtime';
import { defaultChartTheme, findNearestPoint, viewportInteractionPoints } from '@tanstack/charts/scene';
import type {
  ChartDefinition,
  ChartLayoutOptions,
  ChartPoint,
  ChartScene,
  ChartSize,
  ChartValue,
  SceneArea,
  SceneDot,
  SceneLabel,
  SceneNode,
  ScenePolyline,
  SceneRect,
} from '@tanstack/charts/types';
import { border, color, font, radius, shadow, space, text, z } from '@ultima/tokens/tokens.stylex';
import type { PartProps } from '@ultima/ui/lib/component';
import { visuallyHidden } from '@ultima/ui/lib/visually-hidden';
import {
  createContext,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  use,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

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
    position: 'relative',
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
    ':focus-visible': {
      outline: `${border.focus} solid ${color['--ult-color-border-focus']}`,
      outlineOffset: border.focusOffset,
    },
  },
  /** The active point's ring: the focus color around a page-colored disc, so it reads over any mark. */
  marker: {
    backgroundColor: color['--ult-color-surface'],
    blockSize: `calc(2 * ${space['--ult-space-2']} + ${border.focus})`,
    borderColor: color['--ult-color-border-focus'],
    borderRadius: radius['--ult-radius-full'],
    borderStyle: 'solid',
    borderWidth: border.focus,
    boxSizing: 'border-box',
    inlineSize: `calc(2 * ${space['--ult-space-2']} + ${border.focus})`,
    pointerEvents: 'none',
    position: 'absolute',
    translate: '-50% -50%',
  },
  /** Tooltip's popup, without its motion: its edge sits 12px above the active point, clear of the marker. */
  tooltip: {
    backgroundColor: color['--ult-color-surface-raised'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-sm'],
    borderStyle: 'solid',
    borderWidth: border.fine,
    boxShadow: shadow['--ult-shadow-sm'],
    boxSizing: 'border-box',
    color: color['--ult-color-text'],
    fontFamily: font['--ult-font-sans'],
    fontSize: text['--ult-text-2'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
    marginBlockStart: `calc(-1 * ${space['--ult-space-5']})`,
    maxWidth: `min(calc(${space['--ult-space-12']} * 5), 100%)`,
    paddingBlock: space['--ult-space-2'],
    paddingInline: space['--ult-space-3'],
    pointerEvents: 'none',
    position: 'absolute',
    width: 'max-content',
    zIndex: z.popup,
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
  /** Where the plot sits in Root's padding box, which the tooltip and the ring are positioned in. */
  origin: Origin | null;
  /** The points the keyboard and pointer reach, in `viewportInteractionPoints` order. */
  points: readonly ChartPoint[];
  /** The active point, resolved against the current scene by key. */
  active: ChartPoint | null;
  setActive: (point: ChartPoint | null) => void;
  formatPoint: (point: ChartPoint) => string;
};

type Origin = { left: number; top: number; width: number; height: number };

/** A point's place in Root's padding box, in percent, for an absolutely positioned part. */
function placeOf(origin: Origin, point: ChartPoint) {
  return { left: ((origin.left + point.x) / origin.width) * 100, top: ((origin.top + point.y) / origin.height) * 100 };
}

const ChartContext = createContext<ChartContextValue | null>(null);

function useChartContext(part: string): ChartContextValue {
  const context = use(ChartContext);
  if (!context) throw new Error(`Chart.${part} must be used inside Chart.Root.`);
  return context;
}

type ChartState = {
  /** The compiled scene, or `null` until the plot has been measured. */
  scene: ChartScene | null;
  active: ChartPoint | null;
  setActive: (point: ChartPoint | null) => void;
};

/** The scene and the active point, for a part of the consumer's own, such as a table row that marks the active point. */
function useChart(): ChartState {
  const context = use(ChartContext);
  if (!context) throw new Error('useChart must be used inside Chart.Root.');
  const { scene, active, setActive } = context;
  return { scene, active, setActive };
}

/** Exactly one of `height`, in CSS pixels, or `aspectRatio`, width over height. Neither has a default. */
type ChartSizeProps = { height: number; aspectRatio?: never } | { aspectRatio: number; height?: never };

type ChartRootProps = PartProps<useRender.ComponentProps<'figure'>> &
  ChartSizeProps & {
    /** A `defineChart({ marks })` result. Its `theme`, `tooltip`, `keyboard`, `focusRing` and `svgAnimation` are ignored. */
    definition: ChartDefinition;
    /** The active point, controlled. `null` is no active point. */
    active?: ChartPoint | null;
    defaultActive?: ChartPoint | null;
    onActiveChange?: (point: ChartPoint | null) => void;
    /** The one text for the tooltip and the announcement. Defaults to the series label, then x and y through the axis formats. */
    formatPoint?: (point: ChartPoint) => string;
  };
type ChartCaptionProps = PartProps<useRender.ComponentProps<'figcaption'>>;
type ChartPlotProps = PartProps<Omit<ComponentProps<'svg'>, 'children'>>;
type ChartTooltipProps = PartProps<useRender.ComponentProps<'div'>>;
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

/** The default `formatPoint`: the series label when the mark has color groups, then x and y through the axis formats. */
function pointFormatter(definition: ChartDefinition, scene: ChartScene | null) {
  const spec = 'chart' in definition ? scene && definition.chart({ width: scene.width, height: scene.height, defaultTheme: defaultChartTheme }) : definition;
  const formatOf = (id: string) => {
    const axis = spec?.scales[id]?.axis;
    return (axis && axis.ticks && axis.ticks.format) || String;
  };
  const x = formatOf('x');
  const y = formatOf('y');
  return (point: ChartPoint) =>
    [...(point.group === null ? [] : [point.groupLabel]), x(point.xValue as ChartValue), y(point.yValue as ChartValue)].join(', ');
}

function Root({ definition, height, aspectRatio, active, defaultActive = null, onActiveChange, formatPoint, ref, render, style, ...props }: ChartRootProps) {
  const captionId = useId();
  const [runtime] = useState(() => createChartRuntime());
  const [figure, setFigure] = useState<Element | null>(null);
  const [plot, setPlot] = useState<SVGSVGElement | null>(null);
  const [frame, setFrame] = useState<{ size: ChartSize; layout: ChartLayoutOptions } | null>(null);
  const [origin, setOrigin] = useState<Origin | null>(null);

  useLayoutEffect(() => {
    if (!plot || !figure) return;
    const layout = measurer(plot);
    const measure = () => {
      const { width, height, left, top } = plot.getBoundingClientRect();
      if (width > 0 && height > 0) setFrame((last) => (last?.layout === layout && last.size.width === width && last.size.height === height ? last : { size: { width, height }, layout }));
      const outer = figure.getBoundingClientRect();
      const next = { left: left - outer.left - figure.clientLeft, top: top - outer.top - figure.clientTop, width: figure.clientWidth, height: figure.clientHeight };
      setOrigin((last) => (last && last.left === next.left && last.top === next.top && last.width === next.width && last.height === next.height ? last : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(plot);
    observer.observe(figure);
    return () => observer.disconnect();
  }, [plot, figure]);

  const scene = useMemo(() => (frame ? runtime.render(definition, frame.size, frame.layout) : null), [runtime, definition, frame]);
  const points = useMemo(() => (scene ? viewportInteractionPoints(scene) : []), [scene]);
  const format = useMemo(() => formatPoint ?? pointFormatter(definition, scene), [formatPoint, definition, scene]);

  const [uncontrolled, setUncontrolled] = useState(defaultActive);
  const chosen = active === undefined ? uncontrolled : active;
  const current = (chosen && points.find((point) => point.key === chosen.key)) || null;
  const setActive = useCallback(
    (point: ChartPoint | null) => {
      if ((point?.key ?? null) === (current?.key ?? null)) return;
      setUncontrolled(point);
      onActiveChange?.(point);
    },
    [current, onActiveChange],
  );

  const element = useRender({
    defaultTagName: 'figure',
    ref: ref ? [ref, setFigure] : setFigure,
    render,
    props: { 'aria-labelledby': captionId, ...props, ...stylex.props(styles.root, style) },
  });
  return (
    <ChartContext value={{ active: current, aspectRatio, captionId, formatPoint: format, height, origin, points, scene, setActive, setPlot }}>
      {element}
    </ChartContext>
  );
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

/** Points grouped into series, one per mark and color group, in order of first appearance, each in x order. */
function seriesOf(points: readonly ChartPoint[]) {
  const series = new Map<string, ChartPoint[]>();
  for (const point of points) {
    const id = `${point.markId}\u0000${String(point.group)}`;
    const list = series.get(id);
    if (list) list.push(point);
    else series.set(id, [point]);
  }
  return [...series.values()].map((list) => list.sort((a, b) => a.x - b.x));
}

/** The point a key moves to, or `undefined` when the key is not one the plot handles. */
function pointAfter(points: readonly ChartPoint[], current: ChartPoint | null, key: string): ChartPoint | null | undefined {
  if (key === 'Escape') return current ? null : undefined;
  const series = seriesOf(points);
  const index = current ? series.findIndex((list) => list.includes(current)) : 0;
  const list = series[index];
  if (!list) return undefined;
  const at = current ? list.indexOf(current) : -1;
  switch (key) {
    case 'ArrowRight':
      return list[Math.min(at + 1, list.length - 1)];
    case 'ArrowLeft':
      return list[Math.max(at - 1, 0)];
    case 'Home':
      return list[0];
    case 'End':
      return list.at(-1);
    case 'ArrowUp':
    case 'ArrowDown': {
      if (!current) return list[0];
      const next = series[index + (key === 'ArrowUp' ? 1 : -1)];
      return next ? next.reduce((best, point) => (Math.abs(point.x - current.x) < Math.abs(best.x - current.x) ? point : best)) : current;
    }
    default:
      return undefined;
  }
}

const WORD_JOINER = '\u2060';

function Plot({ ref, style, ...props }: ChartPlotProps) {
  const { active, aspectRatio, captionId, formatPoint, height, origin, points, scene, setActive, setPlot } = useChartContext('Plot');
  const plotRef = useCallback(
    (plot: SVGSVGElement | null) => {
      setPlot(plot);
      if (typeof ref === 'function') ref(plot);
      else if (ref) ref.current = plot;
    },
    [ref, setPlot],
  );

  // Identical consecutive text is not a change to a live region, so a repeat gains a Word Joiner.
  const said = active ? formatPoint(active) : '';
  const [status, setStatus] = useState({ key: null as string | null, text: '' });
  if (status.key !== (active?.key ?? null) || status.text.replace(WORD_JOINER, '') !== said) {
    setStatus({ key: active?.key ?? null, text: said && said === status.text ? said + WORD_JOINER : said });
  }

  const interaction = {
    tabIndex: 0,
    onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
      const next = pointAfter(points, active, event.key);
      if (next === undefined) return;
      event.preventDefault();
      setActive(next);
    },
    onPointerMove(event: PointerEvent<SVGSVGElement>) {
      if (!scene) return;
      const box = event.currentTarget.getBoundingClientRect();
      setActive(findNearestPoint(scene, event.clientX - box.left, event.clientY - box.top, undefined, points));
    },
    onPointerLeave: () => setActive(null),
    onBlur: () => setActive(null),
  };
  const { style: injected, ...stylexProps } = stylex.props(styles.plot, style);
  const { style: ringStyle, ...ringProps } = stylex.props(styles.marker);
  const ring = active && origin ? placeOf(origin, active) : null;
  return (
    <>
      <svg
        {...mergeProps<'svg'>(interaction, props)}
        ref={plotRef}
        aria-labelledby={captionId}
        aria-roledescription="chart"
        role="img"
        {...stylexProps}
        style={{ ...injected, aspectRatio, height }}
      >
        {scene?.nodes.map((node) => draw(scene, node))}
      </svg>
      {ring && <span aria-hidden="true" {...ringProps} style={{ ...ringStyle, left: `${ring.left}%`, top: `${ring.top}%` }} />}
      <span aria-atomic="true" role="status" {...stylex.props(visuallyHidden)}>
        {status.text}
      </span>
    </>
  );
}

/** The visual readout of the active point, `aria-hidden` because the plot's status region speaks it. */
function Tooltip({ ref, render, style, ...props }: ChartTooltipProps) {
  const { active, formatPoint, origin, scene } = useChartContext('Tooltip');
  // Left-aligned on the point at the plot's start, right-aligned at its end, so it stays within the plot's width.
  const place = active && origin && scene ? { ...placeOf(origin, active), shift: (active.x / scene.width) * -100 } : { left: 0, top: 0, shift: 0 };

  const { style: injected, ...stylexProps } = stylex.props(styles.tooltip, style);
  return useRender({
    defaultTagName: 'div',
    enabled: Boolean(active),
    ref,
    render,
    props: {
      'aria-hidden': true,
      children: active && formatPoint(active),
      ...props,
      ...stylexProps,
      style: { ...injected, left: `${place.left}%`, top: `${place.top}%`, translate: `${place.shift}% -100%` },
    },
  });
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
  Tooltip,
  Legend,
};

export { Chart, useChart, type ChartRootProps, type ChartCaptionProps, type ChartPlotProps, type ChartTooltipProps, type ChartLegendProps, type ChartState };
