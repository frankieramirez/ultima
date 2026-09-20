'use client';

import * as stylex from '@stylexjs/stylex';
import useEmblaCarousel from 'embla-carousel-react';
import { border, color, radius, space } from '@ultima/tokens/tokens.stylex';
import { AspectRatio, Button } from '@ultima/ui';
import { useEffect, useState } from 'react';

const SLIDES = [
  {
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%235a4fcf'/%3E%3Cpath d='M0 90 60 30l30 25 40-35 30 20v50z' fill='%23ddd9f7'/%3E%3Ccircle cx='118' cy='24' r='10' fill='%23ddd9f7'/%3E%3C/svg%3E",
    alt: 'Ridgeline at dusk',
  },
  {
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%232e8f6e'/%3E%3Cpath d='M0 90 50 40l35 28 30-42 45 42v22z' fill='%23e4f4ec'/%3E%3Ccircle cx='38' cy='22' r='9' fill='%23e4f4ec'/%3E%3C/svg%3E",
    alt: 'Terraced hillside',
  },
  {
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%23b34a2e'/%3E%3Cpath d='M0 90 45 38l30 22 38-30 47 36v24z' fill='%23f7e3d9'/%3E%3Ccircle cx='124' cy='20' r='11' fill='%23f7e3d9'/%3E%3C/svg%3E",
    alt: 'Desert mesa at noon',
  },
  {
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%23303a5e'/%3E%3Cpath d='M0 90 55 34l32 26 36-38 37 32v36z' fill='%23dbe1f7'/%3E%3Ccircle cx='36' cy='18' r='8' fill='%23dbe1f7'/%3E%3C/svg%3E",
    alt: 'Snowfield under stars',
  },
];

const styles = stylex.create({
  viewport: {
    overflow: 'hidden',
  },
  track: {
    display: 'flex',
  },
  slide: {
    borderColor: color['--ult-color-border'],
    borderRadius: radius['--ult-radius-lg'],
    borderStyle: 'solid',
    borderWidth: border.hairline,
    flexBasis: '100%',
    flexGrow: 0,
    flexShrink: 0,
    minWidth: 0,
  },
  image: {
    blockSize: '100%',
    display: 'block',
    inlineSize: '100%',
    objectFit: 'cover',
  },
  controls: {
    display: 'flex',
    gap: space['--ult-space-2'],
    justifyContent: 'flex-end',
    marginBlockStart: space['--ult-space-4'],
  },
});

export default function CarouselRecipe() {
  const [viewportRef, api] = useEmblaCarousel();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };
    update();
    api.on('select', update).on('reInit', update);
    return () => {
      api.off('select', update).off('reInit', update);
    };
  }, [api]);

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Landscapes">
      <div ref={viewportRef} {...stylex.props(styles.viewport)}>
        <div {...stylex.props(styles.track)}>
          {SLIDES.map((slide, index) => (
            <AspectRatio
              key={slide.alt}
              ratio={16 / 9}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${SLIDES.length}`}
              style={styles.slide}
            >
              <img src={slide.src} alt={slide.alt} {...stylex.props(styles.image)} />
            </AspectRatio>
          ))}
        </div>
      </div>
      <div {...stylex.props(styles.controls)}>
        <Button variant="outline" size="sm" disabled={!canScrollPrev} onClick={() => api?.scrollPrev()}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={!canScrollNext} onClick={() => api?.scrollNext()}>
          Next
        </Button>
      </div>
    </div>
  );
}
