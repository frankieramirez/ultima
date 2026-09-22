import * as stylex from '@stylexjs/stylex';
import { border, color, font, radius, space, text } from '@ultima/tokens/tokens.stylex';
import { Badge, Button, Card, Field, Input, Tabs } from '@ultima/ui';

import { breakpoints } from '../../breakpoints.stylex';
import { contrastStyles } from './contrast';

const NOTES = [
  {
    index: 'A',
    title: 'Shared decisions',
    body: 'Color, space, type, and motion live in semantic tokens.',
  },
  {
    index: 'B',
    title: 'Composed behavior',
    body: 'Base UI primitives carry the interaction. StyleX carries the expression.',
  },
  {
    index: 'C',
    title: 'Source in your hands',
    body: 'Install from the registry. Change the parts. Build what comes next.',
  },
];

const styles = stylex.create({
  panel: {
    backgroundColor: color['--ult-color-surface-sunken'],
    borderColor: 'transparent',
    borderRadius: 0,
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.DESKTOP]: 'row' },
  },
  mock: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-8'],
    minInlineSize: 0,
    padding: { default: space['--ult-space-6'], [breakpoints.DESKTOP]: space['--ult-space-9'] },
  },
  head: { alignItems: 'center', display: 'flex', justifyContent: 'space-between' },
  title: { fontSize: text['--ult-text-8'], fontWeight: font['--ult-font-weight-medium'], margin: 0 },
  draft: {
    borderRadius: radius['--ult-radius-sm'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-1'],
    fontWeight: font['--ult-font-weight-regular'],
    letterSpacing: font['--ult-font-tracking-normal'],
  },
  actions: { display: 'flex', gap: space['--ult-space-5'], paddingBlockStart: space['--ult-space-4'] },
  notes: {
    borderBlockStartColor: color['--ult-color-border'],
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: { default: border.hairline, [breakpoints.DESKTOP]: 0 },
    borderInlineStartColor: color['--ult-color-border'],
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: { default: 0, [breakpoints.DESKTOP]: border.hairline },
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    gap: space['--ult-space-8'],
    inlineSize: { default: '100%', [breakpoints.DESKTOP]: '28rem' },
    padding: { default: space['--ult-space-6'], [breakpoints.DESKTOP]: space['--ult-space-9'] },
  },
  note: { display: 'flex', gap: space['--ult-space-6'] },
  noteIndex: {
    color: color['--ult-color-text-subtle'],
    fontFamily: font['--ult-font-mono'],
    fontSize: text['--ult-text-2'],
  },
  noteCopy: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-3'] },
  noteTitle: { fontSize: text['--ult-text-7'], fontWeight: font['--ult-font-weight-medium'], margin: 0 },
  noteBody: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-normal'],
    margin: 0,
  },
});

export default function Specimen() {
  return (
    <Card.Root role="region" aria-label="Component specimen" style={styles.panel}>
      <div {...stylex.props(styles.mock)}>
        <div {...stylex.props(styles.head)}>
          <p {...stylex.props(styles.title)}>Project settings</p>
          <Badge style={styles.draft}>Draft</Badge>
        </div>
        <Tabs.Root defaultValue="general">
          <Tabs.List aria-label="Settings sections">
            <Tabs.Tab value="general">General</Tabs.Tab>
            <Tabs.Tab value="members">Members</Tabs.Tab>
            <Tabs.Tab value="notifications">Notifications</Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
        </Tabs.Root>
        <Field.Root name="project-name">
          <Field.Label>Project name</Field.Label>
          <Input defaultValue="Untitled, but not for long" />
        </Field.Root>
        <Field.Root name="framework">
          <Field.Label>Framework</Field.Label>
          <Input defaultValue="React + StyleX" />
        </Field.Root>
        <div {...stylex.props(styles.actions)}>
          <Button style={contrastStyles.root}>Create project</Button>
          <Button variant="outline">Cancel</Button>
        </div>
      </div>
      <div {...stylex.props(styles.notes)}>
        {NOTES.map(({ index, title, body }) => (
          <div key={index} {...stylex.props(styles.note)}>
            <span aria-hidden {...stylex.props(styles.noteIndex)}>{index}</span>
            <div {...stylex.props(styles.noteCopy)}>
              <p {...stylex.props(styles.noteTitle)}>{title}</p>
              <p {...stylex.props(styles.noteBody)}>{body}</p>
            </div>
          </div>
        ))}
      </div>
    </Card.Root>
  );
}
