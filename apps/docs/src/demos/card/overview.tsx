import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Button, Card, Stat } from '@ultima/ui';

const styles = stylex.create({
  root: {
    maxWidth: '22rem',
  },
  stats: {
    display: 'flex',
    gap: space['--ult-space-8'],
  },
});

export default function Overview() {
  return (
    <Card.Root style={styles.root}>
      <Card.Header>
        <Card.Title>Contrast gate</Card.Title>
        <Card.Description>WCAG 2.2 AA, checked in both color modes.</Card.Description>
      </Card.Header>
      <Card.Body style={styles.stats}>
        <Stat.Root>
          <Stat.Label>Pairings</Stat.Label>
          <Stat.Value>48</Stat.Value>
        </Stat.Root>
        <Stat.Root>
          <Stat.Label>Passing</Stat.Label>
          <Stat.Value>48</Stat.Value>
        </Stat.Root>
      </Card.Body>
      <Card.Footer>
        <Button variant="outline" size="sm">
          Open report
        </Button>
      </Card.Footer>
    </Card.Root>
  );
}
