# Complete-screen composition guide

Decided on [Decide the complete-screen composition guide and recipe discovery](https://github.com/frankieramirez/ultima/issues/728), part of [Map: Make Ultima a plug-and-play StyleX design system](https://github.com/frankieramirez/ultima/issues/725).

Status: accepted for implementation. This outline specifies future guidance and checks. The public routes, new example sources and verification registrations named below are proposed. This decision has produced no rendered consumer evidence.

## Public reading path

Add **Build a screen** at `/build-a-screen`, linked from Installation's next steps and the docs' Foundations navigation. It takes a supported, empty application through one themed responsive Projects screen. Readers can follow the whole walkthrough or jump to a named lesson. Keep framework setup on `/install` and theme selection/export on `/theme-studio`; link their steps at the point they are needed.

Add **Recipes** at `/recipes`, linked from Build a screen, the Components directory and `/llms.txt`. List every recipe descriptor's title, description, constituent Ultima items, external engine dependencies, and canonical component-page anchor. Identify each as a copyable composition and print commands to install its dependencies. A recipe has no `@ultima/<recipe>` install command. Keep recipe prose and demos on their existing component pages.

Link existing complete screens at `/blocks`: Dashboard 01, CRM 01, Settings 01 and Sign-in 01. Settings 01 is the guide's worked block-adaptation path. Each link names the screen and says what work it supplies. The guide explains the choice between adapting one of these screens and composing the Projects screen from smaller items.

## Bounded example inventory

Six lessons cover the question. The product-token lesson shares the Projects screen; the block lesson uses installed Settings 01. Typography retains its existing source. Add only the screen and two focused control examples, with their required local token/data files.

| Lesson | Executable content | Canonical source owner | Required observations |
| --- | --- | --- | --- |
| Responsive screen | Projects: page heading, route navigation, labelled required form with selection, submit/reset result, captioned data table or empty state, and portalled Dialog | New `apps/docs/src/examples/complete-screen/projects.tsx` and local deterministic data | One column at narrow widths; wider content columns when space permits; long content wraps; meaningful navigation and form results; keyboard access to data overflow |
| Typography | Existing full prose mapping, including headings, lists, links, quotes, code and wide tables | `apps/docs/src/demos/code/typography.tsx`; narrative at `/components/code#typography`; descriptor `registry/metadata/recipe/typography.ts` | Semantic elements, token-based type, Code/Separator/Table/ScrollArea delegation and the existing recipe's documented states |
| Component style overrides | A Button with a token-based size/spacing override and a compound Card with separate part styles | New `apps/docs/src/examples/complete-screen/style-overrides.tsx` | Overrides through each part's `style` prop, preserved focus ring, disabled behavior, readable text and both color modes |
| Interaction states | Field/Input validation, disabled submit and success feedback; Dialog open/close and focus return | New `apps/docs/src/examples/complete-screen/interaction-states.tsx`, using the screen's deterministic state rules | Actual input and keyboard actions reach each state; errors associate with the field; feedback includes text; component state attributes drive styling |
| Product semantic tokens | Projects under a passing non-stock Studio theme; one application-owned content-width token used by its layout | New `apps/docs/src/examples/complete-screen/screen.stylex.ts`; reuse the consumer-proof draft and its generated export | The layout reads `--app-size-content-max`; installed root, control and popup read exported values in both modes; status meanings survive brand changes |
| Adapt an existing block | Install Settings 01, render its exported entry and change its labels/data while retaining its components and responsive behavior | `packages/blocks/src/settings-01/`; `registry/metadata/block/settings-01.ts`; existing `/blocks/settings-01` preview | Multi-file dependencies install; desktop navigation and mobile menu work; form, feedback and focus behavior remain usable after adaptation |

The Projects scene supplies the same form/navigation/overlay/data obligations as [rendered consumer proof](consumer-proof.md#fixture-and-provenance). Make it that fixture's shared scene when implementing the guide. Keep the existing consumer-proof plan's non-stock passing draft and provenance requirements. The guide needs neither a second application fixture nor a separate browser matrix.

The Projects screen landed with [#762](https://github.com/frankieramirez/ultima/issues/762) as inventory entry `projects`, with its data and `screen.stylex.ts`, and it is now the runner's scene. [#763](https://github.com/frankieramirez/ultima/issues/763) published `/build-a-screen`: every lesson is an inventory entry with its route and anchor, validated together. The two full-screen lessons render from a bare `/build-a-screen/<lesson>/preview` route in a frame, so the screen lays out for the frame's viewport; the product-token preview sets the consumer proof's draft (`apps/docs/src/proof-draft.ts`) on the root as an installed theme stylesheet would. The block lesson names its block and copies no files; its install command is the block's. Its token group holds `--app-size-content-max` and `--app-size-table-min`, the width below which the table scrolls inside its region.

The exact breakpoint and content-width value belong to implementation and its rendered checks. Use named module constants for media conditions, as ADR 0004 requires. Put the application-owned size value in `screen.stylex.ts`, using a namespaced `stylex.defineVars` group. It is an application layout token, outside Ultima's `--ult-*` namespace and palette generator. Use Ultima space tokens for ordinary spacing; existing semantic roles carry accent, action and status colors. A new application color role would require its own dark/light/state/contrast contract and falls outside this example set.

## Choosing what to author

1. Adapt an existing block when its screen structure and behavior match the product. Install it and edit the consumer-owned files.
2. Compose installed Ultima components for controls and painted containers. Choose the supported variant, tone and size before overriding a part's `style` slot. A compound root's style does not style its children automatically.
3. Copy a recipe for the named composition it teaches. Install the listed component and engine dependencies, then own the copied source in the application.
4. Write local StyleX for page arrangement, responsive rules, type and flow spacing. Prefer semantic tokens. A demonstrated application-only sizing need can live in the application's own token module.

The examples follow [the component/page-layout boundary](ultima.md#the-line-between-a-component-and-page-layout): controls retain their component behavior, surfaces use components, and plain layout elements arrange content. Preserve native scrollbars or use the appropriate ScrollArea/Table.Scroll composition. The guide's table has a caption naming its scroll region. It uses native document scrolling for the page.

Keep the styling engine and `style` prop. Preserve accessible names, visible keyboard focus, contrast, primitive state selectors and reduced motion when overriding. Use component state rather than constructing a second set of ARIA or keyboard handlers. A root CSS theme supplies the example's document and default body portals; link the scoped portal lesson owned by [theme mode and portal packaging](https://github.com/frankieramirez/ultima/issues/729) for a subtree theme.

Local layout repeats only where a lesson needs it. This decision introduces no Stack/Grid helper, utility language, new component or installable recipe. Propose a helper later only with at least two independent consumer uses showing a common contract that local StyleX and existing items do not satisfy. Such a proposal needs separate catalogue authorization.

## Canonical sources and copyable code

Existing recipe descriptors continue to own IDs, descriptions, contracts, component-page anchors and demo paths. The catalogue model derives their installed component and engine dependencies from those demos. Existing block descriptors and source directories retain their ownership. The new guide never duplicates their source or moves their canonical narrative.

Keep new screen examples in `apps/docs/src/examples/complete-screen/`, outside `packages/ui` and `packages/blocks`. Their author-facing source uses consumer imports. For the default aliases:

```tsx
import * as stylex from '@stylexjs/stylex';
import { color, space } from '@/lib/tokens.stylex';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { screen } from './screen.stylex';
```

The guide explains how to substitute aliases from the application's `components.json`. Include every local imported file in the copy bundle, with destination paths; keep Next client boundaries visible. Do not add a package installation for workspace-only `@ultima/ui` or `@ultima/tokens` names.

Existing recipe demos currently use workspace imports, and their displayed raw source is not an installed-consumer example. Add one shared consumer-copy projection that maps those imports to installed token modules and individual component imports using catalogue exports and alias metadata. Use TypeScript-aware transforms, reject unresolved exports, and preserve local dependencies. The rendered source, copied/downloaded files and installed-consumer check must consume the same projection. Avoid hand-maintained alternative snippets. This work also covers the recipes discovered by the new index, including recipes outside the six lessons.

The docs renderer may adapt consumer imports through a private resolver to workspace modules and the existing demo theme boundary. That adapter belongs to the docs app and stays out of copy bundles. A consumer check must resolve installed items directly and cannot use that adapter or its implicit portal defaults.

Add an authored guide inventory at `scripts/catalogue/composition-examples.ts`, recording each lesson's ID, title, source bundle, owning route/anchor, local file destinations and verification feature/scenario IDs. Derive item and npm dependencies from source imports through the catalogue model. Link the existing recipe/block records by ID. This inventory is teaching metadata, not a new catalogue item kind. Validate IDs, paths, anchors and dependencies before generating docs or guidance.

Extend catalogue generation for the docs discovery projection and registry build for `/llms.txt`. Edit descriptors, the authored inventory and generator source; regenerate wiring with `pnpm catalogue:generate` and outputs with `pnpm registry:build`. Keep `registry/items.config.ts`, `apps/docs/src/generated/`, registry JSON and `/llms.txt` generated.

## Agent discovery

Add compact **Recipes** and **Build a screen** sections to `/llms.txt` from the same catalogue model and guide inventory. Each entry supplies its purpose, canonical URL, consumer source/copy link, required item install command, external dependency command when applicable, and verification guidance. Identify recipes as non-installable and blocks as installable. Preserve the guide's byte limit by linking to complete sources and walkthroughs instead of embedding every example.

For Typography the command remains:

```sh
npx shadcn add @ultima/code @ultima/separator @ultima/table @ultima/scroll-area
```

For the block path:

```sh
npx shadcn add @ultima/settings-01
```

The default block entry import is `import { Settings01 } from '@/components/settings-01/settings-01'`; resolve its destination from the configured components alias and its exported symbol from the descriptor. Derive commands for every recipe from its dependencies; a reader following Chart, Data Table or React Hook Form must also see the relevant npm engine install.

The consumer skill at `packages/cli/skill/ultima-design/SKILL.md` stays a pointer: fetch the hosted guide, read the product's theme guidance, choose a screen/recipe/block, inspect installed items, and run the CLI checks. [Product theme discovery](https://github.com/frankieramirez/ultima/issues/727) owns the local theme discovery order. The guide reads existing consumer-owned `DESIGN.md` where available and preserves the product brand. It neither rewrites that document nor treats the docs' `site` theme as a consumer default.

## Compiling and exercising the examples

Register a `screen-composition` feature and scenarios through the existing feature-map registration helpers. Include the guide/source inventory, copy projection, recipe descriptors and the shared installed-consumer scene in source ownership and dependency selection. Add bindings to existing browser/build/consumer checks; a discovery record or `--plan` report is never a pass. Link the guide to runnable contributor commands after these bindings land.

Required implementation checks:

- Validate every discovery link, source bundle and derived dependency command. Every recipe descriptor appears exactly once in `/recipes` and `/llms.txt`, with a resolvable canonical anchor. Regeneration must be deterministic and `pnpm catalogue:check` must pass.
- Compile and typecheck the exact copy bundles in disposable installed Vite, Next root `app`, and Next `src/app` projects. Include all recipe sources exposed by the index and every new lesson. Keep the same checked bytes in copy UI and download output. A workspace build alone cannot satisfy this check.
- Reuse setup/install behavior from [supported bootstrap](https://github.com/frankieramirez/ultima/issues/726), `scripts/smoke-install.sh` and `scripts/smoke-theme.ts`. Use the built registry and packed CLI; install actual item dependencies rather than copying workspace package files. Preserve the existing full-catalogue smoke and recipe-specific demo/state obligations.
- Serve production output. For the shared Projects scene, exercise required-field validation, selection, submit/reset, current navigation, data/empty state and Dialog focus return. In dark/light at 390px and 1280px, verify readable layout, no document horizontal overflow, reachable table scrolling, focus visibility and axe with the overlay closed/open. Check wrapping and usable controls at 200% zoom. Test the override and focused-state lessons in their reachable states.
- Check computed theme values, actual paint, system preference plus explicit modes, reduced motion and Next hydration under the existing [consumer proof](consumer-proof.md) and [support](consumer-support.md) contracts. Use expected values generated from the retained draft. Reuse builds and fold equivalent checks into the accepted 54-cell matrix. Apply the same interaction checks to the copied recipe demos; mapping aliases successfully does not prove their controls work.
- Run the existing Settings 01 checks and installed block checks after the worked adaptation. Keep framework/client boundaries, mobile navigation and popup inheritance observable in the installed application.

The copy-bundle checks landed with [#764](https://github.com/frankieramirez/ultima/issues/764). `node --experimental-strip-types scripts/consumer-proof.ts --layout <vite|next-app|next-src> --delivery-path css --exercise copy-bundles` reuses the runner's fresh scaffold, built registry, packed CLI and non-stock CSS theme. It installs the union of every exposed bundle's items, its npm engines and their `@types` packages, plus Settings 01. It writes each bundle's generated bytes from `recipeSources`, and adapts Settings 01's labels and initial data with literal edits that fail when the block's source moves. A gallery route mounts one entry per `?bundle=` request. The `compile` case is the production build plus `tsc`. One case per entry in `scripts/consumer-copy-bundles.ts` then runs in production Chromium with axe: each recipe demo's interaction, the Projects screen in a 1280×800 window at 200% zoom (a 640×400 CSS viewport at twice the density), and adapted Settings 01 at 1280 and 390 pixels. `--fault unresolved-copy-import` restores an `@ultima/ui` import in one copied file and must fail `compile`. The verifier registers `consumer-copy-vite`, `consumer-copy-next-app` and `consumer-copy-next-src`, and the plan selects them for any recipe or any item a bundle installs. The `screen-composition` feature owns two docs-suite scenarios: `recipe-index` and `copy-bundles`, which checks displayed, copied and downloaded bytes for every exposed bundle. Its first run found that the Chart engine command omitted `@types/d3-*`, so a recipe's engine command now adds `npm install -D` for every type package the docs app compiles it with. The Projects scene's form, navigation, data and Dialog obligations stay in the runner's theme cells. This exercise adds the zoom case and the product-token case: at 1600 pixels, the content column computes `--app-size-content-max`, and the root carries the installed theme. The style-override case checks the token-based button height, the disabled state, the focus ring, and axe in both modes. The interaction-state case reaches the disabled, invalid with an associated error, success and Dialog focus-return states through real input. The Settings 01 lesson copies no files, so the adapted block's cases cover it. Any inventory lesson or recipe source without an installed exercise fails `tooling-tests`.

Report source revision, copied-source digest, registry identity, draft identity, installed items, framework/browser versions and each executed check's result. Retain failed fixtures and diagnostics as the consumer-proof contract requires. Missing imports, unresolved copy dependencies, ignored analysis, stale generated wiring or incomplete browser execution must remain explicit gaps. The accepted release obligations stay in force; this guide adds assertions to shared checks rather than replacing them with screenshots.

## Empty-app brief for an agent

Build the Projects screen in an empty supported Vite React TypeScript or Next App Router TypeScript application. Before editing, read the installed consumer skill and fetch `/llms.txt` from the registry host in `components.json` when configured. Follow the supported bootstrap journey and `/install` for the selected root/src layout. The bootstrap ticket owns any future primary initialization command; until it lands, use the current target setup item and its printed hand steps.

1. Record the target layout and configured aliases. Preserve any existing product theme. With no theme choice, use the accepted Neutral default when its rollout lands; before then, state the installed defaults and choose Neutral explicitly through Studio. Never silently claim that today's installed base is already Neutral.
2. Read `/build-a-screen`. Install the derived components for the scene: Button, Card, Sidebar, Field, Input, Select, Table, Empty and Dialog. Use the generated command from the example inventory; transitive dependencies come from the registry. Run `npx ultima-design status` before changing installed items.
3. Copy the Projects bundle and its local token/data files into compiler-included application paths. Render it from the consumer route with installed item imports. For Next, keep interactive code behind its declared client boundary and the page/layout boundary compatible with server rendering.
4. Use deterministic projects and a labelled creation form. Submitting an empty required name exposes an associated error. A valid submission adds a row and announces success; Reset restores the initial form. A named navigation destination is keyboard reachable. A Dialog edits a project and returns focus to its trigger. The empty list offers a component-based action to restore sample data.
5. Apply a passing custom Studio draft through its installed CSS and retain the editable draft. Follow `/install` for import order after StyleX, font responsibility and initial mode. Load no font implicitly. Read product roles from semantic tokens and the layout limit from the local application token. Default document portals inherit the root theme.
6. Run `npx ultima-design doctor`, `npx ultima-design check --files <changed files>` and `npx ultima-design check`. Build and serve the application in production. Exercise the form, navigation, data, Dialog, focus and responsive checks above in both modes; inspect computed theme values on the root, control and popup. Record command results and any unexecuted browser obligations before handing back the files.

The brief creates local deterministic behavior for teaching and testing. Authentication, persistence, network APIs and a new shared layout library require separate work.

## Delivery boundaries

This decision settles the inventory, ownership, discovery and proof requirements. Implementation belongs in the ordered handoff owned by [adoption delivery order and first-screen acceptance](https://github.com/frankieramirez/ultima/issues/731). Bootstrap mechanism, local product-theme discovery, mode/portal recipe packaging and general consumer StyleX linting stay with their named sibling decisions. No package publish, deployment or browser-support certification follows from closing this decision.
