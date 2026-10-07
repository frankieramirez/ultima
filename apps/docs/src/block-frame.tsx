import * as stylex from '@stylexjs/stylex';
import { useLayoutEffect, useRef, useState } from 'react';

import type { BlockEntry } from './generated/blocks';

/**
 * The window a block preview lays out in, in CSS pixels: the frames' 1200×760 block layouts, and the
 * production matrix's 390×844 narrow viewport. docs/spec/ultima.md, Docs routes.
 */
export const PREVIEW_SIZES = {
  desktop: { width: 1200, height: 760 },
  narrow: { width: 390, height: 844 },
} as const;

export type PreviewSize = keyof typeof PREVIEW_SIZES;

const styles = stylex.create({
  stage: { inlineSize: '100%', minInlineSize: 0 },
  window: (inline: string, block: string) => ({
    blockSize: block,
    inlineSize: inline,
    marginInline: 'auto',
    overflow: 'hidden',
    position: 'relative',
  }),
  frame: (scale: number) => ({
    borderWidth: 0,
    display: 'block',
    transform: `scale(${scale})`,
    transformOrigin: '0 0',
  }),
});

/**
 * Frames `/blocks/<id>/preview` at a preview size, scaled down to fit the column. The block lays
 * out for the frame's own viewport, so a Sidebar reads the frame's width rather than the reader's
 * window. A thumbnail loads lazily and is `inert`, so nothing inside it is a tab stop.
 */
export function BlockFrame({ block, size = 'desktop', thumbnail = false }: { block: BlockEntry; size?: PreviewSize; thumbnail?: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState(0);

  useLayoutEffect(() => {
    const node = stage.current;
    if (!node) return;
    const measure = () => setRoom(node.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { width, height } = PREVIEW_SIZES[size];
  const scale = Math.min(1, room / width);

  return (
    <div ref={stage} data-preview-size={size} {...stylex.props(styles.stage)}>
      <div {...stylex.props(styles.window(`${width * scale}px`, `${height * scale}px`))}>
        <iframe
          src={`/blocks/${block.id}/preview`}
          title={`${block.title} preview`}
          width={width}
          height={height}
          loading={thumbnail ? 'lazy' : 'eager'}
          inert={thumbnail}
          {...stylex.props(styles.frame(scale))}
        />
      </div>
    </div>
  );
}
