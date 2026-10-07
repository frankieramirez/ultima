import * as stylex from '@stylexjs/stylex';
import { font, space, text } from '@ultima/tokens/tokens.stylex';
import { Button } from '@ultima/ui/button';
import { NativeSelect } from '@ultima/ui/native-select';

import { GitHubGlyph } from './icons';

const DESKTOP = '@media (min-width: 48rem)';

const styles = stylex.create({
  region: {
    display: { default: 'flex', [DESKTOP]: 'grid' },
    gap: space['--ult-space-6'],
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    maxInlineSize: `calc(9 * ${space['--ult-space-10']})`,
  },
  title: {
    fontSize: text['--ult-text-5'],
    fontWeight: font['--ult-font-weight-semibold'],
    margin: 0,
  },
});

export function Region() {
  return (
    <section aria-labelledby="region-title" {...stylex.props(styles.region)}>
      <h2 id="region-title" {...stylex.props(styles.title)}>
        Region
      </h2>
      <Button render={<a href="#more" />} variant="outline">
        <GitHubGlyph />
        More
      </Button>
      <NativeSelect.Root>
        <NativeSelect.Select aria-label="Zone">
          {['UTC', 'Europe/Oslo'].map((zone) => (
            <option key={zone}>{zone}</option>
          ))}
        </NativeSelect.Select>
      </NativeSelect.Root>
    </section>
  );
}
