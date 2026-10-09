import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import * as stylex from '@stylexjs/stylex';
import { colorScheme, darkTheme, lightTheme, resolveDraft } from '@ultima/tokens';
import { expect, onTestFinished, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { productDraft } from '../build-a-screen';
import InteractionStates from '../examples/complete-screen/interaction-states';
import StyleOverrides from '../examples/complete-screen/style-overrides';
import { blocks } from '../generated/blocks';
import { compositionExamples, recipeSources } from '../generated/recipes';
import { routeTree } from '../router';
import { ThemeBoundary } from '../theme-boundary';
import '../styles.css';

const router = () => createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/build-a-screen'] }) });
const mount = () => render(<RouterProvider router={router()} />);

const LESSONS = [
  'Responsive screen',
  'Typography',
  'Component style overrides',
  'Interaction states',
  'Product semantic tokens',
  'Adapt an existing block',
];

/** The lesson's section: its heading and everything up to the next h2. */
function section(title: string): Element[] {
  const heading = [...document.querySelectorAll('main h2')].find((node) => node.textContent === title)!;
  const nodes: Element[] = [];
  for (let node = heading.parentElement?.matches('div') && heading.parentElement.childElementCount === 1 ? heading.parentElement.nextElementSibling : heading.nextElementSibling; node && node.tagName !== 'H2'; node = node.nextElementSibling) nodes.push(node);
  return nodes;
}

test('the guide publishes the six inventory lessons, each under its anchor with its derived install command', async () => {
  const screen = await mount();
  await expect.element(screen.getByRole('heading', { name: 'Build a screen', level: 1 })).toBeVisible();
  expect(compositionExamples.map(({ title }) => title)).toEqual(LESSONS);
  for (const lesson of compositionExamples) {
    const heading = [...document.querySelectorAll('main h2')].find((node) => node.textContent === lesson.title);
    expect(heading, lesson.title).toBeDefined();
    if (lesson.route === '/build-a-screen') expect(heading!.id).toBe(lesson.anchor);
    const fences = section(lesson.title).flatMap((node) => [...node.querySelectorAll('pre')].map((pre) => pre.textContent));
    expect(fences, lesson.title).toContain(lesson.install);
  }
});

test('each lesson that copies source shows the projected bundle, every file at its destination', async () => {
  const screen = await mount();
  await expect.element(screen.getByRole('heading', { name: 'Build a screen', level: 1 })).toBeVisible();
  for (const lesson of compositionExamples.filter(({ files }) => files.length > 0)) {
    const figure = section(lesson.title).find((node) => node.matches('figure'))!;
    expect(figure, lesson.title).toBeDefined();
    const bundle = recipeSources[lesson.files[0]!.source]!;
    expect(bundle.files.map(({ path }) => path)).toEqual(lesson.files.map(({ destination }) => destination));
    const view = page.elementLocator(figure);
    await userEvent.click(view.getByRole('tab', { name: 'Code', exact: true }));
    for (const file of bundle.files) {
      if (bundle.files.length > 1) await userEvent.click(view.getByRole('tab', { name: file.path, exact: true }));
      // The code panel follows the kept-mounted preview, whose own markup can hold a `pre`.
      await expect.poll(() => [...figure.querySelectorAll('pre')].at(-1)?.textContent).toBe(file.content);
      expect(file.content).not.toMatch(/from ['"]@ultima\//);
    }
  }
});

test('the screen lessons frame their own previews, and Settings 01 frames its block preview', async () => {
  const screen = await mount();
  await expect.element(screen.getByRole('heading', { name: 'Build a screen', level: 1 })).toBeVisible();
  const frames = [...document.querySelectorAll('main iframe')].map((frame) => frame.getAttribute('src'));
  expect(frames).toEqual(['/build-a-screen/projects/preview', '/build-a-screen/product-tokens/preview', '/blocks/settings-01/preview']);
});

test('every link on the page resolves to a served route and, for a same-page hash, a heading', async () => {
  const screen = await mount();
  await expect.element(screen.getByRole('heading', { name: 'Build a screen', level: 1 })).toBeVisible();
  await expect.poll(() => document.querySelector('main a[href^="/theme-studio#theme="]')).not.toBeNull();
  const served = Object.keys(router().routesByPath).map((path) => new RegExp(`^${path.replace(/\$[a-z]+/g, '[^/]+')}$`));
  const links = [...document.querySelectorAll<HTMLAnchorElement>('main a[href^="/"]')];
  for (const link of links) {
    const pathname = link.pathname.replace(/\/$/, '') || '/';
    expect(served.some((route) => route.test(pathname)), link.href).toBe(true);
    if (link.pathname === '/build-a-screen' && link.hash) expect(document.getElementById(link.hash.slice(1)), link.href).not.toBeNull();
  }
  const hrefs = links.map((link) => link.getAttribute('href'));
  for (const target of ['/install', '/theme-studio', '/recipes', '/components/code#typography', '/blocks/settings-01']) expect(hrefs).toContain(target);
  const screens = screen.getByRole('list', { name: 'Complete screens' });
  for (const block of blocks) {
    await expect.element(screens.getByRole('link', { name: block.title, exact: true })).toHaveAttribute('href', `/blocks/${block.id}`);
    expect(screens.element().textContent).toContain(block.description);
  }
});

test('the product theme command installs the proof draft from the theme registry', async () => {
  const screen = await mount();
  await expect.poll(() => document.querySelector('main a[href^="/theme-studio#theme="]')).not.toBeNull();
  const command = [...document.querySelectorAll('main pre')].map((pre) => pre.textContent ?? '').find((text) => text.includes('/r/theme.json?theme='))!;
  const url = new URL(command.match(/"([^"]+)"/)![1]!);
  const item = await (await fetch(`${url.pathname}${url.search}`)).json();
  expect(item.files.map((file: { target: string }) => file.target)).toEqual(['~/ultima-theme.css', '~/ultima-theme.json', '~/DESIGN.md']);
  expect(JSON.parse(item.files[1].content)).toEqual(productDraft);
  await screen.unmount();
});

test('install sends readers on to the guide', async () => {
  const screen = render(<RouterProvider router={createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ['/install'] }) })} />);
  await expect.element((await screen).getByRole('link', { name: 'Build a screen', exact: true }).last()).toHaveAttribute('href', '/build-a-screen');
});

test('/llms.txt lists each lesson once, with its canonical URL and install command', async () => {
  const guide = await (await fetch('/llms.txt')).text();
  const part = guide.split('\n## Build a screen\n')[1]!.split('\n## ')[0]!;
  for (const lesson of compositionExamples) {
    expect(part.split(`### ${lesson.title}\n`).length - 1, lesson.title).toBe(1);
    expect(part).toContain(`https://ultima.systems${lesson.route}#${lesson.anchor}`);
    expect(part).toContain(lesson.install);
  }
  expect(part).toContain("import { Settings01 } from '@/components/settings-01/settings-01'");
  expect(new TextEncoder().encode(guide).byteLength).toBeLessThanOrEqual(64 * 1024);
});

/** The framed preview route, mounted directly. */
function preview(lesson: string) {
  const history = createMemoryHistory({ initialEntries: [`/build-a-screen/${lesson}/preview`] });
  return render(<RouterProvider router={createRouter({ routeTree, history })} />);
}

test('the product-token preview puts the draft on the root, and the screen, its control and its Dialog read it', async () => {
  const screen = await preview('product-tokens');
  await expect.element(screen.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
  const scheme = getComputedStyle(document.documentElement).colorScheme.includes('light') ? 'light' : 'dark';
  const expected = resolveDraft(productDraft)[scheme];
  const accent = expected['--ult-color-accent']!;
  expect(document.documentElement.style.getPropertyValue('--ult-color-accent')).toBe(accent);
  const create = screen.getByRole('button', { name: 'Create project', exact: true }).element();
  expect(getComputedStyle(create).getPropertyValue('--ult-color-accent').trim()).toBe(accent);
  await userEvent.click(screen.getByRole('button', { name: 'Edit Aster', exact: true }));
  const dialog = screen.getByRole('dialog', { name: 'Edit Aster' });
  await expect.element(dialog).toBeVisible();
  expect(getComputedStyle(dialog.element()).getPropertyValue('--ult-color-surface-raised').trim()).toBe(expected['--ult-color-surface-raised']);
  await userEvent.keyboard('{Escape}');
  await screen.unmount();
  expect(document.documentElement.style.getPropertyValue('--ult-color-accent')).toBe('');
});

test('the Projects preview stays on the installed base theme, and an unknown lesson is not found', async () => {
  const screen = await preview('projects');
  await expect.element(screen.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
  expect(document.documentElement.style.getPropertyValue('--ult-color-accent')).toBe('');
  await screen.unmount();
  const missing = await preview('missing');
  await expect.element(missing.getByRole('heading', { level: 1 })).not.toHaveTextContent('Projects');
});

const modes = { dark: stylex.props(darkTheme, colorScheme.dark), light: stylex.props(lightTheme, colorScheme.light) };

function luminance(value: string) {
  const [r, g, b] = value.match(/[\d.]+/g)!.slice(0, 3).map((channel) => {
    const c = Number(channel) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
};
/** The paint behind `node`: its own background, or the nearest painted ancestor's. */
function ground(node: Element): string {
  for (let at: Element | null = node; at; at = at.parentElement) {
    const paint = getComputedStyle(at).backgroundColor;
    if (paint !== 'rgba(0, 0, 0, 0)' && paint !== 'transparent') return paint;
  }
  return getComputedStyle(document.body).backgroundColor;
}

for (const mode of ['dark', 'light'] as const) {
  test(`style overrides keep the focus ring, disabled behavior and readable text in ${mode}`, async () => {
    const root = document.documentElement;
    const classes = modes[mode].className?.split(/\s+/).filter(Boolean) ?? [];
    root.classList.add(...classes);
    onTestFinished(() => root.classList.remove(...classes));
    const screen = await render(
      <ThemeBoundary mode={mode}>
        <StyleOverrides />
      </ThemeBoundary>,
    );
    const send = screen.getByRole('button', { name: 'Send invitation' });
    const resend = screen.getByRole('button', { name: 'Resend invitation' });

    await userEvent.keyboard('{Tab}');
    await expect.element(send).toHaveFocus();
    // The ring and the overridden height resolve to the same tokens a probe in the same theme reads.
    const probe = document.createElement('span');
    probe.style.cssText = 'display:block;color:var(--ult-color-border-focus);height:var(--ult-space-11)';
    send.element().parentElement!.append(probe);
    onTestFinished(() => probe.remove());
    const ring = getComputedStyle(send.element());
    expect(ring.outlineStyle).toBe('solid');
    expect(ring.outlineWidth).toBe('2px');
    expect(ring.outlineColor).toBe(getComputedStyle(probe).color);
    expect(ring.height).toBe(getComputedStyle(probe).height);
    // The disabled Button keeps its native disabled state, so Tab passed over it to Send invitation.
    await expect.element(resend).toBeDisabled();
    expect(getComputedStyle(resend.element()).opacity).toBe('0.5');

    for (const node of [
      screen.getByRole('heading', { name: 'Invite a teammate' }).element(),
      screen.getByText('They join the Northwind workspace with editor access.').element(),
      screen.getByText(/^Invitations expire/).element(),
      send.element(),
    ]) {
      expect(contrast(getComputedStyle(node).color, ground(node)), node.textContent ?? '').toBeGreaterThanOrEqual(4.5);
    }
  });
}

test('interaction states are each reached by real input', async () => {
  const screen = await render(<InteractionStates />);
  const email = screen.getByRole('textbox', { name: 'Email address' });
  const send = screen.getByRole('button', { name: 'Send invite' });
  const status = screen.getByRole('status');

  await expect.element(send).toBeDisabled();
  await userEvent.click(email);
  await userEvent.keyboard('{Enter}');
  await expect.element(email).not.toHaveAttribute('aria-invalid', 'true');

  await userEvent.type(email, 'ada.example.com');
  await expect.element(send).toBeEnabled();
  await userEvent.keyboard('{Enter}');
  await expect.element(email).toHaveAttribute('aria-invalid', 'true');
  const described = (email.element().getAttribute('aria-describedby') ?? '').split(/\s+/).map((id) => document.getElementById(id)?.textContent);
  expect(described).toContain('Enter an email address that includes @.');
  await expect.element(status).toHaveTextContent('');

  await userEvent.clear(email);
  await userEvent.type(email, 'ada@example.com');
  await expect.element(email).not.toHaveAttribute('aria-invalid', 'true');
  await userEvent.click(send);
  await expect.element(status).toHaveTextContent('Invited ada@example.com.');
  await expect.element(email).toHaveValue('');
  await expect.element(send).toBeDisabled();

  const review = screen.getByRole('button', { name: 'Review pending invites' });
  review.element().focus();
  await userEvent.keyboard('{Enter}');
  const dialog = screen.getByRole('dialog', { name: 'Pending invites' });
  await expect.element(dialog).toBeVisible();
  await expect.poll(() => dialog.element().textContent).toContain('1 invite is waiting for an answer.');
  await userEvent.keyboard('{Escape}');
  await expect.element(dialog).not.toBeInTheDocument();
  await expect.element(review).toHaveFocus();

  await userEvent.keyboard('{Enter}');
  await userEvent.click(screen.getByRole('button', { name: 'Revoke all' }));
  await expect.element(screen.getByRole('dialog')).not.toBeInTheDocument();
  await expect.element(status).toHaveTextContent('Revoked 1 pending invite.');
  await expect.element(review).toHaveFocus();
});
