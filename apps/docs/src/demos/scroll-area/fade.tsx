import * as stylex from '@stylexjs/stylex';
import { space, text } from '@ultima/tokens/tokens.stylex';
import { ScrollArea } from '@ultima/ui';

const mask = `linear-gradient(
  to bottom,
  transparent 0px,
  black min(40px, var(--scroll-area-overflow-y-start)),
  black calc(100% - min(40px, var(--scroll-area-overflow-y-end, 40px))),
  transparent 100%
)`;

const styles = stylex.create({
  bounds: { blockSize: '9rem', inlineSize: '22rem' },
  fade: {
    WebkitMaskImage: mask,
    maskImage: mask,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: text['--ult-text-4'],
    gap: space['--ult-space-3'],
    paddingBlock: space['--ult-space-3'],
    paddingInline: space['--ult-space-4'],
  },
  note: { margin: 0 },
});

const notes = [
  'Meter moved its tone onto Root.',
  'Table gained a scroll region.',
  'Sidebar landed for the docs shell.',
  'Collapsible joined the v0 set.',
  'Toggle Group drives the theme control.',
  'Separator promoted into v0.',
  'Accordion, Avatar, and Scroll Area round out v0.2.',
];

export default function FadeScrollArea() {
  return (
    <ScrollArea.Root style={styles.bounds}>
      <ScrollArea.Viewport style={styles.fade}>
        <ScrollArea.Content>
          <div {...stylex.props(styles.list)}>
            {notes.map((note) => (
              <p key={note} {...stylex.props(styles.note)}>
                {note}
              </p>
            ))}
          </div>
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
