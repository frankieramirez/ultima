import { Prose } from '../prose';
import Content from '../content/cli.mdx';

export function CliPage() {
  return <Prose Content={Content} breadcrumb={[{ label: 'CLI' }]} />;
}
