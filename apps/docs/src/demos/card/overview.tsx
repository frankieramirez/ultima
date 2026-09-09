import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Badge, Button, Card } from '@ultima/ui';

const styles = stylex.create({
  root: {
    maxWidth: '22rem',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-3'],
  },
});

export default function Overview() {
  return (
    <Card.Root style={styles.root}>
      <Card.Header>
        <Card.Title render={<h2 />}>Contrast gate</Card.Title>
        <Card.Description>WCAG 2.2 AA, checked in both color modes.</Card.Description>
      </Card.Header>
      <Card.Body style={styles.body}>
        <p>Every required text, border, and focus pairing clears the contrast gate.</p>
        <Badge tone="success">48 of 48 passing</Badge>
      </Card.Body>
      <Card.Footer>
        <Button variant="outline" size="sm">
          Open report
        </Button>
      </Card.Footer>
    </Card.Root>
  );
}
