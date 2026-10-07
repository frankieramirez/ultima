import { Foundation } from '../foundation';
import Content from '../content/install.mdx';

export function InstallPage() {
  return <Foundation Content={Content} labels={['Shadcn-compatible registry', 'Vite · Next.js']} />;
}
