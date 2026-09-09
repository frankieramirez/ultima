/**
 * PROTOTYPE route for ULT-7. Throwaway. Renders the Button and Card
 * prototypes in both color modes so the authoring model can be reacted to.
 * Delete once ULT-11 lands conventions.
 */
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme } from '@ultima/tokens';
import { color, font, radius, space } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/prototype/button.prototype';
import { Card } from '@ultima/ui/prototype/card.prototype';
import { useState } from 'react';

const styles = stylex.create({
  page: { margin: '0 auto', maxWidth: '64rem', padding: space['--ult-space-8'] },
  h1: { fontSize: '1.5rem', margin: 0 },
  lede: { color: color['--ult-color-text-muted'], marginBlock: space['--ult-space-5'] },
  modes: { display: 'grid', gap: space['--ult-space-6'], gridTemplateColumns: 'repeat(auto-fit, minmax(20rem, 1fr))' },
  panel: {
    backgroundColor: color['--ult-color-surface'],
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: '1px',
    color: color['--ult-color-text'],
    display: 'flex',
    flexDirection: 'column',
    gap: space['--ult-space-6'],
    padding: space['--ult-space-6'],
  },
  label: { color: color['--ult-color-text-muted'], fontFamily: font['--ult-font-mono'], fontSize: '0.75rem', margin: 0 },
  row: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-4'] },
  state: { fontFamily: font['--ult-font-mono'], fontSize: '0.75rem', margin: 0 },
});

// A caller-side override, to see the escape hatch in use.
const overrides = stylex.create({
  wide: { paddingInline: space['--ult-space-8'], borderRadius: '999px' },
  danger: { backgroundColor: { default: '#c93b3b', ':hover': '#a72f2f' }, color: 'white' },
});

function Showcase({ mode }: { mode: 'dark' | 'light' }) {
  const [clicks, setClicks] = useState(0);
  const theme = mode === 'dark' ? [darkTheme, colorScheme.dark] : [lightTheme, colorScheme.light];
  return (
    <section {...stylex.props(theme, styles.panel)}>
      <p {...stylex.props(styles.label)}>{mode}</p>

      <p {...stylex.props(styles.label)}>Button: variants</p>
      <div {...stylex.props(styles.row)}>
        <Button onClick={() => setClicks((c) => c + 1)}>Solid</Button>
        <Button variant="outline" onClick={() => setClicks((c) => c + 1)}>Outline</Button>
        <Button variant="ghost" onClick={() => setClicks((c) => c + 1)}>Ghost</Button>
        <Button disabled>Disabled</Button>
      </div>

      <p {...stylex.props(styles.label)}>Button: sizes</p>
      <div {...stylex.props(styles.row)}>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>

      <p {...stylex.props(styles.label)}>Button: style escape hatch</p>
      <div {...stylex.props(styles.row)}>
        <Button style={overrides.wide}>Pill</Button>
        <Button style={overrides.danger}>Danger</Button>
        <Button variant="outline" style={[overrides.wide, overrides.danger]}>Both</Button>
      </div>
      <p {...stylex.props(styles.state)}>clicks: {clicks}</p>

      <p {...stylex.props(styles.label)}>Card: static slots</p>
      <Card.Root>
        <Card.Header>
          <Card.Title>Arcane ledger</Card.Title>
          <Card.Description>A static card. No Base UI primitive behind it.</Card.Description>
        </Card.Header>
        <Card.Body>Body text uses the semantic text token and a readable line height.</Card.Body>
        <Card.Footer>
          <Button variant="ghost" size="sm">Cancel</Button>
          <Button size="sm">Confirm</Button>
        </Card.Footer>
      </Card.Root>

      <p {...stylex.props(styles.label)}>Card: render prop on Root</p>
      <Card.Root render={<article aria-label="rendered as article" />}>
        <Card.Body>Root rendered as an article through Base UI useRender.</Card.Body>
      </Card.Root>
    </section>
  );
}

export function PrototypeUlt7() {
  return (
    <main {...stylex.props(styles.page)}>
      <h1 {...stylex.props(styles.h1)}>ULT-7 prototype</h1>
      <p {...stylex.props(styles.lede)}>
        Throwaway. Button on Base UI, Card on plain elements, StyleX only. React to the feel; conventions are ULT-11.
      </p>
      <div {...stylex.props(styles.modes)}>
        <Showcase mode="dark" />
        <Showcase mode="light" />
      </div>
    </main>
  );
}
