import * as stylex from '@stylexjs/stylex';
import { space } from '@ultima/tokens/tokens.stylex';
import { Badge, Icon } from '@ultima/ui';
import { CheckIcon, GitBranchIcon } from 'lucide-react';

const styles = stylex.create({
  row: { alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: space['--ult-space-3'] },
});

export default function Status() {
  return (
    <div {...stylex.props(styles.row)}>
      <Badge tone="success" dot>
        Operational
      </Badge>
      <Badge variant="outline" tone="warning" dot>
        Degraded
      </Badge>
      <Badge variant="outline" dot>
        Offline
      </Badge>
      <Badge tone="success">
        <Icon>
          <CheckIcon />
        </Icon>
        Passing
      </Badge>
      <Badge variant="outline">
        <Icon>
          <GitBranchIcon />
        </Icon>
        main
      </Badge>
    </div>
  );
}
