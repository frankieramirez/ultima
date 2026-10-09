'use client';

import * as stylex from '@stylexjs/stylex';
import { color, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Dialog } from '@ultima/ui/dialog';
import { Field } from '@ultima/ui/field';
import { Input } from '@ultima/ui/input';
import { type ComponentProps, type FormEvent, useState } from 'react';

const styles = stylex.create({
  form: {
    display: 'grid',
    gap: space['--ult-space-5'],
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-4'],
  },
  announcement: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
});

type Container = ComponentProps<typeof Dialog.Portal>['container'];

/** `container` is where the Dialog portals, the document body by default; a subtree theme passes its own element. */
export default function InteractionStates({ container }: { container?: Container }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!address.includes('@')) {
      setError('Enter an email address that includes @.');
      setAnnouncement('');
      return;
    }
    setPending([...pending, address]);
    setEmail('');
    setError('');
    setAnnouncement(`Invited ${address}.`);
  }

  return (
    <form aria-label="Invite by email" noValidate onSubmit={submit} {...stylex.props(styles.form)}>
      <Field.Root name="email" invalid={error !== ''}>
        <Field.Label>Email address</Field.Label>
        <Input
          type="email"
          required
          value={email}
          onValueChange={(value) => {
            setEmail(value);
            setError('');
          }}
        />
        <Field.Description>Send invite stays disabled until you type an address.</Field.Description>
        {error ? <Field.Error match>{error}</Field.Error> : null}
      </Field.Root>
      <div {...stylex.props(styles.actions)}>
        <Button type="submit" disabled={email.trim() === ''}>
          Send invite
        </Button>
        <RevokeInvites
          container={container}
          count={pending.length}
          onRevoke={() => {
            setAnnouncement(`Revoked ${pending.length} pending ${pending.length === 1 ? 'invite' : 'invites'}.`);
            setPending([]);
          }}
        />
      </div>
      <p role="status" {...stylex.props(styles.announcement)}>
        {announcement}
      </p>
    </form>
  );
}

function RevokeInvites({ container, count, onRevoke }: { container?: Container; count: number; onRevoke: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={<Button variant="outline" />}>Review pending invites</Dialog.Trigger>
      <Dialog.Portal container={container}>
        <Dialog.Backdrop />
        <Dialog.Viewport>
          <Dialog.Popup>
            <Dialog.Title>Pending invites</Dialog.Title>
            <Dialog.Description>
              {count === 0 ? 'No invites are waiting for an answer.' : `${count} ${count === 1 ? 'invite is' : 'invites are'} waiting for an answer.`}
            </Dialog.Description>
            <div {...stylex.props(styles.actions)}>
              <Button
                tone="danger"
                disabled={count === 0}
                onClick={() => {
                  onRevoke();
                  setOpen(false);
                }}
              >
                Revoke all
              </Button>
              <Dialog.Close render={<Button variant="outline" />}>Close</Dialog.Close>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
