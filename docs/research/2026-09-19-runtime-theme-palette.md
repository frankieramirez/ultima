# Can Ultima generate and validate palettes in the browser?

## Findings

Ultima can port its small Python recipe to a pure TypeScript module shared by the browser and build tooling. Preserving the default palette requires an explicit numerical compatibility check against Python. Arbitrary seed colors need a new input contract and a search or rejection policy: the current generator has fixed recipes and can fail contrast when only a hue changes. This is a research recommendation, with UX decisions left to the map. [Recipe](../../packages/tokens/scripts/palette.py), [palette specification](../spec/ultima.md#generation-recipe).

### Existing implementation and reuse

The Python generator computes six twelve-step scales in dark and light modes, for 144 hex values. It uses fixed lightness arrays, per-scale chroma peaks and fractions, plus two pinned brand colors. Semantic roles resolve to prescribed steps. For each role, the generator chooses whichever of neutral steps 1 and 12 gives the higher minimum contrast across the base, hover, and active fills. This choice still needs the contrast gate: neither candidate is guaranteed to pass. [build(), semantic()](../../packages/tokens/scripts/palette.py).

The browser port should preserve those relationships and the pins for the stock theme. User themes require a decision about whether the two brand anchors remain fixed. The recipe currently accepts no seed argument; mapping an arbitrary supplied RGB color to hue/chroma/lightness parameters, and deciding whether an exact supplied color must survive, are new contracts. [Recipe](../../packages/tokens/scripts/palette.py), [brand anchors](../spec/ultima.md#palette).

The TypeScript build already computes WCAG ratios, but reads the committed palette and compiles StyleX sources through Babel. Its filesystem, compiler, and process dependencies prevent direct browser reuse. Extracting the numerical functions and a shared pairing manifest would allow the editor, export validation, and CI to run the same checks. [build-tokens.ts](../../packages/tokens/scripts/build-tokens.ts).

| Approach | What it preserves | Work or constraint |
| --- | --- | --- |
| Port the recipe to pure TypeScript | Existing equations and semantic choices can remain explicit | Requires parity proof; recommended candidate for implementation |
| Use Color.js | Browser color conversion and configurable gamut mapping | Its CSS gamut mapping default differs from Ultima's strict chroma reduction; switching needs an intentional recipe change or custom compatible mapping |
| Run Python through Pyodide | Reuses the reference functions | Adds a Python/Wasm runtime and asynchronous loading; worker execution keeps Python work off the UI thread |
| Call a Python service | Reuses server-side reference generation | Each uncached adjustment needs a request; introduces hosting and offline limitations |

The service tradeoff follows from the network boundary; this research did not benchmark any approach. Color.js documents a CSS mapping method using a perceptual difference tolerance. Pyodide documents browser execution and worker integration. [Color.js mapping](https://colorjs.io/docs/gamut-mapping), [Pyodide usage](https://pyodide.org/en/stable/usage/index.html), [Pyodide workers](https://pyodide.org/en/latest/usage/webworker.html).

### Numerical contract and proof

Ultima holds OKLCH lightness and hue constant while searching chroma for 40 iterations. Its gamut tolerance is `1e-4` in linear sRGB, followed by channel clipping, sRGB encoding, and eight-bit hex quantization. A library replacement must reproduce those details, including the matrices. Letting CSS render an out-of-gamut OKLCH value would surrender that numerical contract to browser mapping. [oklch_to_rgb(), oklch_to_hex()](../../packages/tokens/scripts/palette.py), [Color.js mapping options](https://colorjs.io/api/interfaces/types.togamutoptions).

Python's `round()` resolves exact ties to even; JavaScript `Math.round()` resolves ties toward positive infinity. A direct replacement can therefore change an eight-bit channel. [Python round](https://docs.python.org/3/library/functions.html#round), [ECMAScript Math.round](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.round).

The implementation proof should generate expectations from the Python reference and compare every default palette value and semantic assignment with the TypeScript output. Extend that comparison over a deterministic parameter corpus, including gamut boundaries and rounding ties. Compare unrounded contrast decisions at the thresholds. This belongs to the generator's compatibility proof, consistent with the repository's rule that component tests do not pin color literals. It remains unperformed here because there is no browser port yet. [Testing rules](../spec/ultima.md#testing).

### Measured failures with arbitrary hues

A read-only Python experiment imported the reference with `runpy.run_path`, replaced one `HUE` entry at a time with every integer from 0 through 359, called `build()`, then ran `gate(semantic(...))` for both modes. All other parameters and pins stayed unchanged. Baseline passed all 46 pairs in each mode.

| Changed scale | Hue candidates failing either mode, out of 360 |
| --- | ---: |
| mithril | 0 |
| arcane | 29 |
| mana | 8 |
| verdant | 0 |
| ember | 0 |
| ruin | 246 |

For example, ruin hue 46 fails light-mode `danger-contrast` on `danger`, reported as 4.48:1 against 4.5:1. These counts describe this limited sweep; they establish neither success for arbitrary chroma/lightness nor an exhaustive valid region. Reproduce with `for h in range(360): HUE[name] = h; p = build()` and collect both modes' gate failures, restoring the original hue between scales. [Functions under test](../../packages/tokens/scripts/palette.py).

Reproduction command (reads the generator without writing its output):

```bash
PYTHONDONTWRITEBYTECODE=1 python3 - <<'PYTHON'
import runpy
p = runpy.run_path('packages/tokens/scripts/palette.py')
for name in p['HUE']:
    original = p['HUE'][name]
    failed = 0
    for hue in range(360):
        p['HUE'][name] = hue
        palette = p['build']()
        failures = [
            failure
            for mode in ('dark', 'light')
            for failure in p['gate'](p['semantic'](palette, mode), mode)[1]
        ]
        failed += bool(failures)
    p['HUE'][name] = original
    print(name, failed)
ratio = p['cr']('#070707', '#777777')
print(ratio, ratio >= 4.5, round(ratio, 2) >= 4.5)
PYTHON
```

Output:

```text
mithril 0
arcane 29
mana 8
verdant 0
ember 0
ruin 246
4.4983480864214345 False True
```

### Gaps the runtime validator must resolve

The Python gate checks 46 pairs per mode. The TypeScript export gate adds three `action-contrast` pairs for 49 per mode. A shared runtime table must preserve the action checks. [Python gate](../../packages/tokens/scripts/palette.py), [TypeScript pairings()](../../packages/tokens/scripts/build-tokens.ts).

The two implementations also disagree at rounding boundaries. Python compares the full ratio before formatting; TypeScript rounds to two decimals before deciding pass/fail. A measured example from the Python contrast function is `#070707` against `#777777`: 4.4983480864214345:1 becomes 4.50, which the TypeScript decision accepts. This is a pre-existing export-gate defect, independent of the proposed studio. A runtime validator that reuses this code needs to compare full precision and round only the displayed value; the studio decision depends on agreeing that shared numerical contract, rather than on expanding the feature scope to unrelated fixes. W3C says threshold values must not be rounded up. [runGate()](../../packages/tokens/scripts/build-tokens.ts), [W3C contrast minimum](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum).

Both gates evaluate a declared set of opaque color pairs. They do not establish accessibility for every component composition, translucent color, image backdrop, focus-ring geometry, or custom consumer usage. In particular, solid fills against the page background are deliberately outside the declared gate. W3C's non-text contrast requirements depend on which visual information identifies a component or state. Ultima separately uses axe on rendered components to catch combinations beyond the table. [Gate scope](../spec/ultima.md#contrast-gate), [rendered accessibility checks](../spec/ultima.md#testing), [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html).

### Implications for manual edits and Shuffle

Manual semantic overrides must run validation on the final resolved values after overrides, in both modes. Overrides that introduce opacity need compositing against the actual background or a narrower supported input format. A passing palette alone cannot validate a later override. The exact editing affordances and handling of invalid drafts remain decisions for later tickets. [Existing gate inputs](../../packages/tokens/scripts/build-tokens.ts), [dark/light and contrast principles](../spec/ultima.md#principles).

Shuffle needs a bounded search over allowed parameters, followed by the same validator. Locks can make a passing candidate impossible, so the contract needs an explicit exhausted-search result. Reproducible history or theme reopening also requires a saved random seed, recipe version, and resolved configuration. These are engineering implications of the measured failures and a deterministic generator; this research does not choose their UI.

APCA can reuse the docs site's existing `apca-w3` integration as advice. The WCAG gate remains authoritative under the repository principles. [APCA readout](../../apps/docs/src/routes/tokens.tsx), [principles](../spec/ultima.md#principles).

## Sources

- [Reference generator](../../packages/tokens/scripts/palette.py): recipe, mapping, numerical functions, and Python gate.
- [Token export build](../../packages/tokens/scripts/build-tokens.ts): browser-incompatible build dependencies, action checks, and rounded pass/fail behavior.
- [Ultima specification](../spec/ultima.md): mode parity, anchors, compatibility, gate scope, and test contracts.
- [Color.js gamut mapping](https://colorjs.io/docs/gamut-mapping): mapping behavior and default method.
- [Pyodide browser usage](https://pyodide.org/en/stable/usage/index.html): browser runtime option.
- [Pyodide workers](https://pyodide.org/en/latest/usage/webworker.html): worker execution option.
- [Python round](https://docs.python.org/3/library/functions.html#round) and [ECMAScript Math.round](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.round): tie behavior.
- [W3C text contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) and [non-text contrast](https://www.w3.org/WAI/WCAG22/understanding/non-text-contrast.html): thresholds and evaluation scope.
