import { Fragment } from 'react';
import { Field, InputOTP } from '@ultima/ui';

const GROUP = 3;
const LENGTH = 6;

export default function Groups() {
  return (
    <Field.Root>
      <Field.Label>Backup code</Field.Label>
      <Field.Description>The six-character code from your recovery kit.</Field.Description>
      <InputOTP.Root length={LENGTH}>
        {Array.from({ length: LENGTH }, (_, index) => (
          <Fragment key={index}>
            {index > 0 && index % GROUP === 0 ? <InputOTP.Separator /> : null}
            <InputOTP.Input
              aria-label={index === 0 ? undefined : `Character ${index + 1} of ${LENGTH}`}
            />
          </Fragment>
        ))}
      </InputOTP.Root>
    </Field.Root>
  );
}
