---
name: ultima-design
description: Use for UI work in a repository whose components.json has an @ultima registry, when adding or editing a component, styling, theming, or replacing a native control.
---

# ultima-design

## 1. When it applies

UI work in a repository whose `components.json` names an `@ultima` registry: adding or editing a component, styling, theming, or replacing a native control.

## 2. Read first

Before the first UI edit of a task, fetch `/llms.txt` once from the host that `registries["@ultima"]` names in `components.json`, normally `https://ultima.systems/llms.txt`.

## 3. Discover the local theme

Read applicable project instructions, `DESIGN.md` and named design guidance at the task's application root, including inherited guidance. Trace entry/layout imports, the cascade, applied themes, modes and portal containers to each affected boundary, then associate the draft and installed source. Preserve an existing product brand; use [Theme Studio](https://ultima.systems/theme-studio) for an authorized custom theme. Resolve conflicts before replacing files ([discovery and safe updates](https://ultima.systems/llms.txt#discover-and-maintain-the-product-theme)).

If hosted guidance is unavailable, use known guidance and local source, report the gap and leave unknown API choices unresolved. Run the pinned local CLI offline with `npx --no-install ultima-design doctor` and `npx --no-install ultima-design check`. `status` and `diff` need the registry; unavailable comparisons do not prove freshness.

For local freshness, run `npx ultima-design doctor --theme`. Offline, prefer the pinned `npx --no-install ultima-design doctor --theme` and available local guidance; hosted `status`/`diff` remain unverified. Static matches do not prove rendering.

## 4. Learn what is installed

When the registry is available, before adding an item or editing an installed one, run:

```sh
npx ultima-design status
```

## 5. Reach for the kit

Before writing a native control or importing `@base-ui/react`, add the item that provides it with `npx shadcn add @ultima/<item>`; `check` enforces this as `ULT-APP-CONTROL-001` and `ULT-APP-PRIMITIVE-001` ([catalogue](https://ultima.systems/components)).

## 6. Paint from the design system

Read a semantic token for every color, shadow, radius, border width, and type value, and make a new need a token override; `check` enforces this as `ULT-APP-PAINT-001` and `ULT-APP-PALETTE-001` ([token reference](https://ultima.systems/tokens)).

## 7. Check after edits

Offline, use `npx --no-install` for the checks below; do not fetch the CLI.

After editing, run:

```sh
npx ultima-design check --files <changed files>
```

Before handing work back, run:

```sh
npx ultima-design check
```

When styles do not apply at all, run:

```sh
npx ultima-design doctor
```

Lint StyleX with the project's ESLint and the [StyleX lint recipe](https://ultima.systems/install#stylex-lint); `doctor` reports lint as `detected` at best, never as a lint pass.

Check the production rendering in both explicit modes and system mode, including an open popup. A zero CLI exit cannot prove the theme rendered ([install walkthrough](https://ultima.systems/install#theme-adoption)).

## 8. Reading results

- Exit 0: the run completed with no blocking finding.
- Exit 1: fix the findings.
- Exit 2: fix the invocation.
- Exit 3: fix the project; the run could not complete.

A finding's repair and link are the next thing to read.
