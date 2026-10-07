import { Form } from '@base-ui/react/form';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Card } from '@ultima/ui/card';
import { Empty } from '@ultima/ui/empty';
import { InputGroup } from '@ultima/ui/input-group';
import { Separator } from '@ultima/ui/separator';
import { Tabs } from '@ultima/ui/tabs';
import { type ComponentType, type ReactNode, type Ref, useState } from 'react';

import type { Contact, Entry } from './crm-01';
import { CalendarGlyph, HandshakeGlyph, MailGlyph, NoteGlyph, PhoneGlyph, SendGlyph } from './icons';

const GLYPHS: Record<Entry['kind'], ComponentType> = {
  email: MailGlyph,
  call: PhoneGlyph,
  deal: HandshakeGlyph,
  meeting: CalendarGlyph,
  note: NoteGlyph,
};

const styles = stylex.create({
  tabs: {
    paddingInline: space['--ult-space-7'],
  },
  body: {
    alignItems: 'flex-start',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-7'],
    paddingBlock: space['--ult-space-7'],
  },
  panels: {
    flexBasis: `calc(5 * ${space['--ult-space-12']})`,
    flexGrow: 3,
    minInlineSize: 0,
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-7'],
    paddingBlockStart: 0,
  },
  iconButton: {
    inlineSize: space['--ult-space-9'],
    paddingInline: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  entry: {
    display: 'flex',
    gap: space['--ult-space-5'],
  },
  rail: {
    alignItems: 'center',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    flexDirection: 'column',
    fontSize: text['--ult-text-5'],
    gap: space['--ult-space-3'],
    paddingBlockStart: space['--ult-space-1'],
  },
  line: {
    blockSize: 'auto',
    flexGrow: 1,
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
    lineHeight: font['--ult-font-leading-snug'],
    paddingBlockEnd: space['--ult-space-7'],
  },
  title: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-semibold'],
  },
  text: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
  },
  meta: {
    color: color['--ult-color-text-subtle'],
    fontSize: text['--ult-text-2'],
  },
  rows: {
    listStyle: 'none',
    margin: 0,
    padding: space['--ult-space-6'],
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-1'],
  },
  notes: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
});

type ContactActivityProps = {
  contact: Contact;
  tab: string;
  onTabChange: (tab: string) => void;
  composerRef: Ref<HTMLInputElement>;
  onAddNote: (body: string) => void;
  details: ReactNode;
};

export function ContactActivity({ contact, tab, onTabChange, composerRef, onAddNote, details }: ContactActivityProps) {
  const [draft, setDraft] = useState('');
  const firstName = contact.name.split(' ')[0];
  const notes = contact.activity.filter((entry) => entry.kind === 'note');

  return (
    <Tabs.Root value={tab} onValueChange={(value: string) => onTabChange(value)}>
      <div {...stylex.props(styles.tabs)}>
        <Tabs.List>
          <Tabs.Tab value="activity">Activity</Tabs.Tab>
          <Tabs.Tab value="deals">Deals</Tabs.Tab>
          <Tabs.Tab value="notes">Notes</Tabs.Tab>
          <Tabs.Tab value="files">Files</Tabs.Tab>
          <Tabs.Indicator />
        </Tabs.List>
        <div {...stylex.props(styles.body)}>
          <div {...stylex.props(styles.panels)}>
            <Tabs.Panel value="activity" style={styles.panel}>
              <Form
                onFormSubmit={() => {
                  const body = draft.trim();
                  if (body === '') return;
                  onAddNote(body);
                  setDraft('');
                }}
              >
                <InputGroup.Root>
                  <InputGroup.Input
                    ref={composerRef}
                    aria-label={`Add a note about ${firstName}`}
                    placeholder={`Add a note about ${firstName}…`}
                    value={draft}
                    onValueChange={setDraft}
                  />
                  <InputGroup.Addon align="end">
                    <Button type="submit" variant="ghost" size="sm" aria-label="Add note" style={styles.iconButton}>
                      <SendGlyph />
                    </Button>
                  </InputGroup.Addon>
                </InputGroup.Root>
              </Form>
              <ol aria-label="Activity" {...stylex.props(styles.list)}>
                {contact.activity.map((entry, index) => {
                  const Glyph = GLYPHS[entry.kind];
                  return (
                    <li key={entry.id} {...stylex.props(styles.entry)}>
                      <span {...stylex.props(styles.rail)}>
                        <Glyph />
                        {index < contact.activity.length - 1 && <Separator orientation="vertical" style={styles.line} />}
                      </span>
                      <span {...stylex.props(styles.copy)}>
                        <span {...stylex.props(styles.title)}>{entry.title}</span>
                        <span {...stylex.props(styles.text)}>{entry.body}</span>
                        <span {...stylex.props(styles.meta)}>{entry.meta}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Tabs.Panel>
            <Tabs.Panel value="deals" style={styles.panel}>
              {contact.deal ? (
                <Card.Root>
                  <ul {...stylex.props(styles.rows)}>
                    <li {...stylex.props(styles.row)}>
                      <span {...stylex.props(styles.stack)}>
                        <span {...stylex.props(styles.title)}>{contact.deal.name}</span>
                        <span {...stylex.props(styles.text)}>{contact.deal.stage}</span>
                      </span>
                      <span {...stylex.props(styles.text)}>{contact.deal.value}</span>
                    </li>
                  </ul>
                </Card.Root>
              ) : (
                <Empty.Root>
                  <Empty.Title>No deals yet</Empty.Title>
                </Empty.Root>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="notes" style={styles.panel}>
              {notes.length > 0 ? (
                <ol aria-label="Notes" {...stylex.props(styles.notes)}>
                  {notes.map((note) => (
                    <li key={note.id} {...stylex.props(styles.stack)}>
                      <span {...stylex.props(styles.text)}>{note.body}</span>
                      <span {...stylex.props(styles.meta)}>{note.meta}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty.Root>
                  <Empty.Title>No notes yet</Empty.Title>
                </Empty.Root>
              )}
            </Tabs.Panel>
            <Tabs.Panel value="files" style={styles.panel}>
              <Empty.Root>
                <Empty.Title>No files yet</Empty.Title>
              </Empty.Root>
            </Tabs.Panel>
          </div>
          {details}
        </div>
      </div>
    </Tabs.Root>
  );
}
