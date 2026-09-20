import { Prose } from '../prose';
import Content from '../content/install.mdx';

export function InstallPage() {
  return <Prose Content={Content} breadcrumb="DOCUMENTATION / INSTALL" />;
}
