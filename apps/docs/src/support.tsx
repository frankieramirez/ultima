import { Code } from '@ultima/ui';

import { P } from './foundation';
import { proseComponents } from './prose';
import evidence from './support-evidence.json';

const { a: A, table: Table, th: Th, td: Td, ul: Ul, li: Li } = proseComponents;

const REPOSITORY = 'https://github.com/frankieramirez/ultima';

/** The manifest the page renders; `scripts/consumer-evidence.ts` writes it from the latest full matrix run. */
export const support = evidence;

const ENGINE_NAMES: Record<string, string> = { chromium: 'Chromium', firefox: 'Firefox', webkit: 'WebKit' };
const LAYOUT_NAMES: Record<string, string> = { vite: 'Vite React', 'next-app': 'Next.js App Router, root app', 'next-src': 'Next.js App Router, src/app' };

export const fixtureName = ({ layout, exercise }: { layout: string; exercise: string }) =>
  exercise === 'elements' ? 'Custom elements, plain Vite' : LAYOUT_NAMES[layout] ?? layout;
export const issueUrl = (issue: string) => `${REPOSITORY}/issues/${issue.replace(/^#/, '')}`;
export const engineList = (engines: string[]) => engines.map((engine) => ENGINE_NAMES[engine] ?? engine).join(', ');

export function EvidenceSummary() {
  const { run, matrix, platform } = support;
  return (
    <P>
      Last full run: {run.date.slice(0, 10)}, revision{' '}
      <A href={`${REPOSITORY}/commit/${run.revision}`}>
        <Code>{run.revision.slice(0, 7)}</Code>
      </A>
      , <A href={run.url}>run {run.id}</A>. All {matrix.cells} registered cells passed in {engineList(matrix.engines)} on {platform.os}{' '}
      {platform.arch}.
    </P>
  );
}

export function TestedVersions() {
  const { browsers, tools, cli, fixtures } = support;
  const packages = [...new Set(fixtures.flatMap((fixture) => Object.keys(fixture.versions)))];
  return (
    <>
      <Table aria-label="Browser engines">
        <thead>
          <tr>
            <Th>Engine</Th>
            <Th>Version</Th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(browsers).map(([engine, version]) => (
            <tr key={engine}>
              <Td>{ENGINE_NAMES[engine] ?? engine}</Td>
              <Td>
                <Code>{version}</Code>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Table aria-label="Package versions per fixture">
        <thead>
          <tr>
            <Th>Package</Th>
            {fixtures.map((fixture) => (
              <Th key={fixture.id}>{fixtureName(fixture)}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {packages.map((name) => (
            <tr key={name}>
              <Td>
                <Code>{name}</Code>
              </Td>
              {fixtures.map((fixture) => {
                const version = (fixture.versions as Record<string, string | undefined>)[name];
                return <Td key={fixture.id}>{version ? <Code>{version}</Code> : 'not installed'}</Td>;
              })}
            </tr>
          ))}
        </tbody>
      </Table>
      <P>
        Node <Code>{tools.node}</Code> with npm <Code>{tools.npm}</Code>. The CLI is <Code>ultima-design</Code>{' '}
        <Code>{cli.version}</Code>, installed from the packed tarball with SHA-256 <Code>{cli.tarballDigest.slice(0, 12)}</Code>.
      </P>
    </>
  );
}

export function TestedRecipes() {
  return (
    <Table aria-label="Tested setups">
      <thead>
        <tr>
          <Th>Setup</Th>
          <Th>Entry</Th>
          <Th>Cells</Th>
        </tr>
      </thead>
      <tbody>
        {support.fixtures.map((fixture) => (
          <tr key={fixture.id}>
            <Td>{fixtureName(fixture)}</Td>
            <Td>
              <Code>{fixture.setup ?? 'tokens-css'}</Code>
            </Td>
            <Td>{fixture.cells}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** The components the RTL fixture covers, less those a known gap excludes from the RTL claim. */
export function RtlClaim() {
  const excluded = support.knownGaps.filter((gap) => gap.bundle === 'direction-locale').map((gap) => gap.component);
  return (
    <P>
      Excluded from the RTL claim: <strong>{excluded.join(', ')}</strong>. Each one's failing case is listed under Known
      gaps.
    </P>
  );
}

export function KnownGaps() {
  return (
    <Ul aria-label="Known gaps">
      {support.knownGaps.map((gap) => (
        <Li key={`${gap.bundle}/${gap.assertion}`}>
          <strong>{gap.component}</strong>, <Code>{gap.assertion}</Code> in the {gap.bundle} bundle,{' '}
          {gap.engines.length === support.matrix.engines.length ? 'all engines' : engineList(gap.engines)}
          {gap.issue ? (
            <>
              , <A href={issueUrl(gap.issue)}>{gap.issue}</A>
            </>
          ) : null}
          . {gap.reason} The last run recorded it in {gap.observed.length} of {gap.engines.length * 2} cells.
        </Li>
      ))}
    </Ul>
  );
}

export function OpenGaps() {
  return (
    <Ul aria-label="Open evidence gaps">
      {support.openGaps.map((gap) => (
        <Li key={gap.id}>
          <strong>{gap.title}.</strong> {gap.closes}
        </Li>
      ))}
    </Ul>
  );
}

export function EvidenceReports() {
  return (
    <>
      <Table aria-label="Retained reports">
        <thead>
          <tr>
            <Th>Report</Th>
            <Th>Cells</Th>
            <Th>SHA-256</Th>
          </tr>
        </thead>
        <tbody>
          {support.fixtures.map((fixture) => (
            <tr key={fixture.id}>
              <Td>
                <Code>{fixture.report}</Code>
              </Td>
              <Td>{fixture.cells}</Td>
              <Td>
                <Code>{fixture.reportDigest.slice(0, 12)}</Code>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <P>
        Each report is an artifact of <A href={support.run.url}>run {support.run.id}</A>, kept for 90 days. The{' '}
        <A href={`${REPOSITORY}/blob/main/apps/docs/src/support-evidence.json`}>evidence manifest</A> holds every value on this
        page.
      </P>
    </>
  );
}
