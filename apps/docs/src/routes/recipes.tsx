import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Card } from '@ultima/ui';

import { DocumentLayout } from '../document-layout';
import { recipes } from '../generated/recipes';
import { Fence } from '../prose';
import { TextLink } from '../text-link';
import { headings } from '../typography';

const styles = stylex.create({
  list: { display: 'grid', gap: space['--ult-space-7'], listStyle: 'none', marginBlock: space['--ult-space-7'], padding: 0 },
  body: { display: 'flex', flexDirection: 'column', gap: space['--ult-space-4'] },
});

export function RecipesPage() {
  return (
    <DocumentLayout breadcrumb={[]}>
      <h1 {...stylex.props(headings.h1)}>Recipes</h1>
      <p>Copyable compositions of installed components. Install the dependencies, then open the canonical example to copy or download its source.</p>
      <p>The source uses the default components.json aliases. Substitute your own aliases and keep interactive examples behind a Next.js client boundary.</p>
      <ul aria-label="Recipes" {...stylex.props(styles.list)}>
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <Card.Root>
              <Card.Body style={styles.body}>
                <h2 {...stylex.props(headings.h2)}>
                  <TextLink render={<Link to="/components/$name" params={{ name: recipe.page }} hash={recipe.section} />}>
                    {recipe.title}
                  </TextLink>
                </h2>
                <p>{recipe.description}</p>
                <p>Items: {recipe.items.join(', ')}.</p>
                <p>Engine dependencies: {recipe.dependencies.length ? recipe.dependencies.join(', ') : 'None'}.</p>
                <Fence code={[recipe.install, recipe.engines].filter(Boolean).join('\n')} lang="bash" title="Install dependencies" />
                <TextLink render={<Link to="/components/$name" params={{ name: recipe.page }} hash={recipe.section} />}>
                  Open canonical example and source
                </TextLink>
              </Card.Body>
            </Card.Root>
          </li>
        ))}
      </ul>
    </DocumentLayout>
  );
}
