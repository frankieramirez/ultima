---
name: ultima-systems
description: Use for UI work in a repository whose components.json has an @ultima registry, when adding or editing a component, styling, theming, or replacing a native control.
---

# Ultima Systems

## 1. When it applies

UI work in a repository whose `components.json` names an `@ultima` registry: adding or editing a component, styling, theming, or replacing a native control.

## 2. Read first

Before the first UI edit of a task, fetch `/llms.txt` from the host that `registries["@ultima"]` names in `components.json`, normally `https://ultima.systems/llms.txt`.

## 3. Learn what is installed

Before adding an item or editing an installed one, run:

```sh
npx @ultima-systems/cli status
```

## 4. Reach for the kit

Before writing a native control or importing `@base-ui/react`, add the item that provides it with `npx shadcn add @ultima/<item>`; `check` enforces this as `ULT-APP-CONTROL-001` and `ULT-APP-PRIMITIVE-001` ([catalogue](https://ultima.systems/components)).

## 5. Paint from the design system

Read a semantic token for every color, shadow, radius, border width, and type value, and make a new need a token override; `check` enforces this as `ULT-APP-PAINT-001` and `ULT-APP-PALETTE-001` ([token reference](https://ultima.systems/tokens)).

## 6. Check after edits

After editing, run:

```sh
npx @ultima-systems/cli check --files <changed files>
```

Before handing work back, run:

```sh
npx @ultima-systems/cli check
```

When styles do not apply at all, run:

```sh
npx @ultima-systems/cli doctor
```

## 7. Reading results

- Exit 0: the run completed with no blocking finding.
- Exit 1: fix the findings.
- Exit 2: fix the invocation.
- Exit 3: fix the project; the run could not complete.

A finding's repair and link are the next thing to read.
