import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Separator, Switch } from '@ultima/ui';
import { useEffect, useRef, useState, type ComponentType } from 'react';

import { AnatomyOverlay, type AnatomyBox, type AnatomyEntry, type AnatomySize } from './anatomy';
import { breakpoints } from './breakpoints.stylex';
import { ThemeBoundary } from './theme-boundary';

const styles = stylex.create({
  view: { position: 'relative' },
  stage: {
    alignItems: 'center',
    containerType: 'inline-size',
    display: 'flex',
    isolation: 'isolate',
    justifyContent: 'center',
    minBlockSize: { default: '7.5rem', [breakpoints.WIDE]: '11.25rem' },
    overflowX: 'auto',
    padding: { default: space['--ult-space-6'], [breakpoints.WIDE]: space['--ult-space-9'] },
  },
  stageInner: { minInlineSize: 'fit-content' },
  reach: (height: number) => ({ minBlockSize: `${height}px` }),
  controls: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-5'],
    paddingInline: { default: space['--ult-space-5'], [breakpoints.WIDE]: space['--ult-space-6'] },
  },
  toggle: {
    alignItems: 'center',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-4'],
  },
  legend: {
    columnGap: space['--ult-space-6'],
    display: 'flex',
    flexWrap: 'wrap',
    listStyle: 'none',
    margin: 0,
    padding: 0,
    rowGap: space['--ult-space-3'],
  },
  entry: {
    alignItems: 'baseline',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
    gap: space['--ult-space-3'],
  },
  active: { color: color['--ult-color-text'] },
  number: { color: color['--ult-color-text-subtle'] },
  absent: { color: color['--ult-color-text-subtle'], fontFamily: font['--ult-font-sans'] },
});

type Measured = { size: AnatomySize; parts: [part: string, box: AnatomyBox | null][] };

/** Frames to wait for a popup Base UI has yet to position, which it first places past the stage's foot. */
const SETTLE_FRAMES = 5;

/** `null` when `settling` and a part starts past the stage's foot, so the caller tries again next frame. */
function measure(stage: HTMLElement, item: string, settling: boolean): Measured | null {
  const origin = stage.getBoundingClientRect();
  const parts = new Map<string, AnatomyBox | null>();
  for (const node of stage.querySelectorAll<HTMLElement>(`[data-anatomy-item="${item}"]`)) {
    const part = node.dataset.anatomyPart as string;
    if (parts.get(part) != null) continue;
    const rect = node.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    if (settling && visible && rect.top >= origin.bottom) return null;
    parts.set(part, visible ? { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height } : null);
  }
  return { size: { width: origin.width, height: origin.height }, parts: [...parts] };
}

const ordinal = (index: number) => String(index + 1).padStart(2, '0');

export function AnatomyPanel({ item, component: Component }: { item: string; component: ComponentType }) {
  const stage = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [labelled, setLabelled] = useState(true);
  const [emphasis, setEmphasis] = useState<string | null>(null);
  const [reach, setReach] = useState(0);

  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    let frame = 0;
    let width: number | undefined;
    let deferred = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const target of node.querySelectorAll(`[data-anatomy-item="${item}"]`)) resize.observe(target);
        const next = measure(node, item, deferred < SETTLE_FRAMES);
        if (!next) {
          deferred += 1;
          update();
          return;
        }
        deferred = 0;
        // A new width lays the demo out again, so the stage gives back any room an earlier stack took.
        if (width !== undefined && width !== next.size.width) setReach(0);
        width = next.size.width;
        setMeasured((current) => (JSON.stringify(current) === JSON.stringify(next) ? current : next));
      });
    };
    const resize = new ResizeObserver(update);
    const mutation = new MutationObserver(update);
    resize.observe(node);
    mutation.observe(node, { subtree: true, childList: true, attributes: true });
    node.addEventListener('transitionend', update);
    node.addEventListener('animationend', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      node.removeEventListener('transitionend', update);
      node.removeEventListener('animationend', update);
    };
  }, [item]);

  const grow = (labels: AnatomyBox[]) => {
    if (!measured) return;
    const overrun = Math.max(0, ...labels.map((label) => label.y + label.height)) - measured.size.height;
    // The demo is centred, so growing the stage moves it down by half the growth.
    const centredGrowth = 2 * overrun;
    if (overrun > 0) setReach((current) => Math.max(current, Math.ceil(measured.size.height + centredGrowth)));
  };

  const parts = measured?.parts ?? [];
  const entries: AnatomyEntry[] = parts.map(([part, box], index) => ({ key: part, label: part, short: ordinal(index), box }));

  return (
    <>
      <div {...stylex.props(styles.view)}>
        <div ref={stage} inert {...stylex.props(styles.stage, reach > 0 && styles.reach(reach))}>
          <ThemeBoundary style={styles.stageInner}>
            <Component />
          </ThemeBoundary>
        </div>
        {measured && (
          <AnatomyOverlay entries={entries} size={measured.size} labelled={labelled} emphasis={emphasis} onPlace={grow} />
        )}
      </div>
      <Separator />
      <div {...stylex.props(styles.controls)}>
        <label {...stylex.props(styles.toggle)}>
          <Switch.Root checked={labelled} onCheckedChange={setLabelled}>
            <Switch.Thumb />
          </Switch.Root>
          Label parts
        </label>
        <ol aria-label="Parts" {...stylex.props(styles.legend)}>
          {entries.map((entry) => (
            <li
              key={entry.key}
              tabIndex={0}
              onMouseEnter={() => setEmphasis(entry.key)}
              onMouseLeave={() => setEmphasis(null)}
              onFocus={() => setEmphasis(entry.key)}
              onBlur={() => setEmphasis(null)}
              {...stylex.props(styles.entry, emphasis === entry.key && styles.active)}
            >
              <span aria-hidden {...stylex.props(styles.number)}>
                {entry.short}
              </span>
              {entry.label}
              {entry.box === null && <span {...stylex.props(styles.absent)}>not shown at this width</span>}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
