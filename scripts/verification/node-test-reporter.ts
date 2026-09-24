/**
 * A `node --test` reporter for the verification adapters: one JSON line per finished test or suite,
 * with its file, nesting, outcome and, for a failure, the kind Node assigns it. The spec reporter
 * still prints the human log beside it. It reports what the runner saw and decides nothing.
 */
type Event = {
  type: string;
  data: {
    name: string;
    nesting: number;
    file?: string;
    line?: number;
    skip?: string | boolean;
    todo?: string | boolean;
    details?: { type?: 'test' | 'suite'; error?: { failureType?: string; code?: string; message?: string; cause?: unknown } };
  };
};

export type NodeTestRecord = {
  event: 'pass' | 'fail';
  kind: 'test' | 'suite';
  file: string | null;
  name: string;
  nesting: number;
  line: number | null;
  skip: boolean;
  todo: boolean;
  failureType: string | null;
  message: string | null;
};

function describe(cause: unknown): string | null {
  if (cause instanceof Error) return cause.message;
  if (cause === undefined || cause === null) return null;
  return typeof cause === 'string' ? cause : JSON.stringify(cause);
}

export default async function* reporter(source: AsyncIterable<Event>): AsyncGenerator<string> {
  for await (const { type, data } of source) {
    if (type !== 'test:pass' && type !== 'test:fail') continue;
    const error = data.details?.error;
    const record: NodeTestRecord = {
      event: type === 'test:pass' ? 'pass' : 'fail',
      kind: data.details?.type === 'suite' ? 'suite' : 'test',
      file: data.file ?? null,
      name: data.name,
      nesting: data.nesting,
      line: data.line ?? null,
      skip: data.skip !== undefined && data.skip !== false,
      todo: data.todo !== undefined && data.todo !== false,
      failureType: error?.failureType ?? null,
      message: error ? (describe(error.cause) ?? error.message ?? null) : null,
    };
    yield `${JSON.stringify(record)}\n`;
  }
}
