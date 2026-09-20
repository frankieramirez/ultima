import * as stylex from '@stylexjs/stylex';
import { AspectRatio } from '@ultima/ui';

const LANDSCAPE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 150 100'%3E%3Crect width='150' height='100' fill='%232e8f6e'/%3E%3Cpath d='M0 100 50 45l35 30 30-45 35 30v40z' fill='%23e4f4ec'/%3E%3C/svg%3E";

const styles = stylex.create({
  image: {
    blockSize: '100%',
    display: 'block',
    inlineSize: '100%',
    objectFit: 'cover',
  },
});

export default function Figure() {
  return (
    <AspectRatio ratio={3 / 2} render={<figure aria-label="Terraced hillside" />}>
      <img src={LANDSCAPE} alt="" {...stylex.props(styles.image)} />
    </AspectRatio>
  );
}
