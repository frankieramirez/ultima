import { Link } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { createRegistryUrl, encodeFragment, resolveDraft } from '@ultima/tokens';
import { space } from '@ultima/tokens/tokens.stylex';
import { useContext, useEffect, useLayoutEffect, useState } from 'react';

import { BlockFrame, PreviewFrame } from './block-frame';
import InteractionStates from './examples/complete-screen/interaction-states';
import Projects from './examples/complete-screen/projects';
import { blocks } from './generated/blocks';
import { compositionExamples, recipeSources } from './generated/recipes';
import { proofDraft } from './proof-draft';
import { P } from './foundation';
import { Fence, proseComponents } from './prose';
import { TextLink } from './text-link';
import { useResolvedScheme } from './theme';
import { BoundaryPortalContext } from './theme-boundary';

const styles = stylex.create({
  frame: { marginBlock: space['--ult-space-6'] },
});

const lesson = (id: string) => {
  const example = compositionExamples.find((entry) => entry.id === id);
  if (!example) throw new Error(`no Build a screen lesson "${id}"`);
  return example;
};

/** The lesson's copy bundle, from the consumer-copy projection. */
export const lessonSource = (id: string) => recipeSources[lesson(id).files[0]!.source]!;

export function LessonInstall({ id }: { id: string }) {
  return <Fence code={lesson(id).install} lang="shell" title="Terminal" />;
}

/** The installed-consumer proof's draft: non-stock, and passing every Studio pairing in both modes. */
export const productDraft = proofDraft();

/** The lessons that render a whole screen, each framed from its own bare route so it lays out for the frame's viewport. */
export const SCREEN_LESSONS = ['projects', 'product-tokens'];

export function ProjectsFrame() {
  return <PreviewFrame src="/build-a-screen/projects/preview" title="Projects preview" />;
}

export function ProductTokensFrame() {
  return <PreviewFrame src="/build-a-screen/product-tokens/preview" title="Projects in a custom theme preview" />;
}

/**
 * A framed screen lesson. The product-token lesson puts its draft's values on the root, as an installed
 * theme stylesheet does, so the document, the screen and its body portals all read them.
 */
export function ScreenPreview({ id }: { id: string }) {
  const scheme = useResolvedScheme();
  const draft = id === 'product-tokens';
  useLayoutEffect(() => {
    if (!draft) return;
    const root = document.documentElement.style;
    const values = Object.entries(resolveDraft(productDraft)[scheme]);
    for (const [name, value] of values) root.setProperty(name, value);
    return () => values.forEach(([name]) => root.removeProperty(name));
  }, [draft, scheme]);
  return <Projects />;
}

/** The Dialog portals into the theme boundary that shows the example. */
export function InteractionStatesPreview() {
  return <InteractionStates container={useContext(BoundaryPortalContext)} />;
}

export function ProductThemeInstall() {
  const [links, setLinks] = useState<{ command: string; studio: string }>();
  useEffect(() => {
    let active = true;
    void Promise.all([createRegistryUrl(productDraft, 'https://ultima.systems'), encodeFragment(productDraft)]).then(([registry, fragment]) => {
      if (active && !registry.tooLong) setLinks({ command: `npx shadcn add "${registry.url}"`, studio: `/theme-studio${fragment.fragment}` });
    });
    return () => {
      active = false;
    };
  }, []);
  if (!links) return <P>Preparing the theme command.</P>;
  return (
    <>
      <Fence code={links.command} lang="shell" title="Terminal" />
      <P>
        <TextLink render={<a href={links.studio} />}>Open this draft in Theme Studio</TextLink> to change it before you export.
      </P>
    </>
  );
}

const settings = blocks.find((block) => block.id === 'settings-01')!;

export function SettingsPreview() {
  return (
    <div {...stylex.props(styles.frame)}>
      <BlockFrame block={settings} />
    </div>
  );
}

const { ul: Ul, li: Li } = proseComponents;

/** Every installable complete screen, with what it supplies. */
export function CompleteScreens() {
  return (
    <Ul aria-label="Complete screens">
      {blocks.map((block) => (
        <Li key={block.id}>
          <TextLink render={<Link to="/blocks/$id" params={{ id: block.id }} />}>{block.title}</TextLink>: {block.description}
        </Li>
      ))}
    </Ul>
  );
}
