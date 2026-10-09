'use client';

import * as stylex from '@stylexjs/stylex';
import { border, color, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { Card } from '@ultima/ui/card';

/**
 * Each override sets layout, size or a semantic role through the part's own `style` prop. None touches
 * focus, disabled opacity or cursor, so the component keeps its focus ring and disabled behavior.
 */
const styles = stylex.create({
  card: {
    borderColor: color['--ult-color-border-strong'],
  },
  header: {
    borderBlockEndColor: color['--ult-color-border'],
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: border.hairline,
    marginBlockEnd: space['--ult-space-6'],
  },
  title: {
    fontSize: text['--ult-text-7'],
  },
  footer: {
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  roomy: {
    height: space['--ult-space-11'],
    paddingInline: space['--ult-space-8'],
  },
});

export default function StyleOverrides() {
  return (
    <Card.Root style={styles.card}>
      <Card.Header style={styles.header}>
        <Card.Title style={styles.title}>Invite a teammate</Card.Title>
        <Card.Description>They join the Northwind workspace with editor access.</Card.Description>
      </Card.Header>
      <Card.Body>
        <p>Invitations expire after seven days. A pending invitation can be sent again once a day.</p>
      </Card.Body>
      <Card.Footer style={styles.footer}>
        <Button variant="outline" disabled style={styles.roomy}>
          Resend invitation
        </Button>
        <Button style={styles.roomy}>Send invitation</Button>
      </Card.Footer>
    </Card.Root>
  );
}
