'use client';

import { Form } from '@base-ui/react/form';
import * as stylex from '@stylexjs/stylex';
import { color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Card } from '@ultima/ui/card';
import { Field } from '@ultima/ui/field';
import { Fieldset } from '@ultima/ui/fieldset';
import { NativeSelect } from '@ultima/ui/native-select';
import { RadioGroup } from '@ultima/ui/radio-group';
import { Separator } from '@ultima/ui/separator';
import { Switch } from '@ultima/ui/switch';
import { Toast } from '@ultima/ui/toast';
import { Fragment, type ReactNode, useId } from 'react';

import { PendingGlyph } from './icons';

export type Push = 'everything' | 'mentions' | 'nothing';

export type NotificationValues = {
  productUpdates: boolean;
  weeklyDigest: boolean;
  mentions: boolean;
  marketing: boolean;
  push: Push;
  quietFrom: string;
  quietTo: string;
  timeZone: string;
};

type EmailKey = 'productUpdates' | 'weeklyDigest' | 'mentions' | 'marketing';

const emails: { name: EmailKey; label: string; description: string }[] = [
  { name: 'productUpdates', label: 'Product updates', description: 'New features and improvements, once a month.' },
  { name: 'weeklyDigest', label: 'Weekly digest', description: 'Orders, revenue and stock in one summary.' },
  { name: 'mentions', label: 'Mentions', description: 'When someone mentions you in a note.' },
  { name: 'marketing', label: 'Marketing', description: 'Offers and events from Northwind.' },
];

const pushes: { value: Push; label: string; description: string }[] = [
  { value: 'everything', label: 'Everything', description: 'All activity in your workspace' },
  { value: 'mentions', label: 'Mentions and replies', description: 'Only what involves you' },
  { value: 'nothing', label: 'Nothing', description: 'Turn push notifications off' },
];

const halfHours = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 === 0 ? '00' : '30'}`);

const zones = ['America/Los_Angeles', 'America/New_York', 'Europe/London', 'Europe/Oslo', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney', 'UTC'];

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  form: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-8'],
  },
  head: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
  },
  title: {
    fontSize: text['--ult-text-8'],
    fontWeight: font['--ult-font-weight-semibold'],
    letterSpacing: font['--ult-font-tracking-tight'],
    lineHeight: font['--ult-font-leading-tight'],
    margin: 0,
  },
  lead: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-4'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
  },
  group: {
    display: { default: 'flex', [DESKTOP]: 'grid' },
    gap: { default: space['--ult-space-5'], [DESKTOP]: space['--ult-space-8'] },
    gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 7fr)',
  },
  groupHead: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
  },
  legend: {
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-semibold'],
    padding: 0,
  },
  groupLead: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    lineHeight: font['--ult-font-leading-snug'],
    margin: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space['--ult-space-6'],
    justifyContent: 'space-between',
    paddingBlock: space['--ult-space-5'],
    paddingInline: space['--ult-space-6'],
  },
  rowText: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-2'],
  },
  rowLabel: {
    fontSize: text['--ult-text-4'],
  },
  inset: {
    padding: space['--ult-space-6'],
  },
  choices: {
    gap: space['--ult-space-6'],
  },
  choice: {
    alignItems: 'flex-start',
  },
  hours: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
    padding: space['--ult-space-6'],
  },
  hour: {
    flexBasis: `calc(4 * ${space['--ult-space-10']})`,
    flexGrow: 1,
  },
  cardTopEdgeOnly: {
    borderBlockEndWidth: 0,
    borderInlineEndWidth: 0,
    borderInlineStartWidth: 0,
    borderRadius: 0,
  },
  bar: {
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: space['--ult-space-5'],
    insetBlockEnd: 0,
    justifyContent: 'space-between',
    marginInline: { default: `calc(-1 * ${space['--ult-space-6']})`, [DESKTOP]: `calc(-1 * ${space['--ult-space-11']})` },
    marginBlockStart: 'auto',
    paddingBlock: space['--ult-space-5'],
    paddingInline: { default: space['--ult-space-6'], [DESKTOP]: space['--ult-space-11'] },
    position: 'sticky',
  },
  collapsedWhenClean: {
    backgroundColor: 'transparent',
    borderBlockStartWidth: 0,
    paddingBlock: 0,
  },
  notice: {
    alignItems: 'center',
    color: color['--ult-color-text-muted'],
    display: 'flex',
    fontSize: text['--ult-text-3'],
    gap: space['--ult-space-4'],
  },
  actions: {
    display: 'flex',
    gap: space['--ult-space-4'],
  },
});

function Group({ legend, description, children }: { legend: string; description: string; children: ReactNode }) {
  const descriptionId = useId();
  return (
    <Fieldset.Root aria-describedby={descriptionId} style={styles.group}>
      <div {...stylex.props(styles.groupHead)}>
        <Fieldset.Legend style={styles.legend}>{legend}</Fieldset.Legend>
        <p id={descriptionId} {...stylex.props(styles.groupLead)}>
          {description}
        </p>
      </div>
      <Card.Root>{children}</Card.Root>
    </Fieldset.Root>
  );
}

function differs(saved: NotificationValues, values: NotificationValues): boolean {
  return (Object.keys(saved) as (keyof NotificationValues)[]).some((key) => saved[key] !== values[key]);
}

export function NotificationsForm({
  saved,
  values,
  onValuesChange,
  onSavedChange,
}: {
  saved: NotificationValues;
  values: NotificationValues;
  onValuesChange: (values: NotificationValues) => void;
  onSavedChange: (values: NotificationValues) => void;
}) {
  const toasts = Toast.useToastManager();
  const dirty = differs(saved, values);
  const set = <Key extends keyof NotificationValues>(key: Key, value: NotificationValues[Key]) => onValuesChange({ ...values, [key]: value });

  return (
    <Form
      {...stylex.props(styles.form)}
      onFormSubmit={() => {
        onSavedChange(values);
        toasts.add({ title: 'Notification settings saved' });
      }}
    >
      <div {...stylex.props(styles.head)}>
        <h1 {...stylex.props(styles.title)}>Notifications</h1>
        <p {...stylex.props(styles.lead)}>Choose what reaches you, where, and when. Changes apply to every device signed in to this account.</p>
      </div>
      <Separator />
      <Group legend="Email" description="Sent to ada@northwind.co">
        {emails.map((email, index) => (
          <Fragment key={email.name}>
            {index > 0 && <Separator />}
            <Field.Root name={email.name} style={styles.row}>
              <div {...stylex.props(styles.rowText)}>
                <Field.Label style={styles.rowLabel}>{email.label}</Field.Label>
                <Field.Description>{email.description}</Field.Description>
              </div>
              <Switch.Root checked={values[email.name]} onCheckedChange={(checked) => set(email.name, checked)}>
                <Switch.Thumb />
              </Switch.Root>
            </Field.Root>
          </Fragment>
        ))}
      </Group>
      <Separator />
      <Group legend="Push" description="On your phone and desktop">
        <Field.Root name="push" style={styles.inset}>
          <RadioGroup.Root value={values.push} onValueChange={(value) => set('push', value as Push)} style={styles.choices}>
            {pushes.map((push) => (
              <Field.Item key={push.value} style={styles.choice}>
                <RadioGroup.Item value={push.value}>
                  <RadioGroup.Indicator />
                </RadioGroup.Item>
                <div {...stylex.props(styles.rowText)}>
                  <Field.Label style={styles.rowLabel}>{push.label}</Field.Label>
                  <Field.Description>{push.description}</Field.Description>
                </div>
              </Field.Item>
            ))}
          </RadioGroup.Root>
        </Field.Root>
      </Group>
      <Separator />
      <Group legend="Quiet hours" description="Hold everything but urgent alerts">
        <div {...stylex.props(styles.hours)}>
          <TimeField name="quietFrom" label="From" value={values.quietFrom} options={halfHours} onChange={(value) => set('quietFrom', value)} />
          <TimeField name="quietTo" label="To" value={values.quietTo} options={halfHours} onChange={(value) => set('quietTo', value)} />
          <TimeField name="timeZone" label="Time zone" value={values.timeZone} options={zones} onChange={(value) => set('timeZone', value)} />
        </div>
      </Group>
      <Card.Root style={[styles.cardTopEdgeOnly, styles.bar, !dirty && styles.collapsedWhenClean]}>
        <div role="status" aria-atomic="true" {...stylex.props(styles.notice)}>
          {dirty && (
            <>
              <PendingGlyph />
              You have unsaved changes
            </>
          )}
        </div>
        {dirty && (
          <div {...stylex.props(styles.actions)}>
            <Button type="button" variant="outline" onClick={() => onValuesChange(saved)}>
              Discard
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        )}
      </Card.Root>
    </Form>
  );
}

function TimeField({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <Field.Root name={name} style={styles.hour}>
      <Field.Label>{label}</Field.Label>
      <NativeSelect.Root>
        <NativeSelect.Select value={value} onChange={(event) => onChange(event.currentTarget.value)}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </NativeSelect.Select>
      </NativeSelect.Root>
    </Field.Root>
  );
}
