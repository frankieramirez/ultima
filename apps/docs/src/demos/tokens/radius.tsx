import * as stylex from '@stylexjs/stylex';
import { radius, space } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';

const styles = stylex.create({
  specimen: {
    borderRadius: radius['--ult-radius-md'],
    height: space['--ult-space-11'],
    width: space['--ult-space-11'],
  },
});

const live = stylex.create({
  borderRadius: (token: string) => ({ borderRadius: `var(${token})` }),
});

export default function RadiusSpecimen({ token }: { token?: string }) {
  return (
    <Card.Root aria-hidden="true" style={[styles.specimen, token ? live.borderRadius(token) : null]} />
  );
}
