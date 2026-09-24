import { Prose } from '../prose';
import Content from '../content/elements.mdx';

export function ElementsPage() {
  return (
    <Prose
      Content={Content}
      breadcrumb={[{ label: 'Install', to: '/install' }, { label: 'Elements' }]}
    />
  );
}
