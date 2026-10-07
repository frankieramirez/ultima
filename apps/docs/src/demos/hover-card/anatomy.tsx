import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { HoverCard } from '@ultima/ui';
import { useRef } from 'react';

const styles = stylex.create({
  stage: {
    blockSize: '18rem',
    inlineSize: 'min(32rem, 100cqi)',
    isolation: 'isolate',
    position: 'relative',
  },
  prose: {
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-relaxed'],
    margin: 0,
  },
  card: {
    display: 'grid',
    gap: space['--ult-space-3'],
  },
  heading: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-semibold'],
    margin: 0,
  },
  body: {
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
});

const ignoreViewportCollisions = { side: 'none', fallbackAxisSide: 'none' } as const;

export default function HoverCardAnatomy() {
  const stage = useRef<HTMLDivElement>(null);
  return (
    <div ref={stage} {...stylex.props(styles.stage)}>
      <p {...stylex.props(styles.prose)}>
        Every semantic token resolves to a step in one of the{' '}
        <HoverCard.Root open>
          <HoverCard.Trigger href="/palette">six palette scales</HoverCard.Trigger>
          <HoverCard.Portal container={stage}>
            <HoverCard.Positioner collisionAvoidance={ignoreViewportCollisions} sideOffset={8}>
              <HoverCard.Popup>
                <HoverCard.Arrow />
                <div {...stylex.props(styles.card)}>
                  <strong {...stylex.props(styles.heading)}>Palette</strong>
                  <span {...stylex.props(styles.body)}>
                    Six scales, twelve steps each, a dark and a light value per step, generated in OKLCH and gated
                    against WCAG 2.2 AA.
                  </span>
                </div>
              </HoverCard.Popup>
            </HoverCard.Positioner>
          </HoverCard.Portal>
        </HoverCard.Root>
        .
      </p>
    </div>
  );
}
