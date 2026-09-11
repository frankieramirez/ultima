import * as stylex from '@stylexjs/stylex';
import { shadow, space } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';

const styles = stylex.create({
  specimen: {
    boxShadow: shadow['--ult-shadow-md'],
    height: space['--ult-space-11'],
    width: space['--ult-space-12'],
  },
});

const live = stylex.create({
  boxShadow: (token: string) => ({ boxShadow: `var(${token})` }),
});

export default function ShadowSpecimen({ token }: { token?: string }) {
  return <Card.Root aria-hidden="true" style={[styles.specimen, token ? live.boxShadow(token) : null]} />;
}
