import { Foundation } from '../foundation';
import Content from '../content/elements.mdx';
import { elements } from '../elements';

export function ElementsPage() {
  return <Foundation Content={Content} labels={[`${elements.length} custom elements`, 'Light DOM · Zag']} />;
}
