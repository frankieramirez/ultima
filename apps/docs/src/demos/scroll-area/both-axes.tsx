import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { ScrollArea } from '@ultima/ui';

const styles = stylex.create({
  bounds: { blockSize: '9rem', inlineSize: '22rem' },
  board: {
    display: 'flex',
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
  },
  day: {
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-2'],
    inlineSize: '7rem',
  },
  heading: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
    fontWeight: font['--ult-font-weight-medium'],
    letterSpacing: font['--ult-font-tracking-wide'],
    margin: 0,
    textTransform: 'uppercase',
  },
  slot: { margin: 0 },
});

const days: Record<string, string[]> = {
  Mon: ['Standup', 'Design review', 'Pairing', 'Docs pass', 'Triage', 'Readout'],
  Tue: ['Planning', 'Prototype', 'Review', 'Support', '1:1s', 'Retro'],
  Wed: ['Release', 'Retro', '1:1s', 'Triage', 'Pairing', 'Cleanup'],
  Thu: ['Prototype', 'Review', 'Support', 'Standup', 'Docs pass', 'Demo'],
  Fri: ['Demo', 'Cleanup', 'Pairing', 'Review', 'Planning', 'Retro'],
};

export default function BothAxesScrollArea() {
  return (
    <ScrollArea.Root style={styles.bounds}>
      <ScrollArea.Viewport>
        <ScrollArea.Content>
          <div {...stylex.props(styles.board)}>
            {Object.entries(days).map(([day, slots]) => (
              <div key={day} {...stylex.props(styles.day)}>
                <p {...stylex.props(styles.heading)}>{day}</p>
                {slots.map((slot) => (
                  <p key={slot} {...stylex.props(styles.slot)}>
                    {slot}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Scrollbar orientation="horizontal">
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}
