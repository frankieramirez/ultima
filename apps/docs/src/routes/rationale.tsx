import { decisions } from '../decision';
import { records } from '../decision-records';
import { Foundation } from '../foundation';
import Content from '../content/rationale.mdx';

export function RationalePage() {
  return (
    <Foundation
      Content={Content}
      labels={[`${decisions.length} decisions · ${records.length} records`, 'The reading version']}
    />
  );
}
