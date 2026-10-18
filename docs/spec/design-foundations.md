# Design foundations

The rulebook for visual decisions: when to raise a surface, draw a border, round a corner, fade, blur, color, space or lay out something, and which size, weight and leading text takes, and why. The [specification](https://github.com/frankieramirez/ultima/blob/main/docs/spec/ultima.md) owns the values (the token tables, the palette, the contrast gate) and each component's contract. This document owns the reasoning that picks among those values, so an agent or a person choosing a value for a new component, a block, a screen or a consumer's own UI makes the same call Ultima would and can say why.

Every rule here gives a reason a reviewer can check: a WCAG criterion, a perceptual effect, a measurement, or a constraint of the platform. A rule without a reason doesn't belong here. When this document and the specification disagree on a value, the specification wins and the disagreement is a bug to report. When they disagree on a reason, this document wins and the specification's prose is the one to fix.

## How to make a visual decision

1. **Name the role.** Say what the thing is to the reader before you pick a value: a control, a region of the page, an object sitting on the page, a popup tied to a trigger, a modal, a message, a mark. Values follow roles, never neighbors.
2. **Find the rule for that role below** and use the token it names.
3. **If no rule fits, apply the four tests in order.** It works for everyone (WCAG 2.2 AA first). It follows the consensus: where three of shadcn/ui, Mantine, DaisyUI and Radix Themes agree, Ultima agrees, unless the first test says no. It uses the fewest values: reuse a token before adding one. It keeps Ultima's character where the references split: monochrome ink accent, visible structure, corners by role.
4. **Write the reason down in the same change.** A new decision becomes a rule here, with its reason. A component note that sets a value says which rule it follows.

Never copy a value from a neighboring component without its reason. Two components can share a value for different reasons, and the next change to one of them will move it.

## Separation: four cues, weakest first

A surface stands apart from what's around it through four cues. From weakest to strongest:

| Cue | What it tells the reader | Token | Cost |
| --- | --- | --- | --- |
| Space | These things belong together; those don't (proximity) | `space` | None |
| Fill step | This area is a region of its own (common region) | `surface-*`, `<role>-subtle` | A grey fill also reads as "not usable" |
| Border | This region has an edge you can find | `border`, `border-strong` | Every line adds visual noise |
| Shadow | This object sits above the page (figure and ground) | `shadow-*` | Claims a place in the z-order |

**Use the weakest cue that does the job.** Each stronger cue is louder, and a screen where everything has a border and a shadow has no hierarchy left. Group with space first. Add a fill or a border only where space alone leaves the grouping ambiguous. Add a shadow only when the thing really is above the page (see Elevation).

## Elevation

Elevation is z-order made visible. A shadow tells the reader that a surface is closer to them than the page, and how much closer. Ultima has five levels:

![The five elevation levels drawn with the real tokens in dark and light, and how far each cue sets a Card apart from the page](https://raw.githubusercontent.com/frankieramirez/ultima/main/docs/assets/design-foundations/elevation-ladder.webp)

| Level | Token | Means | Components |
| --- | --- | --- | --- |
| 0 Flat | none | Part of the page's flow | Alert, Table, Badge, Empty, fields, Tabs, Sidebar |
| 1 Lift | `--ult-shadow-xs` | A pressable edge | The outline Button and its Button Group items |
| 2 Resting object | `--ult-shadow-sm` | A self-contained object sitting on the page | Card, Tooltip, Slider thumb |
| 3 Anchored popup | `--ult-shadow-md` | Floats over content, tied to its trigger | Dropdown Menu, Context Menu, Select, Combobox, Command, Popover, Hover Card, Navigation Menu, Date Picker, Toast |
| 4 Modal | `--ult-shadow-lg`, scrim and blur | Takes over the page until dismissed | Dialog, Alert Dialog, Drawer |

**Pick the level by behavior, never by importance.** Ask, in order:

- Does it block the page until dismissed? Level 4.
- Does it appear over content, anchored to a trigger, and go away? Level 3.
- Is it a self-contained object the reader could imagine picking up: it groups its own heading, content and actions, and it would still make sense moved somewhere else on the page? Level 2.
- Is it a pressable control drawn with an edge rather than a fill? Level 1.
- Otherwise it is part of the page. Level 0.

Importance is carried by position, size, type and color. Raising something to make it stand out teaches the reader that elevation means "important", and then the popups stop reading as popups.

**Why Card is level 2 and Alert is level 0.** Both sit on `surface-raised` with a hairline. A Card is an object: a report, a plan, a person, with its own actions, and the page is a surface that holds several of them. An Alert is a sentence about the page around it. It belongs where it sits, and its tone already speaks through its fill, ink and icon. Giving it a shadow would detach it from the content it describes. The same test puts Table, Empty and a Sidebar at level 0: they are regions of the page.

**Every shadow comes with a border.** A raised surface always has a `border` hairline as well, for three reasons:

- **Dark mode.** A black shadow on a near-black page is nearly invisible. Measured from a render, the darkest pixel under a `shadow-sm` Card is 1.04:1 against the page in dark, and 1.26:1 in light. The hairline is 1.78:1 in dark and 1.46:1 in light.
- **Themes can turn shadows off.** Theme Studio's Elevation control scales every shadow's alpha from 0 to 2, and 0 emits `none`. A surface that depends on its shadow vanishes in a flat theme.
- **Forced colors.** Windows high contrast mode removes `box-shadow` and keeps borders.

So the border is the structure and the shadow is the depth on top of it. A border without a shadow is fine (level 0 regions). A shadow without a border is not.

**In dark mode, height is lightness.** A raised surface is one palette step lighter than the page (`surface-raised` is step 2 in dark), because light falling on a closer surface makes it brighter and a shadow has nothing darker to fall on. In light mode, `surface-raised` is the page color (step 1) and the shadow carries the height. That is why Card took `shadow-sm` in the design pass: the light Card fill became 1.00:1 against the page, and the hairline alone made it look printed on the page rather than set on it. A raised surface is never darker than the page in either mode. A darker fill reads as a well, the opposite of raised.

**Shadows are neutral and lit from above.** Every shadow is black at some alpha, offset straight down, with two layers: a tight one for the contact edge and a wide, soft one for the distance. Higher levels have a bigger offset, a bigger blur and more alpha, because a surface further from the page casts a larger, softer shadow. Geometry is fixed in both modes and only alpha changes, which is why `shadow` is themeable. Ultima uses no colored shadows, no inset bevels, no glows and no text shadows. Each of these adds depth that doesn't come from z-order.

**Elevation doesn't change on hover.** Hover moves a fill or an edge one palette step. Elevation changes only when the reader physically moves something: the outline Button drops its `shadow-xs` and moves 1px down on press, the way a key sets down, and a Slider thumb rises from `shadow-sm` to `shadow-md` while it is dragged, because it has been picked up. A card that rises on hover promises an interaction a static Card doesn't have.

**Don't stack levels inside one another.** A Card inside a Card gives two shadows at the same level and no new information. Inside an object, group with space, a `Separator` or a `surface-sunken` well. A popup opened from inside a Card is still level 3, because level follows z-order, not nesting.

**A frame around other content is level 0.** The docs frame a code sample, a live preview or an install command with a Card's hairline, fill and radius, and drop its shadow. A preview holds objects with their own level, so a raised frame would be a Card inside a Card, and a code sample is part of the text around it, the way a Table is. The frame is a region of the page, not an object on it.

**A pinned mode pins its shadows.** The base `shadow` tokens switch on the system's `prefers-color-scheme`, like the colors. A theme that forces a mode on a subtree carries that mode's shadow values as well as its colors. Otherwise a page pinned to light on a system set to dark casts the dark mode's shadows, four to five times the light alpha, and every raised edge reads as a heavy grey line.

**Only level 4 gets a scrim and blur.** See Blur.

## Borders

A border answers one of four questions, and the question picks the token:

| Purpose | Token | Contrast against the page | Examples |
| --- | --- | --- | --- |
| Where is the control? | `--ult-color-border-strong` | At least 3:1, gated | Input, Select trigger, Checkbox, Radio, Switch track |
| Where does this region end? | `--ult-color-border` | Not gated (1.46:1 light, 1.78:1 dark) | Card, popups, dialogs, Alert |
| Where does one row or section end? | `--ult-color-border` | Not gated | Table head rule, Separator, Accordion items |
| What state is it in? | `border-hover`, `danger`, `<role>-border` | 3:1 where it is the only signal | Field hover, invalid field, toned Alert |

**An edge a person needs to find a control meets 3:1** against the page in both modes ([WCAG 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)). All four reference systems draw field edges at 1.3 to 1.5:1, and this is where Ultima departs on purpose. An edge that only decorates (a Card, a popup, an outline Button whose label already identifies it) uses the quiet `border` color, because a 3:1 line on every surface would make the screen heavy.

**Two widths, chosen by purpose.** An edge that only decorates (a Card, a popup, a dialog, an Alert, a divider, a table rule) is `border.fine`, 0.5px. Browsers round a border to whole device pixels with a minimum of one, so 0.5px draws one crisp device pixel on a high-density screen and an ordinary 1px line on a standard one (measured in Chromium), which makes structure quieter on the screens that can show it without losing it on the ones that can't. An edge a person uses to find or operate a control (a field, a checkbox, a radio, a switch, the outline Button, a toggle) is `border.hairline`, 1px: halving it on a high-density screen halves how easy it is to see, whatever its contrast ratio. Marks drawn with a border, such as Spinner's ring and Input OTP's dash, keep 1px too, because they are glyphs rather than edges. Emphasis comes from a darker palette step, never a thicker line, because a thicker line changes the box size and reads as a different kind of thing. 2px is kept for the two things that mark one position: the focus outline, and the indicator under the current item (the selected tab's underline, Sidebar's active bar). Keeping 2px for them is part of what makes focus and the current item easy to find. Never write a width between these values or compute one: `calc()` on a border width lands between device pixels.

**Solid by default, dashed for "nothing here yet".** A dashed edge marks a placeholder: Empty, a drop zone, a slot to fill. It reads as incomplete on purpose, so it never appears on something that is already there. Ultima has no dotted borders.

**A label's outline is decorative.** An outline Badge has no fill, so its edge draws the pill, but nobody operates a badge and its words carry the meaning, so the edge is `border.fine` in the tone's `<role>-border` (`border` for neutral) and is not gated. Every Badge variant draws the same 0.5px border, transparent where the fill is the edge, so the three variants are one size and can sit side by side in a row.

**Leave the border off when something else already draws the edge.** A solid Button's fill is its edge. A soft Badge's tint is its edge, and so is a Combobox chip's. Items inside a popup are separated by space and a highlight fill, not lines. A toned Alert's edge uses its hue (`<role>-border`) so the edge and the fill agree. Ultima doesn't use a single colored side stripe to signal tone. The fill, ink and icon already carry it, and a lone stripe reads as decoration.

## Outlines and borders

**An outline is for focus and nothing else. A border is for structure.**

- An outline takes no layout space, so showing focus never moves anything.
- An outline survives Windows forced-colors mode, where `box-shadow` focus rings disappear.
- An outline sits outside the box with an offset, so it can't be mistaken for the control's own edge on a button.

The focus outline is 2px `--ult-color-border-focus`, and it always sits outside the control with a 2px gap (`border.focusOffset`), on fields as well as buttons and selection controls. The gap keeps focus a separate signal from the control's own edge. A ring laid over a field's border merges with it and reads as a slightly heavier border, where a ring standing off the edge reads as something new around the control. The gap also puts the ring against the page around the control, which is the background the focus color is gated against at 3:1, rather than against the control's own edge ([WCAG 2.4.13 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html) measures the ring against what it replaces). An invalid field keeps its `--ult-color-danger` edge when focused, and its ring stays the focus color. The edge already carries the error before, during and after focus, so a red ring would only double it, and one focus color on every control is what lets a person find focus at a glance. Items in menus and lists show focus with the `surface-hover` highlight instead of a ring, because the highlight moves with the arrow keys. A Combobox chip takes the ring although arrow keys move between chips, because a one-step change on its tint would be too faint to find. A popup that Base UI focuses only as a fallback container sets `outline: none`, since the popup itself is the visible signal.

One mark draws a ring that isn't focus: a thumb over arbitrary color, such as Color Field's area thumb, wears a two-tone ring. A 2px `surface-raised` border sits inside a 1px `border-strong` outline, because no single color contrasts with every hue under the thumb, and the light ring reads on dark colors while the dark line reads on light ones. A thumb on a strip of color, such as Color Field's hue, needs no ring: it is Slider's thumb, 16px against a 6px strip, so its 3:1 edge always crosses the surface around the strip, where the gate checks it, whatever hue sits under its middle. Apart from that, never use an outline for decoration, and never draw focus with `box-shadow`. shadcn's translucent 3px ring measures about 1.5:1 and disappears in forced colors, which is why Ultima doesn't use one.

## Radius

Corners are set by role, in `px` so they don't grow with the font size:

| Role | Token | Value |
| --- | --- | --- |
| Marks: swatches, bars, indicator dots | `--ult-radius-xs` | 2px |
| Small insets: inline code, popup items, chips, Tooltip, Checkbox | `--ult-radius-sm` | 4px |
| Controls: Button, Input, Select trigger | `--ult-radius-md` | 6px |
| Surfaces: popups, Alert, the Code block | `--ult-radius-lg` | 8px |
| Objects and modals: Card, Empty, Dialog, Drawer | `--ult-radius-xl` | 12px |
| Pills: Badge, Switch, Avatar, Slider thumb, progress tracks | `--ult-radius-full` | 9999px |

**Bigger things get bigger corners.** The corner grows with the role because a fixed radius looks rounder on a small box than on a large one. Twelve pixels on a 32px button is almost a pill, and four pixels on a 400px dialog looks sharp.

**Nested corners are concentric.** An inner corner equals the outer corner minus the gap between them: a popup item's 4px sits inside the popup's 8px with a 4px inset (8 − 4 = 4). Equal radii nested inside each other look pinched at the corners, because the gap between the curves is wider than the gap along the sides. When you put a rounded thing inside another, check the arithmetic.

**An edge flush with another edge is square.** A Drawer squares the corners on the side that meets the viewport. Button Group items square the corners where they join, and keep the outer ones. Rounding an edge that touches something else leaves a notch.

**Never compute from a radius step.** Shape presets in Theme Studio change every radius value, so `calc()` on a radius token breaks under a consumer's theme. Pick the role's token.

## Opacity

**Opacity is for motion and scrims only.**

- Enter and exit transitions fade from 0 to 1 and back.
- The scrim behind a modal uses `--ult-color-surface-overlay`, the one color token with alpha.

Don't use opacity for:

- **Disabled.** A disabled control takes the `surface-sunken` fill, the quiet `border` and `--ult-color-text-disabled` ink. Its placeholder and the glyphs inside it (chevrons, clear marks, addon text, separators) take the disabled ink too, or an empty disabled field looks editable. Transparency lets whatever is behind the control show through and makes its value hard to read. The color is gated against its fill; an alpha isn't.
- **Secondary text.** Use `text-muted` or `text-subtle`. Alpha text changes contrast with every background it sits on, so the contrast gate can't vouch for it.
- **Hover and press.** Move one palette step. An alpha hover on a solid fill gives a different color over every background.
- **Borders.** A translucent border doubles up where two surfaces meet and disappears on busy content.

The rule underneath all four: every color a reader sees should be a token the contrast gate has checked. Opacity produces colors the gate never saw.

## Blur

**Blur is for the modal scrim only.** `--ult-filter-backdrop` (`blur(4px)`) sits on the backdrop of Dialog, Alert Dialog and Drawer, behind level 4. It pushes the page out of focus so the reader's attention goes to the modal, and it softens the edges of busy content under the wash.

Don't blur:

- **Popups and menus.** Frosted glass makes text over busy content harder to read, costs GPU time on every frame the popup is open, and is dropped in forced colors. A popup already separates with a hairline and a shadow.
- **Content as a loading or disabled state.** A blurred value looks broken. Use Skeleton for loading and the disabled colors for disabled.

A theme may drop the blur and keep the wash, so the scrim never depends on blur for contrast. The wash (`surface-overlay`) does the separating.

## Color

**Components read roles, never hues.** A component uses semantic tokens (`surface`, `text`, `border`, `accent`, `danger`…), never a palette step or a literal. That's what lets a consumer re-skin Ultima without touching a component.

**Steps mean the same thing in every scale and both modes:**

| Steps | Use |
| --- | --- |
| 1–2 | Page and raised surfaces |
| 3–5 | Tinted fills at rest, on hover, when pressed |
| 6–8 | Edges: hairline, hover, strong (3:1) |
| 9–11 | Solid fills at rest, on hover, when pressed |
| 12 | The hue as text (4.5:1) |

**Interaction moves one step.** Hover is the next step and press the one after, for fills (9 → 10 → 11, 3 → 4 → 5) and for field edges (8 → 9). States come from palette steps the gate has checked, never from filters, opacity or `color-mix()`.

**A held selection is step 5 and outranks hover.** A selected table row takes `accent-subtle-active`, the step the 12-step convention gives selected backgrounds, and keeps it under the pointer. A hovered row takes `surface-hover`, step 4. Selection is state and hover is a passing reading aid, so selection is the stronger fill and never looks like the pointer going by. In a monochrome theme the two sit one step apart and the row's checked box carries the state. With a hued accent they differ in hue as well.

**Contrast is a gate, not a guideline.** Text meets 4.5:1 ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)). Any edge or mark a person needs to find or read a state meets 3:1. Decorative hairlines are not gated.

**Color never works alone** ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)). A status pairs its hue with an icon and words. An invalid field pairs its danger edge with a message. A chart pairs its series colors with a legend or labels.

**A toast's status mark leads its text.** Toast draws a circled check for success, a triangle for warning and a circled exclamation for danger, in the tone's ink, which is gated at 4.5:1 and so clears 3:1 as a mark. Danger isn't an x, which beside Close would read as a second dismiss, and warning's triangle differs from danger in shape as well as hue. Loading turns a ring in the same slot, so the text doesn't move when the promise settles. Neutral, accent and highlight report no status and take no mark. The mark is `1em` at `text-6`, the step nearest the Title's 19px line box, so it weighs as much as the title, and it centres on the text with the actions.

**Hue means status.** `success`, `warning` and `danger` say something about state and are kept for that. The accent is monochrome ink by default, so the one place color appears in a neutral screen is where something needs attention. Series colors are for charts only, and status roles never stand in for a chart series.

**A destructive menu item wears the danger tone whole** (`tone="danger"` on Dropdown Menu's and Context Menu's `Item`, and so in a Menubar): its label, icon and shortcut take `danger-text`, and its highlight takes `danger-subtle`, the fill that ink is gated on, as a ghost danger Button's hover does. A neutral highlight under red ink would pair two colors the gate never checked. Disabled, it takes the disabled ink like any item. The tone warns before the click; the label still names the act, so color never works alone.

**One solid accent per region.** The solid accent fill is the loudest thing on a screen. Spend it on the primary action, and use soft, outline or ghost for the actions beside it. Two solid accents next to each other leave the reader to guess which one matters. A toast is a region of its own, and its one action is a solid `sm` Button: it has seconds to be found, and a ghost Button reads as text. The action keeps Button's tone, because its color says what pressing it does, not what the toast reports.

**A grey fill means "you can't use this".** Fields are the brightest surface (ink on paper), so `surface-sunken` grey is kept for disabled. Don't grey-fill a live surface. Empty marks a gap with a dashed edge rather than a grey fill for this reason.

**Read-only is live, so it keeps the paper.** A read-only field still takes focus and the ring, lets its value be selected and copied, and submits it. It keeps the `field` fill, `text` for the value and `text-subtle` for placeholder and glyphs, and gives up only what says "type here": the 3:1 edge drops to the quiet `border`, hover stays off, the caret is hidden, and a control that would change the value leaves (a clear mark, a chip's remove). A glyph that names the kind of value (a chevron, a calendar) stays, without hover. The quiet edge is outside the gate: the label and the 4.5:1 value find the field, and the ring meets 3:1 on focus. Editable and read-only share the paper, read-only and disabled share the quiet edge, and only disabled is grey. A choice control's box is its value, so a read-only Checkbox, Radio or Switch keeps its whole resting look, 3:1 edge included, and drops only hover and press. The fill, not the ink, separates read-only from disabled, so `text-disabled` and `text-subtle` stay one step apart (mithril 9 and 10) and neither token moves.

**Dark mode is designed, not inverted.** The palette is generated per mode, surfaces get lighter as they rise, and neither mode uses pure black or white (`#0e0e0e` and `#fdfdfd` in the default theme), which cuts glare and leaves room for a shadow or a lighter step.

## Spacing

**Every gap, padding and size comes from the `space` scale.** It runs in 2px steps at the bottom where component internals live and doubles at the top where page rhythm lives (2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64). Control heights are steps 9, 10 and 11 (32, 40, 48px). The scale is themeable through Theme Studio's Density control, so a literal breaks density.

**Space inside a group is smaller than space between groups.** This is the proximity rule, and it does most of the work borders would otherwise do. Each level out takes a bigger step: a Card's title and description sit 6px apart (step 3), its parts sit inside 24px of padding (step 8), and Cards in a grid need more than that between them.

**Padding grows with the container,** in step with the corner:

| Container | Padding | Corner |
| --- | --- | --- |
| Popup inset around its items | 4px (step 2) | 8px |
| Menu item, inline | 8px (step 4) | 4px |
| Combobox chip, inline | 8px (step 4) | 4px |
| Button, inline, md | 16px (step 6) | 6px |
| Alert | 12px block, 16px inline | 8px |
| Popover | 16px (step 6) | 8px |
| Card, Dialog | 24px (step 8) | 12px |

Padding smaller than the corner lets content crowd the curve. Padding much bigger than the corner makes the box feel empty.

**Adjust for what the eye sees.** An icon is lighter than a word, so the side of a Button that holds an icon takes one step less padding (16 → 12px) to look balanced. A Badge holding a leading icon or status dot does the same (8 → 6px), with the mark 4px from its label, the badge's block padding, so the mark groups with the word rather than the edge. A status dot is the label's x-height (6px on 12px text), so it reads as a glyph in the line. It takes the tone's solid step, or the label's ink on a solid fill, where the solid step would vanish. A field holding chips drops its start padding to the gap above the chips, so the first chip sits evenly in the corner. Uppercase micro-labels get wide tracking because capitals set tight look cramped.

**Components carry no outer margin.** A component sets `margin: 0` on its root, and the layout around it sets the space between components with `gap`. Space between things belongs to whatever contains them. That keeps a component reusable in any layout.

**Targets are big enough to hit.** Buttons, fields and triggers are at least 32px tall. Anything interactive meets [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): 24 by 24px, or enough room around it that a 24px circle centered on it touches no other target. A small mark such as a 16px Checkbox gets its target from its label and spacing, never by drawing the mark bigger.

## Layout

**Let the container decide, and use a breakpoint last.** A component fills the width it's given and adapts with flex wrapping and `minmax()` grids, so the same component works in a sidebar, a dialog or a full page. A viewport breakpoint only knows the window size, not how wide the component's column is. Where a layout really changes shape (Sidebar turning into a menu, a block's panes stacking), it uses one of the two named breakpoints from the specification's Principles: `DESKTOP` at 48rem and `WIDE` at 64rem, declared as module constants under those names. The narrow layout is the default style and the wider one sits under the query, so what a phone gets never depends on a query matching. 48rem is the first width where a 256px sidebar and a 512px content column fit side by side. Below 64rem four cards beside the sidebar leave under 100px each for a headline number, so a row of stat cards stays two-up until `WIDE`.

**Everything reflows at 320px.** At 320 CSS pixels wide (a 1280px window zoomed to 400%), every component fits without sideways scrolling ([WCAG 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)). Panel widths are capped at the space available for that reason, with `min(…, 100%)` or the positioner's `--available-width`. Content that really needs two dimensions, such as a wide table or a palette grid, scrolls in its own focusable region (`Table.Scroll` or Scroll Area), never the page.

**Panel widths step by 64px** (multiples of space step 12), so Density scales them along with everything else:

| Panel | Width |
| --- | --- |
| Sidebar, side Drawer | 256px (4 × step 12) |
| Popover, Hover Card, anchored Toast, at most | 320px (5 ×) |
| Toast stack | 384px (6 ×) |
| Dialog, Alert Dialog, at most | 448px (7 ×) |

A dialog is the widest panel built for reading. Inside its 24px padding it leaves 400px of 14px text. An average Figtree character is about half an em wide, so that's roughly 57 characters a line.

An anchored Toast takes the popup cap, not the stack's 384px. It is a popup tied to its trigger, often a one-word confirmation, so it sizes to its message (`max-content`) and wraps only past 320px or `--available-width`. A stacked toast is a row in a column of others, so it keeps the stack's width.

One trigger holds one anchored toast: a repeat passes the trigger's fixed `id` and updates the toast in place, as Base UI, Sonner and Mantine all dedupe. Toasts at different anchors don't overlap, so an anchored toast keeps its text when a newer one opens. Only the collapsed stack hides the content behind its front.

**Running text stays between 45 and 75 characters a line.** On longer lines the eye loses its place on the way back to the next line. Shorter lines break phrases apart. Prose, descriptions and long messages sit in a column whose maximum width keeps them in that range.

**A popup is at least as wide as its trigger,** through `--anchor-width` (Select, Combobox), and never wider than the space available (`--available-width`). A list as wide as its field reads as part of that field, and the cap keeps it on screen. When the space available is narrower than the trigger, the cap wins and the popup is narrower than its trigger.

**A list opened from a trigger that can be short keeps a 128px floor** (2 × step 12): Select, as `max(var(--anchor-width), 128px)`, and every menu. Under a 64px trigger a list only as wide as its trigger leaves no room between a label and its trailing check. Combobox and Command match their text field exactly, because a field you type in is never that short. Placed below its trigger, the wider list starts on the trigger's start edge, so its labels share the value's start edge.

**Flexible children can shrink.** A flex or grid child that holds text or a field sets `min-width: 0`. The platform default, `min-width: auto`, holds it at its content width and pushes it out of its container.

**Content in a surface shares one start edge.** A group label, the items under it and the surface's title begin on the same inline line. An icon leads its label in a `1em` box, so every label that carries one starts on the same line. A selection indicator (a check or a radio dot) sits on the trailing edge, so the leading slot only ever holds icons. With no icon, text sits flush with the start edge. Aligned edges read as one group and let the eye scan straight down. A leading check would push selected items' text off the line every other item follows.

**What trails a label keeps 12px from it** (step 5), one step more than the 8px between a leading icon and its label. The icon belongs to its label; a check, a shortcut or a chevron is a separate column, and the larger gap is what keeps a check from reading as a glyph of the last word. **The selection indicator owns the trailing edge and a shortcut sits just inside it**: state stays in one straight column whichever rows carry keys, and checking a row never moves its shortcut. Every row of a popup that holds a checkbox or radio item keeps the indicator's column, so labels end and shortcuts line up at one edge. A submenu chevron shares the indicators' edge.

**Icons size with their text.** An icon inside a line of text or a control is `1em` square, so it follows the text from `sm` to `lg`. An icon that stands alone, such as Empty's, sets a `text` step as its font size and is `1em` within it. Icon sets are not consistent about size: Lucide and Tabler draw 24px, Heroicons sets no size, and Radix Icons draws 15px. So an icon from the consumer's set goes inside `Icon`, which makes it `1em` whatever the set wrote.

**Icons draw a 1.5 stroke on a 24 grid.** Ultima's own glyphs use it, and `Icon` passes `strokeWidth={1.5}` to the icon it renders, so Lucide, the default set, matches them. One weight across a consumer's icons and the built-in chevrons and checks keeps a row of controls from looking assembled from two kits. An icon that sets its own `strokeWidth` keeps it.

## Type

The specification's [Type](https://github.com/frankieramirez/ultima/blob/main/docs/spec/ultima.md#type) and [Typefaces](https://github.com/frankieramirez/ultima/blob/main/docs/spec/ultima.md#typefaces) sections hold the values. These rules choose among them.

**Two sizes do most of the work.** 14px (`text-4`) is the size of a component's own text: control labels, field values, menu items, tabs, descriptions and table cells. 16px (`text-5`) is running page text, and a field's value under a coarse pointer. All four reference systems set UI text at 14px (shadcn/ui `text-sm`, Mantine `sm`, Radix Themes size 2, DaisyUI `0.875rem`). Holding one size inside components leaves size free for the few things that need to stand out.

**Size, leading and weight follow the role:**

| Role | Size | Leading | Weight | Examples |
| --- | --- | --- | --- | --- |
| Title of a container that holds a task | 18px (`text-6`) | tight | semibold | Card, Dialog, Alert Dialog, Drawer |
| Title of a smaller surface or a state | 16px (`text-5`) | tight | semibold | Popover, Empty |
| Title of a message | 14px | snug | semibold | Alert, Toast |
| Field label, legend | 14px | snug | medium | Field, Fieldset, Select, Slider, Meter, Progress |
| Text on a control | 14px; 13px (`text-3`) at `sm`, 16px at `lg` | none | medium | Button, Tab, Toggle |
| Value in a field | 14px; 16px at `lg` and under a coarse pointer | none | regular | Input, Select, Combobox |
| Item in a menu or list | 14px | normal | regular | Select, Dropdown Menu, Command, Sidebar |
| Description, body inside a component | 14px | normal | regular | Card, Dialog, Alert |
| Small print | 12px (`text-2`) | snug | regular | Field description and error, Tooltip |
| Part label inside a control | 12px | none | medium | Badge, Calendar's weekdays, Color Field's channels |
| Change tagged onto a figure | 12px, tabular | snug | medium | Stat's delta |
| Summary row | 14px | snug | medium | Table's foot |
| Section micro-label | 12px, uppercase, `tracking-wide` | snug | regular | Menu group labels, Sidebar group label, Table head cells, Stat |
| Headline number | 30px (`text-9`), 24px below `DESKTOP`, `tracking-tight` | none | semibold | Stat's value |

A title steps up in size as its container grows, in step with the padding and corner in Spacing. Small, glanceable surfaces separate title from description by weight alone, which keeps them short.

**A headline number gets its presence from size, never a fourth weight.** Stat's value is the one figure on its surface read at a glance, so it sits at 30px, well clear of an 18px Card title, at semibold, the heaviest weight the scale has. A number can't wrap, so below `DESKTOP`, where stat cards sit two-up on a phone, it holds 24px and seven characters still fit. Where a row of stat cards narrows past a breakpoint, as four-up just past `WIDE` does, the value follows its card instead, the way Avatar's initials track their box: the card body takes `container-type: inline-size` and the value `clamp(20px, 18cqi, 30px)`, so 30px needs about 167px of card. At 18cqi a six-figure value leaves a tenth of its card spare, enough for a fallback font's wider figures, so it never runs into the padding. Its delta takes a Badge label's role without the pill, 12px medium in tabular figures. Its tone follows what the change means, not its sign: a rising refund rate is `warning`. A trend line glyph may lead it, never an arrow pointing up and to the right, which reads as an external link. A table's foot row takes medium weight because it labels the rows above it as their sum. The rule under the last body row sets it apart, so it needs no fill and no closing rule.

**Weight marks the kind of text.** Regular (400) is for text read as content. Medium (500) is for text that labels something or acts: labels, control text, tab names. Semibold (600) is for titles and the one headline number. Three weights cover those three jobs. There is no bold because no role needs a fourth, and in a single surface two weights never mean the same thing. Selection doesn't change weight. A selected item already shows its state with the check and the highlight, and heavier text is wider, so the label shifts or truncates differently. A mark inside a fixed cell, such as Calendar's today in tabular digits, can take weight because nothing around it moves.

**Leading follows how many lines the text can run to:**

- `none` (1) is for a line that never wraps inside a box whose height comes from the space scale, such as a Button, a Tab, a Badge or a Calendar day. The box centers the line, and any extra leading would only add uneven space above and below.
- `tight` (1.2) is for titles and large numbers. The gap between lines looks bigger as text grows, so big text needs proportionally less leading.
- `snug` (1.35) is for short text that might wrap to two or three lines in a compact place: labels, helper text, tooltips, table cells.
- `normal` (1.55) is for anything read as a paragraph: descriptions, body text, code blocks, list items that can wrap.
- `relaxed` (1.75) is for long-form reading at 16px, such as an article body.

**A fixed height holds one line.** A control with a fixed height (Button, Input, Toggle) keeps its text on one line with `white-space: nowrap`. Anything whose text can wrap takes a minimum height instead (Textarea, Tabs, Select items). A reader may raise line height to 1.5 and widen letter and word spacing ([WCAG 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)), and wrapped text inside a fixed height would be clipped.

**Tracking follows size.** Text from 12px to 20px keeps the face's own spacing (`tracking-normal`). From 24px up, use `tracking-tight`, because a face spaced for text sizes looks loose at display sizes. `tighter` and `tightest` are for the docs' display headings from 36px up. Uppercase micro-labels take `tracking-wide`: capitals set at text spacing look cramped.

**Mono is for characters a reader compares or copies one at a time:** code, hex values, API keys and identifiers. Everything else is sans, a keyboard shortcut included: it is read as one chord at a glance.

**A shortcut attached to an item is muted text, never a key cap,** the same in a menu, Command and Tooltip: 12px `text-subtle`, `tracking-wide`, on one line. Capitals and modifier glyphs at text spacing run together, the reason micro-labels are tracked. A cap draws a border on every row, and a popup's items are separated by space and a highlight, never lines; muted ink is the weakest cue that sets keys apart from a label. Each component carries its own `Shortcut` part rather than sharing an element, so every item still installs alone. In a menu row it trails at the edge; in a Tooltip it follows the label 8px away, the item gap, since there is no column to line up. The trigger also names the keys in `aria-keyshortcuts`, because a tooltip is never read as its name. A key cap is for keys standing alone in a sentence or a hint bar, such as the command dialog's footer, where nothing else sets them apart.

**Numbers that line up or change in place set `tabular-nums`:** Stat, numeric table cells, Calendar days, Pagination, and Slider, Meter and Progress values. Proportional digits shift a column's alignment and make a changing value jitter. A column of numbers also aligns on the end edge, its head included (`numeric` on `Table.HeadCell` and `Table.Cell`), so units, tens and hundreds line up down the column.

**Every text part sets its own size, line height and margin.** Nothing inherits a browser default, because a component can't know what surrounds it. Text sizes are in `rem`, so they follow the reader's chosen root size ([WCAG 1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)).

**A field's value rises to 16px under `(pointer: coarse)`.** iOS zooms the page into any focused field whose text is smaller than 16px.

## Motion

The specification's [Motion](https://github.com/frankieramirez/ultima/blob/main/docs/spec/ultima.md#motion) section holds the values. Colors change over `--ult-motion-fast` with the standard easing. Popups fade and scale from 96% out of their trigger. Nothing moves that doesn't need to, and every duration collapses under reduced motion through the tokens.

## Where the code doesn't follow these rules yet

None at present. A rule that lands before the code follows it lists each gap here, with the issue that owns the fix, so nobody copies the gap as precedent.

## Sources

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): 1.4.1 Use of Color, 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast, 2.4.7 Focus Visible, 2.5.8 Target Size (Minimum). Contrast ratios use the WCAG 2.x formula.
- Gestalt grouping: proximity, common region, and figure and ground decide which of the four separation cues to reach for.
- Material Design's elevation model: z-order shown by shadow in light themes and by surface lightness in dark themes.
- The 12-step scale convention from Radix Colors, amended in the specification's [Step convention](https://github.com/frankieramirez/ultima/blob/main/docs/spec/ultima.md#step-convention).
- The reference systems, read as source on 2026-10-16: shadcn/ui new-york-v4, Mantine 9.7.2, DaisyUI 5.7.50, Radix Themes 3.3.0. The design language document records the side-by-side values.
- Ultima's measurements: token values from `packages/tokens/scripts/palette.json`. The shadow figures come from rendering each shadow token on its mode's page color and reading the darkest pixel under the surface.
