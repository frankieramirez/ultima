'use client';

import * as stylex from '@stylexjs/stylex';
import { border, color, font, space, text } from '@ultima/tokens/tokens.stylex';
import { Avatar, Button, Card } from '@ultima/ui';

const styles = stylex.create({
  list: {
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space['--ult-space-4'],
    paddingBlock: space['--ult-space-4'],
    borderTopColor: color['--ult-color-border'],
    borderTopStyle: 'solid',
    borderTopWidth: { default: 0, ':not(:first-child)': border.hairline },
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space['--ult-space-1'],
    minWidth: 0,
  },
  title: {
    color: color['--ult-color-text'],
    fontSize: text['--ult-text-4'],
    fontWeight: font['--ult-font-weight-medium'],
    margin: 0,
  },
  description: {
    color: color['--ult-color-text-muted'],
    fontSize: text['--ult-text-3'],
    margin: 0,
  },
  actions: {
    display: 'flex',
    flexShrink: 0,
    gap: space['--ult-space-2'],
  },
});

type Item = {
  name: string;
  detail: string;
  initials: string;
  media: boolean;
  actions: string[];
};

const ITEMS: Item[] = [
  { name: 'Rin Okafor', detail: 'Requested maintainer access', initials: 'RO', media: true, actions: ['Approve', 'Decline'] },
  { name: 'Deploy bot', detail: 'Requested npm publish access', initials: 'DB', media: false, actions: ['Approve', 'Decline'] },
  { name: 'Mira Chen', detail: 'Invited two weeks ago', initials: 'MC', media: true, actions: ['Resend'] },
];

export default function ItemRecipe() {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Access requests</Card.Title>
        <Card.Description>An item row is media, a text stack, and trailing actions.</Card.Description>
      </Card.Header>
      <Card.Body>
        <ul {...stylex.props(styles.list)}>
          {ITEMS.map((item) => (
            <li key={item.name} {...stylex.props(styles.row)}>
              {item.media && (
                <Avatar.Root>
                  <Avatar.Fallback>{item.initials}</Avatar.Fallback>
                </Avatar.Root>
              )}
              <div {...stylex.props(styles.stack)}>
                <p {...stylex.props(styles.title)}>{item.name}</p>
                <p {...stylex.props(styles.description)}>{item.detail}</p>
              </div>
              <div {...stylex.props(styles.actions)}>
                {item.actions.map((action, index) => (
                  <Button key={action} size="sm" variant={index === 0 ? 'outline' : 'ghost'}>
                    {action}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card.Root>
  );
}
