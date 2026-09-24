import type { Diagnostic } from '../diagnostic.ts';
import { APP_RULES, RULES } from '../rules.ts';
import type { Scope } from '../scope.ts';
import { type Parsed, parseSource, positionAt } from '../sources.ts';

export type Finding = {
  ruleId: string;
  parsed: Parsed;
  start: number;
  end: number;
  symbol?: string;
  target?: string;
  selector?: string;
  expression?: string;
  message: string;
  repair: string;
  link: string;
  /** Overrides the rule's own severity: `ULT-ANALYSIS-001` against an advisory rule is itself advisory. */
  severity?: Diagnostic['severity'];
};

export type Context = {
  scope: Scope;
  /** The parsed file, or undefined when it cannot be read or parsed; either is already reported. */
  source(path: string): Parsed | undefined;
  report(finding: Finding): void;
  diagnostics: Diagnostic[];
  /** Whether a rule already reported this file and line, so a later rule does not repeat the site. */
  reportedAt(file: string, line: number): boolean;
};

export function severityOf(ruleId: string): Diagnostic['severity'] {
  if (ruleId === 'ULT-ANALYSIS-001') return 'incomplete';
  const rule = (RULES as Record<string, { status: string }>)[ruleId] ?? (APP_RULES as Record<string, { status: string }>)[ruleId];
  return rule?.status === 'advisory' ? 'advisory' : 'blocking';
}

export function createContext(scope: Scope): Context {
  const diagnostics: Diagnostic[] = [];
  const parsedFiles = new Map<string, Parsed | undefined>();

  const report = ({ parsed, start, end, severity, ...rest }: Finding) => {
    diagnostics.push({
      ruleId: rest.ruleId,
      severity: severity ?? severityOf(rest.ruleId),
      file: parsed.path,
      start: positionAt(parsed.text, start),
      end: positionAt(parsed.text, end),
      ...(rest.symbol !== undefined && { symbol: rest.symbol }),
      ...(rest.target !== undefined && { target: rest.target }),
      ...(rest.selector !== undefined && { selector: rest.selector }),
      ...(rest.expression !== undefined && { expression: rest.expression }),
      message: rest.message.charAt(0).toUpperCase() + rest.message.slice(1),
      repair: rest.repair,
      link: rest.link,
    });
  };

  const source = (path: string) => {
    if (parsedFiles.has(path)) return parsedFiles.get(path);
    const text = scope.files.read(path);
    let parsed: Parsed | undefined;
    if (text === undefined) {
      diagnostics.push({
        ruleId: 'ULT-ANALYSIS-001',
        severity: 'incomplete',
        file: path,
        start: { line: 1, column: 1 },
        end: { line: 1, column: 1 },
        message: 'The source is in the inventory but cannot be read.',
        repair: 'Check the file exists and is readable, then run the check again.',
        link: RULES['ULT-ANALYSIS-001'].link,
      });
    } else {
      parsed = parseSource(path, text);
      // The first syntax error locates the failure; the ones after it are usually its echoes.
      const [problem, ...more] = parsed.problems;
      if (problem) {
        const echoes = more.length > 0 ? ` (and ${more.length} more after it)` : '';
        report({
          ruleId: 'ULT-ANALYSIS-001',
          parsed,
          start: problem.start,
          end: problem.end,
          message: `The source does not parse: ${problem.message}${echoes}`,
          repair: 'Fix the syntax error; a file that does not parse leaves every rule over it unestablished.',
          link: RULES['ULT-ANALYSIS-001'].link,
        });
      }
      if (parsed.problems.length > 0) parsed = undefined;
    }
    parsedFiles.set(path, parsed);
    return parsed;
  };

  const reportedAt = (file: string, line: number) => diagnostics.some((diagnostic) => diagnostic.file === file && diagnostic.start.line === line);

  return { scope, source, report, diagnostics, reportedAt };
}
