// A suppression needs a rule ID and a reason; one that matches nothing is reported too.
import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  brand: {
    // ultima-check-ignore ULT-APP-PAINT-001: the partner logo color is fixed by contract
    color: '#1d4ed8',
    // ultima-check-ignore ULT-APP-PAINT-001
    backgroundColor: '#f8fafc',
    // ultima-check-ignore ULT-APP-PAINT-001: nothing on the next line is paint
    padding: '4px',
  },
});

export function Brand() {
  return <span {...stylex.props(styles.brand)}>Partner</span>;
}
