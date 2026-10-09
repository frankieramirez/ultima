import { Foundation } from '../foundation';
import Content from '../content/support.mdx';

export function SupportPage() {
  return <Foundation Content={Content} labels={['Tested versions', 'Known gaps']} />;
}
