import * as stylex from '@stylexjs/stylex';
import { border, color, font } from '@ultima/tokens/tokens.stylex';
import { Badge } from '@ultima/ui';
import { useLayoutEffect, useRef, useState } from 'react';

import { breakpoints } from './breakpoints.stylex';

/** A rectangle in the preview's own pixels, its origin at the preview's top left. */
export type AnatomyBox = { x: number; y: number; width: number; height: number };

export type AnatomySize = { width: number; height: number };

/** One labelled target: its full label, the short form shown below `WIDE`, and its box, or `null` when not shown. */
export type AnatomyEntry = { key: string; label: string; short: string; box: AnatomyBox | null };

const intersects = (a: AnatomyBox, b: AnatomyBox) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const inside = (label: AnatomyBox, preview: AnatomySize) =>
  label.x >= 0 && label.y >= 0 && label.x + label.width <= preview.width && label.y + label.height <= preview.height;

/**
 * Where each label goes, in the order given, which is the targets' document order. A label tries
 * outside above its box's start corner, inside the top start corner, inside the top end corner, then
 * outside below the start corner, and takes the first spot inside the preview that hits no label
 * already placed. Failing all four, it stacks inside its box below the last label it collided with.
 * Pure: the same input always gives the same placement.
 */
export function placeLabels(targets: { box: AnatomyBox; size: AnatomySize }[], preview: AnatomySize): AnatomyBox[] {
  const placed: AnatomyBox[] = [];
  for (const { box, size } of targets) {
    const at = (x: number, y: number): AnatomyBox => ({ x, y, ...size });
    const spots = [
      at(box.x, box.y - size.height),
      at(box.x, box.y),
      at(box.x + box.width - size.width, box.y),
      at(box.x, box.y + box.height),
    ];
    let spot = spots.find((candidate) => inside(candidate, preview) && !placed.some((label) => intersects(candidate, label)));
    if (!spot) {
      const clamp = (value: number, room: number) => Math.max(0, Math.min(value, room));
      spot = at(clamp(box.x, preview.width - size.width), clamp(box.y, preview.height - size.height));
      for (let hit = placed.find((label) => intersects(spot as AnatomyBox, label)); hit; ) {
        spot = at(spot.x, hit.y + hit.height);
        hit = placed.find((label) => intersects(spot as AnatomyBox, label));
      }
    }
    placed.push(spot);
  }
  return placed;
}

const WIDE_REM = Number(/min-width:\s*([\d.]+)rem/.exec(breakpoints.WIDE)?.[1]);

export function isWide(width: number): boolean {
  return width >= WIDE_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

const styles = stylex.create({
  overlay: {
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    position: 'absolute',
  },
  scrim: {
    backgroundColor: color['--ult-color-surface-overlay'],
    inset: 0,
    position: 'absolute',
  },
  outline: {
    borderColor: color['--ult-color-highlight-border'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    boxSizing: 'border-box',
    position: 'absolute',
  },
  emphasised: { borderWidth: border.focus },
  label: {
    fontFamily: font['--ult-font-mono'],
    insetBlockStart: 0,
    insetInlineStart: 0,
    position: 'absolute',
    whiteSpace: 'nowrap',
  },
  unplaced: { visibility: 'hidden' },
});

const geometry = stylex.create({
  box: (box: AnatomyBox) => ({
    height: `${box.height}px`,
    left: `${box.x}px`,
    top: `${box.y}px`,
    width: `${box.width}px`,
  }),
  at: (box: AnatomyBox) => ({ transform: `translate(${box.x}px, ${box.y}px)` }),
});

/**
 * The drawing over a preview: a scrim, a hairline outline per shown entry, and a Badge label on each,
 * placed by `placeLabels`. It knows nothing of the page it is on. The whole drawing is `aria-hidden`:
 * the caller's legend says what it shows. `emphasis` thickens one outline and raises its label.
 */
export function AnatomyOverlay({
  entries,
  size,
  labelled = true,
  emphasis = null,
  onPlace,
}: {
  entries: AnatomyEntry[];
  size: AnatomySize;
  labelled?: boolean;
  emphasis?: string | null;
  /** Called with each placement, so a caller whose preview can grow makes room for a stack that runs past it. */
  onPlace?: (labels: AnatomyBox[]) => void;
}) {
  const shown = entries.filter((entry): entry is AnatomyEntry & { box: AnatomyBox } => entry.box !== null);
  const wide = isWide(size.width);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const [placement, setPlacement] = useState<AnatomyBox[] | null>(null);
  // Compared by value: the caller builds fresh entries on every measurement.
  const layout = JSON.stringify([shown, size, wide, labelled]);

  useLayoutEffect(() => {
    if (!labelled) return;
    const targets = shown.map((entry, index) => {
      const node = labels.current[index];
      return { box: entry.box, size: { width: node?.offsetWidth ?? 0, height: node?.offsetHeight ?? 0 } };
    });
    const placed = placeLabels(targets, size);
    setPlacement(placed);
    onPlace?.(placed);
  }, [layout]);

  const order = shown.map((_, index) => index);
  const raised = shown.findIndex((entry) => entry.key === emphasis);
  if (raised >= 0) order.push(...order.splice(raised, 1));

  return (
    <div aria-hidden data-anatomy-overlay {...stylex.props(styles.overlay)}>
      <div {...stylex.props(styles.scrim)} />
      {shown.map((entry) => (
        <div
          key={entry.key}
          data-anatomy-outline={entry.key}
          {...stylex.props(styles.outline, entry.key === emphasis && styles.emphasised, geometry.box(entry.box))}
        />
      ))}
      {labelled &&
        order.map((index) => {
          const entry = shown[index] as (typeof shown)[number];
          const spot = placement?.[index];
          return (
            <Badge
              key={entry.key}
              ref={(node) => {
                labels.current[index] = node;
              }}
              data-anatomy-label={entry.key}
              tone="highlight"
              variant={entry.key === emphasis ? 'solid' : 'subtle'}
              style={[styles.label, spot ? geometry.at(spot) : styles.unplaced]}
            >
              {wide ? entry.label : entry.short}
            </Badge>
          );
        })}
    </div>
  );
}
