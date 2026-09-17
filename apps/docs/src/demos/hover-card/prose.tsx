import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { HoverCard } from '@ultima/ui';

const styles = stylex.create({
  prose: {
    margin: 0,
    maxWidth: `calc(${space['--ult-space-12']} * 8)`,
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-relaxed'],
  },
  card: {
    display: 'grid',
    gap: space['--ult-space-3'],
  },
  heading: {
    margin: 0,
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-semibold'],
  },
  body: {
    margin: 0,
    fontSize: text['--ult-text-3'],
  },
});

export default function HoverCardProse() {
  return (
    <p {...stylex.props(styles.prose)}>
      Every semantic token resolves to a step in one of the{' '}
      <HoverCard.Root>
        <HoverCard.Trigger href="/palette">six palette scales</HoverCard.Trigger>
        <HoverCard.Portal>
          <HoverCard.Positioner sideOffset={8}>
            <HoverCard.Popup>
              <HoverCard.Arrow />
              <div {...stylex.props(styles.card)}>
                <strong {...stylex.props(styles.heading)}>Palette</strong>
                <span {...stylex.props(styles.body)}>
                  Six scales, twelve steps each, a dark and a light value per step: mithril, arcane, mana, verdant,
                  ember, and ruin. Every pairing is generated in OKLCH and gated against WCAG 2.2 AA.
                </span>
              </div>
            </HoverCard.Popup>
          </HoverCard.Positioner>
        </HoverCard.Portal>
      </HoverCard.Root>, and the step number carries the same meaning in both color modes.
    </p>
  );
}
