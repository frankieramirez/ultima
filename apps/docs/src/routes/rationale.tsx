import { Prose } from '../prose';
import Content from '../content/rationale.mdx';

export function RationalePage() {
  return <Prose Content={Content} breadcrumb="DOCUMENTATION / RATIONALE" />;
}
