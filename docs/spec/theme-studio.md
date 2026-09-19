# Theme studio

Status: planning. [Map: Ultima theme studio](https://github.com/frankieramirez/ultima/issues/204) owns the open decisions. This document records the agreed scope; the contracts below remain unresolved.

## Destination

An agreed visual prototype and implementation-ready specification for editing Ultima design variables, previewing live components, exploring coordinated random themes, and exporting or installing the result in an existing application.

## Scope

The user delegated planning choices with “you pick.” The first release targets existing Ultima applications. Users start with grouped controls and expand them to edit individual semantic tokens. The proposed groups are color, typography, density, shape, elevation, and motion; the control decision must establish what each can change.

The editor keeps a stable appearance around the themed preview. Dark is the starting mode, and light receives the same attention. The visual direction is a compact editor beside a large application preview, with component scenes and an optional dark/light comparison. The prototype must settle the layout and interactions.

Shuffle supports locks and undo. Its exact generation rules and validation behavior remain open. Export and installation must reproduce the preview, including the supported color modes and font requirements.

Follow [Ultima's principles](ultima.md#principles): use production Ultima controls, StyleX and Base UI, stable semantic names, generated palettes, and contrast checks. Additional tokens or reusable controls must acquire their own contracts when the design identifies them.

This work contributes to “3. v1 dependable default” on [Roadmap: Ultima as the dependable default](https://github.com/frankieramirez/ultima/issues/161), as a candidate representative application. It does not complete the roadmap's core coverage or versioning commitments.

## Open contracts

- [Theme controls and token relationships](https://github.com/frankieramirez/ultima/issues/207): control inventory, ranges, derivation, overrides, and required token additions.
- [Theme studio layout and live preview](https://github.com/frankieramirez/ultima/issues/208): visual prototype, responsive layout, preview scenes, inspection, and interaction states.
- [Shuffle, manual overrides, and validation](https://github.com/frankieramirez/ultima/issues/209): coordinated randomness, locks, history, contrast failures, and mode relationships.
- [Theme export, installation, and recovery](https://github.com/frankieramirez/ultima/issues/210): portable configuration, install/download outputs, persistence, parity, and first-release acceptance criteria.

Research supports those decisions:

- [Generated theme installation and preview parity](https://github.com/frankieramirez/ultima/issues/205).
- [Runtime palette generation and contrast validation](https://github.com/frankieramirez/ultima/issues/206).

## Out of scope

The map ends before production implementation and build-ticket filing. The first-release specification excludes new-project scaffolding, accounts, cloud libraries, a public theme marketplace, arbitrary component-source editing, and compatibility with unrelated design systems.

## Research constraints

[Runtime palette research](../research/2026-09-19-runtime-theme-palette.md) establishes that the current recipe accepts fixed parameters, not arbitrary seed colors. A browser port can preserve its equations, but must prove numerical parity, including gamut mapping and quantization. Changing hue alone can fail the current gate, so the Shuffle contract must handle unsuccessful generation and conflicting locks.

The current Python and TypeScript gates differ in pairing coverage and threshold rounding. The runtime contract must define one pairing set, including action colors, and compare full-precision ratios before formatting. Validate final overridden values in both modes. Passing the declared token pairs does not establish accessibility for every rendered composition. These constraints inform the open control and validation decisions; the research does not settle their UX.

[Installation research](../research/2026-09-19-theme-installation.md) verifies that current shadcn tooling accepts a downloaded self-contained registry JSON file. This fits the static docs host; arbitrary hosted installation URLs require additional infrastructure. Copying a file still requires application imports and theme activation. The export decision remains open.

Preview and export must resolve complete mode values, including shadows and reduced motion. Existing StyleX mode themes override only color, and same-group themes do not merge token by token. Font delivery and portal containment also affect parity. The prototype and export contracts must address those boundaries and specify browser and consumer-install verification; the research itself does not prove end-to-end parity.
