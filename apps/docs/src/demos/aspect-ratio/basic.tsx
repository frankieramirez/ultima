import * as stylex from '@stylexjs/stylex';
import { border, color, radius } from '@ultima/tokens/tokens.stylex';
import { AspectRatio } from '@ultima/ui';

const LANDSCAPE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%235a4fcf'/%3E%3Cpath d='M0 90 60 30l30 25 40-35 30 20v50z' fill='%23ddd9f7'/%3E%3Ccircle cx='118' cy='24' r='10' fill='%23ddd9f7'/%3E%3C/svg%3E";

const styles = stylex.create({
  frame: {
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
  },
  image: {
    blockSize: '100%',
    display: 'block',
    inlineSize: '100%',
    objectFit: 'cover',
  },
});

export default function Basic() {
  return (
    <AspectRatio ratio={16 / 9} style={styles.frame}>
      <img src={LANDSCAPE} alt="Ridgeline at dusk" {...stylex.props(styles.image)} />
    </AspectRatio>
  );
}
