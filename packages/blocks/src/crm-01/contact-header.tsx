import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Avatar } from '@ultima/ui/avatar';
import { Button } from '@ultima/ui/button';
import type { Ref } from 'react';

import { StatusBadge } from './contact-list';
import type { Contact } from './crm-01';
import { BackGlyph, MailGlyph, PhoneGlyph, PlusGlyph } from './icons';

const styles = stylex.create({
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-5'],
    paddingBlock: space['--ult-space-7'],
    paddingInline: space['--ult-space-7'],
  },
  back: {
    alignSelf: 'flex-start',
  },
  identity: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-6'],
  },
  avatar: {
    blockSize: space['--ult-space-11'],
    inlineSize: space['--ult-space-11'],
  },
  who: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-2'],
  },
  nameRow: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  name: {
    fontSize: text['--ult-text-7'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  role: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    margin: 0,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
});

type ContactHeaderProps = {
  contact: Contact;
  headingId: string;
  headingRef: Ref<HTMLHeadingElement>;
  onBack?: () => void;
  onLogActivity: () => void;
};

export function ContactHeader({ contact, headingId, headingRef, onBack, onLogActivity }: ContactHeaderProps) {
  return (
    <div {...stylex.props(styles.header)}>
      {onBack && (
        <Button variant="ghost" size="sm" style={styles.back} onClick={onBack}>
          <BackGlyph />
          Back to contacts
        </Button>
      )}
      <div {...stylex.props(styles.identity)}>
        <Avatar.Root aria-hidden="true" style={styles.avatar}>
          <Avatar.Fallback>{contact.initials}</Avatar.Fallback>
        </Avatar.Root>
        <div {...stylex.props(styles.who)}>
          <div {...stylex.props(styles.nameRow)}>
            <h2 id={headingId} ref={headingRef} tabIndex={-1} {...stylex.props(styles.name)}>
              {contact.name}
            </h2>
            <StatusBadge status={contact.status} />
          </div>
          <p {...stylex.props(styles.role)}>
            {contact.title} · {contact.company}
          </p>
        </div>
        <div {...stylex.props(styles.actions)}>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`mailto:${contact.email}`} />}>
            <MailGlyph />
            Email
          </Button>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href={`tel:${contact.phone.replaceAll(' ', '')}`} />}>
            <PhoneGlyph />
            Call
          </Button>
          <Button size="sm" onClick={onLogActivity}>
            <PlusGlyph />
            Log activity
          </Button>
        </div>
      </div>
    </div>
  );
}
