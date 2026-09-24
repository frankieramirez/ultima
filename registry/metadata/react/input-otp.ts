import type { ReactDescriptor } from '../schema.ts';

export default {
  id: 'input-otp',
  kind: 'react',
  title: 'Input OTP',
  description: 'A one-time-code field of uniform square slots, on Base UI.',
  contract: 'docs/spec/ultima.md#the-button-group-input-group-input-otp-and-native-select-set',
  installDocs: 'import { InputOTP } from \'@/components/ui/input-otp\';\n\n<label htmlFor="code">Verification code</label>\n<InputOTP.Root id="code" length={6}>\n  {Array.from({ length: 6 }, (_, index) => (\n    <InputOTP.Input key={index} aria-label={index === 0 ? undefined : `Character ${index + 1} of 6`} />\n  ))}\n</InputOTP.Root>\n\nlength is required; the consumer renders one Input per slot. size sits on Root and reaches the slots through context. Slots two through N take their own aria-label because the first slot is named by the field\'s label.',
  primaryExport: 'InputOTP',
  release: 'v0.2',
  order: 20,
} satisfies ReactDescriptor;
