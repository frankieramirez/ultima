import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { useEffect, useRef, useState } from 'react';

import { AnatomyOverlay, type AnatomyBox, type AnatomyEntry, type AnatomySize } from './anatomy';
import { AnatomyControls } from './anatomy-panel';
import { BlockFrame, PREVIEW_SIZES, type PreviewSize } from './block-frame';
import type { BlockEntry, BuiltFrom } from './generated/blocks';
import { TextLink } from './text-link';

/**
 * What the framed block posts to the page framing it: the first visible instance of each Built from
 * entry, in document order, measured in the frame's own pixels and clipped to its viewport. `part` is
 * the marked part, or `null` for a recipe's root. docs/spec/ultima.md, Anatomy.
 */
export type AnatomyReport = {
  type: typeof REPORT;
  size: AnatomySize;
  boxes: { item: string; part: string | null; box: AnatomyBox }[];
};

const REPORT = 'ultima:anatomy-report';
const PAGE_ASKS_REPORT = 'ultima:anatomy-watch';
const FRAME_LISTENING = 'ultima:anatomy-ready';

const IMPLICIT_ROLES: Record<string, string> = { figure: 'figure', list: 'ul, ol' };

const accessibleName = (element: Element) => {
  const ids = element.getAttribute('aria-labelledby');
  const named = ids
    ? ids.split(/\s+/).map((id) => element.ownerDocument.getElementById(id)?.textContent ?? '')
    : [element.getAttribute('aria-label') ?? ''];
  return named.join(' ').replace(/\s+/g, ' ').trim();
};

/** The elements in `scope` that a recipe's `{ role, name }` root query matches. */
export function recipeRoots({ role, name }: { role: string; name: string }, scope: ParentNode = document): Element[] {
  const implicit = IMPLICIT_ROLES[role];
  const candidates = scope.querySelectorAll(`[role="${role}"]${implicit ? `, ${implicit}` : ''}`);
  return [...candidates].filter((element) => (element.getAttribute('role') ?? role) === role && accessibleName(element) === name);
}

function measure(block: BlockEntry): AnatomyReport {
  const { clientWidth, clientHeight } = document.documentElement;
  const clip = (element: Element): AnatomyBox | null => {
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, rect.left);
    const y = Math.max(0, rect.top);
    const width = Math.min(clientWidth, rect.right) - x;
    const height = Math.min(clientHeight, rect.bottom) - y;
    return width > 0 && height > 0 ? { x, y, width, height } : null;
  };
  const found: { element: Element; item: string; part: string | null; box: AnatomyBox }[] = [];
  for (const entry of block.builtFrom) {
    const instances = entry.kind === 'recipe' ? recipeRoots(entry.root) : document.querySelectorAll(`[data-anatomy-item="${entry.id}"]`);
    for (const element of instances) {
      const box = clip(element);
      if (!box) continue;
      found.push({ element, item: entry.id, part: entry.kind === 'recipe' ? null : ((element as HTMLElement).dataset.anatomyPart ?? null), box });
      break;
    }
  }
  found.sort((a, b) => (a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return {
    type: REPORT,
    size: { width: window.innerWidth, height: window.innerHeight },
    boxes: found.map(({ item, part, box }) => ({ item, part, box })),
  };
}

/**
 * The framed side: once the framing page asks, report the block's boxes now, on resize, and whenever
 * a marked element resizes or the document changes. A thumbnail's page never asks, so it costs nothing.
 */
export function useAnatomyReport(block: BlockEntry | undefined) {
  useEffect(() => {
    if (!block || window.parent === window) return;
    const host = window.parent;
    let stop: (() => void) | undefined;
    let last = '';
    let frame = 0;
    const update = (force = false) => {
      if (force) last = '';
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        for (const target of document.querySelectorAll('[data-anatomy-item]')) resize.observe(target);
        const report = measure(block);
        const text = JSON.stringify(report);
        if (text === last) return;
        last = text;
        host.postMessage(report, location.origin);
      });
    };
    const resize = new ResizeObserver(() => update());
    const watch = () => {
      const mutation = new MutationObserver(() => update());
      const onEvent = () => update();
      mutation.observe(document.body, { subtree: true, childList: true, attributes: true });
      for (const event of ['resize', 'scroll', 'transitionend', 'animationend']) window.addEventListener(event, onEvent, true);
      void document.fonts.ready.then(onEvent);
      return () => {
        mutation.disconnect();
        for (const event of ['resize', 'scroll', 'transitionend', 'animationend']) window.removeEventListener(event, onEvent, true);
      };
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source !== host || event.origin !== location.origin || event.data?.type !== PAGE_ASKS_REPORT) return;
      stop ??= watch();
      update(true);
    };
    window.addEventListener('message', onMessage);
    host.postMessage({ type: FRAME_LISTENING }, location.origin);
    return () => {
      window.removeEventListener('message', onMessage);
      cancelAnimationFrame(frame);
      resize.disconnect();
      stop?.();
    };
  }, [block]);
}

const styles = stylex.create({
  // WCAG 2.2's 24px target, which a wrapped row of short names would otherwise miss.
  name: { minBlockSize: space['--ult-space-8'] },
});

const keyOf = (entry: BuiltFrom) => `${entry.kind}-${entry.id}`;

function LegendName({ entry }: { entry: BuiltFrom }) {
  if (entry.kind === 'component') {
    return (
      <TextLink variant="muted" render={<Link to="/components/$name" params={{ name: entry.id }} />} style={styles.name}>
        {entry.title}
      </TextLink>
    );
  }
  return (
    <TextLink variant="muted" render={<Link to="/components/$name" params={{ name: entry.page }} hash={entry.section} />} style={styles.name}>
      {entry.title} recipe
    </TextLink>
  );
}

/**
 * A block page's Anatomy: the framed block, `inert`, with the overlay drawn over it from this page,
 * so labels stay at text size and wear `site`, then the switch and a legend of every Built from entry
 * in number order. A report measured at another preview size is dropped, so no box outlives a toggle.
 */
export function BlockAnatomy({ block, size }: { block: BlockEntry; size: PreviewSize }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [report, setReport] = useState<AnatomyReport | null>(null);
  const [labelled, setLabelled] = useState(true);
  const [emphasis, setEmphasis] = useState<string | null>(null);

  useEffect(() => {
    const ask = () => frame.current?.contentWindow?.postMessage({ type: PAGE_ASKS_REPORT }, location.origin);
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== location.origin) return;
      if (event.data?.type === FRAME_LISTENING) ask();
      else if (event.data?.type === REPORT) setReport(event.data as AnatomyReport);
    };
    window.addEventListener('message', onMessage);
    ask();
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const { width, height } = PREVIEW_SIZES[size];
  const current = report?.size.width === width && report.size.height === height ? report : null;
  const byKey = new Map(block.builtFrom.map((entry) => [keyOf(entry), entry]));
  const placed = (current?.boxes ?? []).flatMap(({ item, part, box }) => {
    const entry = byKey.get(`${part === null ? 'recipe' : 'component'}-${item}`);
    return entry ? [{ entry, box }] : [];
  });

  return (
    <>
      <BlockFrame block={block} size={size} inert frameRef={frame}>
        {(scale) =>
          current && (
            <AnatomyOverlay
              entries={placed.map(({ entry, box }): AnatomyEntry => ({
                key: keyOf(entry),
                label: `${entry.title} ${entry.number}`,
                short: entry.number,
                box: { x: box.x * scale, y: box.y * scale, width: box.width * scale, height: box.height * scale },
              }))}
              size={{ width: width * scale, height: height * scale }}
              labelled={labelled}
              emphasis={emphasis}
            />
          )
        }
      </BlockFrame>
      <AnatomyControls
        switchLabel="Label components"
        legendLabel="Built from"
        labelled={labelled}
        onLabelledChange={setLabelled}
        emphasis={emphasis}
        onEmphasis={setEmphasis}
        entries={block.builtFrom.map((entry) => ({
          key: keyOf(entry),
          number: entry.number,
          name: <LegendName entry={entry} />,
          shown: current === null || placed.some((shown) => shown.entry === entry),
          tabbable: false,
        }))}
      />
    </>
  );
}
