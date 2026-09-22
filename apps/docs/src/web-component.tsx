import * as stylex from '@stylexjs/stylex';
import { Code, Table } from '@ultima/ui';
import { useEffect, useMemo } from 'react';

import { Demo } from './demo';
import { elementFor, loadElements } from './elements';
import { Fence, proseComponents } from './prose';

const { h2: H2, p: P, a: A } = proseComponents;

const styles = stylex.create({ cell: { verticalAlign: 'top' } });

function LiveElement({ html }: { html: string }) {
  useEffect(loadElements, []);
  return <div data-element-demo dangerouslySetInnerHTML={{ __html: html }} />;
}

export function WebComponent({ item }: { item: string }) {
  const element = elementFor(item);
  const install = [
    `npx shadcn add @ultima/${element.tag}`,
    '',
    `<script type="module" src="https://ultima.systems/elements/${element.tag}.js"></script>`,
  ].join('\n');
  const family = element.tags.slice(1);
  const Live = useMemo(() => () => <LiveElement html={element.example} />, [element]);

  return (
    <>
      <H2 id="web-component">Web component</H2>
      <P>
        The same component ships as the <Code>{`<${element.tag}>`}</Code> custom element for a host that
        cannot run React: the same tokens, the same axes as attributes, no framework. Install it as a registry
        item, or load the served file straight from this site.
      </P>
      <Fence code={install} lang="html" />
      <P>
        It renders into light DOM over <Code>/tokens.css</Code>, so your own CSS and token overrides reach it,
        and its inner parts carry <Code>part=</Code> attributes for styling. The whole story is on the{' '}
        <A href="/elements">Elements</A> page.
      </P>
      <Demo component={Live} source={element.example} lang="html" />
      {family.length > 0 ? (
        <P>
          A compound component is a family of tags, one per part:{' '}
          {family.map((tag, index) => (
            <span key={tag}>
              {index > 0 ? ', ' : ''}
              <Code>{`<${tag}>`}</Code>
            </span>
          ))}
          .
        </P>
      ) : null}
      {element.attributes.length > 0 ? (
        <Table.Root>
          <Table.Caption>Attributes of the {element.tag} element</Table.Caption>
          <Table.Head>
            <Table.Row>
              <Table.HeadCell>Attribute</Table.HeadCell>
              <Table.HeadCell>On</Table.HeadCell>
              <Table.HeadCell>Values</Table.HeadCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {element.attributes.map((attribute) => (
              <Table.Row key={`${attribute.on}-${attribute.name}`}>
                <Table.Cell style={styles.cell}>
                  <Code>{attribute.name}</Code>
                </Table.Cell>
                <Table.Cell style={styles.cell}>
                  <Code>{attribute.on}</Code>
                </Table.Cell>
                <Table.Cell style={styles.cell}>
                  {Array.isArray(attribute.values)
                    ? attribute.values.map((value, index) => (
                        <span key={value}>
                          {index > 0 ? ' | ' : ''}
                          <Code>{value}</Code>
                        </span>
                      ))
                    : attribute.values}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      ) : (
        <P>It takes no attributes of its own: content and tokens are the whole surface.</P>
      )}
    </>
  );
}
