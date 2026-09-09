import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Badge, type BadgeTone, type BadgeVariant } from '@ultima/ui';

const variants: BadgeVariant[] = ['subtle', 'solid'];
const tones: BadgeTone[] = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'];
const styles = stylex.create({
  grid: { display: 'grid', gap: space['--ult-space-4'] },
  row: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-3'] },
});

export default function Variants() {
  return (
    <div {...stylex.props(styles.grid)}>
      {variants.map((variant) => (
        <div key={variant} {...stylex.props(styles.row)}>
          {tones.map((tone) => (
            <Badge key={tone} variant={variant} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  );
}
