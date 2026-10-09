// The property-specific value grammar ULT-TOKEN-001 applies to every checked declaration.
// docs/spec/agent-infrastructure.md, Values and runtime styles, and its Value grammar table. A value
// is a sequence of pieces, each literal source text, a token read, a runtime value or a keyframes
// reference; the grammar tokenizes the literal text and decides each piece by the property's category.
// There is no global number or string allowlist: `width: '100%'` is structural, `fontSize: '100%'` is
// not.

/** A semantic token family, from the token's key, or a compile-time constant group. */
export type Family =
  | 'color'
  | 'space'
  | 'text'
  | 'font-family'
  | 'font-weight'
  | 'font-leading'
  | 'font-tracking'
  | 'radius'
  | 'shadow'
  | 'filter'
  | 'motion'
  | 'easing'
  | 'border'
  | 'z'
  | 'display'
  | 'relative-text'
  | 'scrollbar';

/** Semantic `defineVars` families, by key prefix. Longest prefix first. */
const VAR_FAMILIES: readonly [string, Family][] = [
  ['--ult-font-weight-', 'font-weight'],
  ['--ult-font-leading-', 'font-leading'],
  ['--ult-font-tracking-', 'font-tracking'],
  ['--ult-font-', 'font-family'],
  ['--ult-color-', 'color'],
  ['--ult-space-', 'space'],
  ['--ult-text-', 'text'],
  ['--ult-radius-', 'radius'],
  ['--ult-shadow-', 'shadow'],
  ['--ult-filter-', 'filter'],
  ['--ult-motion-', 'motion'],
];

/** Compile-time constant groups a component may read, by export name: docs/spec/ultima.md, Token groups in v0. */
const CONSTANT_GROUPS: Record<string, Family> = { easing: 'easing', border: 'border', z: 'z', display: 'display', relativeText: 'relative-text', scrollbar: 'scrollbar' };

/** A palette scale's steps: `stylex.defineConsts` keyed `dark1`..`light12`. Nothing outside the tokens package reads one. */
const PALETTE_STEP = /^(dark|light)\d+$/;

export type GroupShape = { name: string; kind: 'vars' | 'consts'; keys: string[] };

/** What a token group is, from its declaration: a family per key, a palette scale, or an unclassified constant group. */
export function groupKind(group: GroupShape): 'semantic' | 'palette' | 'constant' | 'unclassified' {
  if (group.kind === 'vars') return group.keys.every((key) => varFamily(key)) ? 'semantic' : 'unclassified';
  if (group.keys.length > 0 && group.keys.every((key) => PALETTE_STEP.test(key))) return 'palette';
  return group.name in CONSTANT_GROUPS ? 'constant' : 'unclassified';
}

export function varFamily(key: string): Family | undefined {
  return VAR_FAMILIES.find(([prefix]) => key.startsWith(prefix))?.[1];
}

export function familyOf(group: GroupShape, key: string): Family | undefined {
  return group.kind === 'vars' ? varFamily(key) : groupKind(group) === 'constant' ? CONSTANT_GROUPS[group.name] : undefined;
}

// ---------------------------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------------------------

export type CategoryId =
  | 'color'
  | 'paint'
  | 'length'
  | 'radius'
  | 'border-width'
  | 'outline-offset'
  | 'border'
  | 'shadow'
  | 'font-size'
  | 'font-weight'
  | 'line-height'
  | 'letter-spacing'
  | 'font-family'
  | 'duration'
  | 'delay'
  | 'easing'
  | 'z-index'
  | 'opacity'
  | 'transform'
  | 'translation'
  | 'scale'
  | 'angle'
  | 'origin'
  | 'filter'
  | 'keyword'
  | 'content'
  | 'count'
  | 'flex'
  | 'grid-template'
  | 'grid-placement'
  | 'aspect-ratio'
  | 'scrollbar-width'
  | 'animation-name'
  | 'image'
  | 'gradient'
  | 'clip'
  | 'custom-property';

export type Category = {
  id: CategoryId;
  /** What the value is, for messages: "a color". */
  noun: string;
  families: readonly Family[];
  /** `any` for enumerated behavior; otherwise the property keywords beyond the CSS-wide ones. */
  keywords: 'any' | readonly string[];
  zero?: boolean;
  percent?: boolean;
  viewport?: boolean;
  fr?: boolean;
  angle?: boolean;
  strings?: boolean;
  /** Bare unitless numbers outside a calculation. */
  unitless?: (value: number) => boolean;
  /** A category whose calculations are dimensioned, so a unitless factor in one only scales a token or a runtime value. */
  dimensioned?: boolean;
  /** A value computed at run time is acceptable as is, because the property only takes keywords. */
  runtime?: boolean;
  /** Functions other than calc(), min(), max(), clamp() and var(), and the category their arguments take. */
  functions?: Readonly<Record<string, CategoryId>>;
  /** Where the value comes from instead, for the repair line. */
  source: string;
};

const TRANSFORMS: Record<string, CategoryId> = {
  translate: 'translation',
  translatex: 'translation',
  translatey: 'translation',
  translatez: 'translation',
  translate3d: 'translation',
  scale: 'scale',
  scalex: 'scale',
  scaley: 'scale',
  scale3d: 'scale',
  rotate: 'angle',
  rotatex: 'angle',
  rotatey: 'angle',
  rotatez: 'angle',
  skew: 'angle',
  skewx: 'angle',
  skewy: 'angle',
};

const GRADIENTS: Record<string, CategoryId> = {
  'linear-gradient': 'gradient',
  'radial-gradient': 'gradient',
  'conic-gradient': 'gradient',
  'repeating-linear-gradient': 'gradient',
};

const SIZE_KEYWORDS = ['auto', 'none', 'fit-content', 'min-content', 'max-content', 'stretch', '-webkit-fill-available'];
const BORDER_STYLES = ['none', 'hidden', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'auto'];

export const CATEGORIES: Readonly<Record<CategoryId, Category>> = {
  color: { id: 'color', noun: 'a color', families: ['color'], keywords: ['transparent', 'currentcolor'], source: 'a semantic color token' },
  paint: { id: 'paint', noun: 'an SVG paint', families: ['color'], keywords: ['transparent', 'currentcolor', 'none'], source: 'a semantic color token or currentColor' },
  length: {
    id: 'length',
    noun: 'a spacing or sizing length',
    families: ['space', 'border'],
    keywords: SIZE_KEYWORDS,
    zero: true,
    percent: true,
    viewport: true,
    dimensioned: true,
    functions: { 'fit-content': 'length' },
    source: 'a space token, or a percentage or viewport bound for structure',
  },
  radius: { id: 'radius', noun: 'a corner radius', families: ['radius'], keywords: [], zero: true, dimensioned: true, source: 'a radius token' },
  'border-width': { id: 'border-width', noun: 'a border width', families: ['border'], keywords: [], zero: true, dimensioned: true, source: 'border.hairline or border.focus' },
  'outline-offset': { id: 'outline-offset', noun: 'an outline offset', families: ['border'], keywords: [], zero: true, dimensioned: true, source: 'border.focusOffset' },
  border: {
    id: 'border',
    noun: 'a border shorthand',
    families: ['border', 'color'],
    keywords: [...BORDER_STYLES, 'transparent', 'currentcolor'],
    zero: true,
    dimensioned: true,
    source: 'a border constant and a semantic color token',
  },
  shadow: {
    id: 'shadow',
    noun: 'a shadow',
    families: ['shadow', 'border', 'color'],
    keywords: ['none', 'inset'],
    zero: true,
    dimensioned: true,
    source: 'a shadow token, or a ring built from border constants and color tokens',
  },
  'font-size': { id: 'font-size', noun: 'a font size', families: ['text', 'relative-text'], keywords: [], dimensioned: true, source: 'a text token or a relativeText constant' },
  'font-weight': { id: 'font-weight', noun: 'a font weight', families: ['font-weight'], keywords: [], source: 'a font weight token' },
  'line-height': { id: 'line-height', noun: 'a line height', families: ['font-leading'], keywords: ['normal'], source: 'a font leading token' },
  'letter-spacing': { id: 'letter-spacing', noun: 'a letter spacing', families: ['font-tracking'], keywords: ['normal'], zero: true, dimensioned: true, source: 'a font tracking token' },
  'font-family': { id: 'font-family', noun: 'a font family', families: ['font-family'], keywords: [], source: '--ult-font-sans or --ult-font-mono' },
  duration: { id: 'duration', noun: 'a duration', families: ['motion'], keywords: [], dimensioned: true, source: 'a motion duration token' },
  delay: { id: 'delay', noun: 'a delay', families: ['motion'], keywords: [], zero: true, dimensioned: true, source: 'a motion duration token' },
  easing: { id: 'easing', noun: 'an easing', families: ['easing'], keywords: ['linear'], source: 'an easing constant' },
  'z-index': {
    id: 'z-index',
    noun: 'a stacking level',
    families: ['z'],
    keywords: ['auto'],
    unitless: (value) => value === 0 || value === 1,
    source: 'z.popup or z.toast, or a local 0 or 1 among the component’s own parts',
  },
  opacity: { id: 'opacity', noun: 'an opacity', families: [], keywords: [], unitless: (value) => value >= 0 && value <= 1, source: 'a unitless opacity from 0 to 1' },
  transform: { id: 'transform', noun: 'a transform', families: [], keywords: ['none'], functions: TRANSFORMS, source: 'translations by tokens or percentages, unitless scales and angles' },
  translation: {
    id: 'translation',
    noun: 'a translation',
    families: ['space', 'border'],
    keywords: [],
    zero: true,
    percent: true,
    dimensioned: true,
    source: 'a space token or a percentage',
  },
  scale: { id: 'scale', noun: 'a scale factor', families: [], keywords: ['none'], unitless: () => true, source: 'a unitless factor' },
  angle: { id: 'angle', noun: 'a rotation', families: [], keywords: ['none'], zero: true, angle: true, source: 'an angle' },
  origin: {
    id: 'origin',
    noun: 'an origin or position',
    families: ['space'],
    keywords: ['top', 'bottom', 'left', 'right', 'center'],
    zero: true,
    percent: true,
    dimensioned: true,
    source: 'position keywords, percentages or a space token',
  },
  filter: { id: 'filter', noun: 'a filter', families: ['filter'], keywords: ['none'], source: 'a filter token' },
  keyword: { id: 'keyword', noun: 'an enumerated behavior', families: [], keywords: 'any', zero: true, strings: true, runtime: true, source: 'a property keyword' },
  content: { id: 'content', noun: 'generated content', families: [], keywords: 'any', strings: true, functions: { attr: 'keyword' }, source: 'a string or keyword' },
  count: { id: 'count', noun: 'a count or order', families: [], keywords: 'any', unitless: () => true, runtime: true, source: 'a unitless count' },
  flex: {
    id: 'flex',
    noun: 'a flex shorthand',
    families: ['space'],
    keywords: SIZE_KEYWORDS,
    zero: true,
    percent: true,
    unitless: () => true,
    source: 'unitless factors and a basis from a space token or a percentage',
  },
  'grid-template': {
    id: 'grid-template',
    noun: 'a grid track list',
    families: ['space', 'border'],
    keywords: 'any',
    zero: true,
    percent: true,
    fr: true,
    strings: true,
    unitless: () => true,
    dimensioned: true,
    functions: { repeat: 'grid-template', minmax: 'grid-template', 'fit-content': 'length' },
    source: 'fractional tracks, content keywords and space tokens',
  },
  'grid-placement': { id: 'grid-placement', noun: 'a grid placement', families: [], keywords: 'any', unitless: () => true, strings: true, runtime: true, source: 'grid lines and spans' },
  'aspect-ratio': { id: 'aspect-ratio', noun: 'an aspect ratio', families: [], keywords: ['auto'], unitless: () => true, runtime: true, source: 'a unitless ratio' },
  'scrollbar-width': { id: 'scrollbar-width', noun: 'a scrollbar width', families: ['scrollbar'], keywords: 'any', runtime: true, source: 'a scrollbar width keyword or a scrollbar constant' },
  'animation-name': { id: 'animation-name', noun: 'an animation name', families: [], keywords: ['none'], source: 'a stylex.keyframes binding in the same file' },
  image: { id: 'image', noun: 'an image', families: [], keywords: ['none'], functions: GRADIENTS, source: 'a gradient over semantic color tokens' },
  gradient: {
    id: 'gradient',
    noun: 'a gradient',
    families: ['color'],
    keywords: ['to', 'top', 'bottom', 'left', 'right', 'transparent', 'currentcolor', 'in', 'oklab', 'srgb'],
    zero: true,
    percent: true,
    angle: true,
    source: 'semantic color tokens and percentage stops',
  },
  clip: { id: 'clip', noun: 'a clip', families: [], keywords: ['none', 'auto'], zero: true, functions: { inset: 'translation', rect: 'translation' }, source: 'a percentage inset' },
  'custom-property': {
    id: 'custom-property',
    noun: 'a custom property value',
    families: ['color', 'space', 'text', 'font-family', 'font-weight', 'font-leading', 'font-tracking', 'radius', 'shadow', 'filter', 'motion', 'easing', 'border', 'z'],
    keywords: 'any',
    zero: true,
    percent: true,
    dimensioned: true,
    functions: TRANSFORMS,
    source: 'a token read or a primitive variable',
  },
};

const BOX = [
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'inlineSize',
  'blockSize',
  'minInlineSize',
  'minBlockSize',
  'maxInlineSize',
  'maxBlockSize',
  'flexBasis',
];
const SIDES = ['', 'Top', 'Right', 'Bottom', 'Left', 'Block', 'BlockStart', 'BlockEnd', 'Inline', 'InlineStart', 'InlineEnd'];
const INSETS = ['inset', 'insetBlock', 'insetBlockStart', 'insetBlockEnd', 'insetInline', 'insetInlineStart', 'insetInlineEnd', 'top', 'right', 'bottom', 'left'];
const CORNERS = ['', 'TopLeft', 'TopRight', 'BottomLeft', 'BottomRight', 'StartStart', 'StartEnd', 'EndStart', 'EndEnd'];

const KEYWORD_PROPERTIES = [
  'display',
  'position',
  'overflow',
  'overflowX',
  'overflowY',
  'overflowBlock',
  'overflowInline',
  'overflowWrap',
  'overflowAnchor',
  'overscrollBehavior',
  'overscrollBehaviorX',
  'overscrollBehaviorY',
  'overscrollBehaviorBlock',
  'overscrollBehaviorInline',
  'alignItems',
  'alignContent',
  'alignSelf',
  'justifyContent',
  'justifyItems',
  'justifySelf',
  'placeItems',
  'placeContent',
  'placeSelf',
  'flexDirection',
  'flexWrap',
  'flexFlow',
  'gridAutoFlow',
  'boxSizing',
  'appearance',
  'WebkitAppearance',
  'MozAppearance',
  'cursor',
  'userSelect',
  'WebkitUserSelect',
  'pointerEvents',
  'visibility',
  'whiteSpace',
  'whiteSpaceCollapse',
  'textWrap',
  'textWrapMode',
  'textWrapStyle',
  'wordBreak',
  'hyphens',
  'textAlign',
  'textAlignLast',
  'textTransform',
  'textOverflow',
  'textDecoration',
  'textDecorationLine',
  'textDecorationStyle',
  'textDecorationSkipInk',
  'textRendering',
  'textSizeAdjust',
  'WebkitTextSizeAdjust',
  'verticalAlign',
  'fontStyle',
  'fontVariantNumeric',
  'fontVariantLigatures',
  'fontVariantCaps',
  'fontFeatureSettings',
  'fontKerning',
  'fontSynthesis',
  'fontOpticalSizing',
  'WebkitFontSmoothing',
  'MozOsxFontSmoothing',
  'borderStyle',
  ...['Top', 'Right', 'Bottom', 'Left', 'Block', 'BlockStart', 'BlockEnd', 'Inline', 'InlineStart', 'InlineEnd'].map((side) => `border${side}Style`),
  'outlineStyle',
  'listStyle',
  'listStyleType',
  'listStylePosition',
  'tableLayout',
  'borderCollapse',
  'captionSide',
  'emptyCells',
  'objectFit',
  'isolation',
  'mixBlendMode',
  'backfaceVisibility',
  'contain',
  'containerType',
  'containerName',
  'contentVisibility',
  'touchAction',
  'scrollBehavior',
  'scrollSnapType',
  'scrollSnapAlign',
  'scrollSnapStop',
  'scrollbarGutter',
  'resize',
  'direction',
  'writingMode',
  'unicodeBidi',
  'float',
  'clear',
  'colorScheme',
  'forcedColorAdjust',
  'printColorAdjust',
  'willChange',
  'transitionProperty',
  'transitionBehavior',
  'animationFillMode',
  'animationDirection',
  'animationPlayState',
  'animationComposition',
  'animationTimeline',
  'interpolateSize',
  'fieldSizing',
  'backgroundRepeat',
  'backgroundAttachment',
  'backgroundClip',
  'backgroundOrigin',
  'backgroundBlendMode',
  'backgroundSize',
  'maskRepeat',
  'maskSize',
  'maskMode',
  'WebkitBoxOrient',
  'boxDecorationBreak',
  'breakInside',
  'pageBreakInside',
  'quotes',
  'counterReset',
  'counterIncrement',
  'strokeLinecap',
  'strokeLinejoin',
  'fillRule',
  'clipRule',
  'shapeRendering',
  'vectorEffect',
  'transformStyle',
  'transformBox',
  'imageRendering',
  'caretShape',
  'textEmphasisStyle',
  'rubyPosition',
  'textUnderlinePosition',
  'textDecorationThickness',
];

const PROPERTIES = new Map<string, CategoryId>();
const set = (category: CategoryId, ...names: string[]) => {
  for (const name of names) PROPERTIES.set(name, category);
};
set('keyword', ...KEYWORD_PROPERTIES);
set(
  'color',
  'color',
  'backgroundColor',
  'outlineColor',
  'caretColor',
  'accentColor',
  'textDecorationColor',
  'textEmphasisColor',
  'columnRuleColor',
  'scrollbarColor',
  'WebkitTapHighlightColor',
  'WebkitTextFillColor',
  'stopColor',
  'floodColor',
  'lightingColor',
  ...SIDES.map((side) => `border${side}Color`),
);
set('paint', 'fill', 'stroke');
set(
  'length',
  ...BOX,
  ...INSETS,
  ...SIDES.map((side) => `padding${side}`),
  ...SIDES.map((side) => `margin${side}`),
  ...SIDES.map((side) => `scrollMargin${side}`),
  ...SIDES.map((side) => `scrollPadding${side}`),
  'gap',
  'rowGap',
  'columnGap',
  'gridGap',
  'gridRowGap',
  'gridColumnGap',
  'textIndent',
  'borderSpacing',
  'textUnderlineOffset',
  'containIntrinsicSize',
);
set('radius', ...CORNERS.map((corner) => `border${corner}Radius`));
set('border-width', 'outlineWidth', 'columnRuleWidth', ...SIDES.map((side) => `border${side}Width`));
set('outline-offset', 'outlineOffset');
set('border', 'border', 'outline', 'columnRule', ...SIDES.slice(1).map((side) => `border${side}`));
set('shadow', 'boxShadow', 'textShadow');
set('font-size', 'fontSize');
set('font-weight', 'fontWeight');
set('line-height', 'lineHeight');
set('letter-spacing', 'letterSpacing', 'wordSpacing');
set('font-family', 'fontFamily');
set('duration', 'transitionDuration', 'animationDuration');
set('delay', 'transitionDelay', 'animationDelay');
set('easing', 'transitionTimingFunction', 'animationTimingFunction');
set('z-index', 'zIndex');
set('opacity', 'opacity', 'fillOpacity', 'strokeOpacity', 'stopOpacity', 'floodOpacity');
set('transform', 'transform');
set('translation', 'translate');
set('scale', 'scale');
set('angle', 'rotate');
set('origin', 'transformOrigin', 'perspectiveOrigin', 'backgroundPosition', 'backgroundPositionX', 'backgroundPositionY', 'objectPosition', 'maskPosition');
set('filter', 'filter', 'backdropFilter', 'WebkitBackdropFilter');
set('content', 'content');
set('count', 'flexGrow', 'flexShrink', 'order', 'animationIterationCount', 'WebkitLineClamp', 'lineClamp', 'columnCount', 'tabSize', 'orphans', 'widows');
set('flex', 'flex');
set('grid-template', 'gridTemplateColumns', 'gridTemplateRows', 'gridAutoColumns', 'gridAutoRows', 'gridTemplateAreas', 'gridTemplate');
set('grid-placement', 'gridColumn', 'gridRow', 'gridArea', 'gridColumnStart', 'gridColumnEnd', 'gridRowStart', 'gridRowEnd');
set('aspect-ratio', 'aspectRatio');
set('scrollbar-width', 'scrollbarWidth');
set('animation-name', 'animationName');
set('image', 'backgroundImage', 'maskImage', 'WebkitMaskImage', 'listStyleImage', 'borderImageSource');
set('clip', 'clipPath', 'clip');

/** The category a declared property takes, or undefined when its policy is unclassified. */
export function categoryOf(property: string): Category | undefined {
  if (property.startsWith('--')) return CATEGORIES['custom-property'];
  const id = PROPERTIES.get(property);
  return id ? CATEGORIES[id] : undefined;
}

/** Every classified property, for the documentation test. */
export function classifiedProperties(): ReadonlyMap<string, CategoryId> {
  return PROPERTIES;
}

// ---------------------------------------------------------------------------------------------
// Pieces and the CSS tokenizer
// ---------------------------------------------------------------------------------------------

/** One piece of an evaluated value. `at` is whatever the caller locates findings by. */
export type Piece<At> =
  | { kind: 'text'; text: string; at: At }
  | { kind: 'token'; family: Family | undefined; palette: boolean; known: boolean; label: string; alias?: string; at: At }
  | { kind: 'runtime'; label: string; at: At }
  | { kind: 'keyframes'; at: At }
  | { kind: 'null'; at: At };

type Lexeme<At> =
  | { t: 'number'; value: number; unit: string; raw: string; runtime: boolean; at: At }
  | { t: 'ident'; value: string; at: At }
  | { t: 'function'; name: string; at: At }
  | { t: 'close'; at: At }
  | { t: 'comma'; at: At }
  | { t: 'op'; value: string; at: At }
  | { t: 'string'; value: string; at: At }
  | { t: 'hash'; value: string; at: At }
  | { t: 'space'; at: At }
  | { t: 'token'; piece: Extract<Piece<At>, { kind: 'token' }>; at: At }
  | { t: 'runtime'; label: string; at: At }
  | { t: 'keyframes'; at: At }
  | { t: 'other'; value: string; at: At };

const NUMBER = /^[+-]?(\d*\.\d+|\d+\.?)(e[+-]?\d+)?/i;
const IDENT = /^-{0,2}[a-zA-Z_][\w-]*/;
const UNIT = /^(%|[a-zA-Z]+)/;

function lex<At>(text: string, atOf: (offset: number) => At, out: Lexeme<At>[], runtimeBefore: boolean): void {
  let rest = text;
  /** The piece the current position came from, so a finding points at its own source. */
  const here = () => atOf(text.length - rest.length);
  // A runtime number followed by its unit: `${x}%` is a percentage whose number is computed.
  if (runtimeBefore) {
    const unit = UNIT.exec(rest);
    const previous = out[out.length - 1];
    if (unit && previous?.t === 'runtime') {
      out[out.length - 1] = { t: 'number', value: Number.NaN, unit: unit[1]?.toLowerCase() ?? '', raw: `${previous.label}${unit[1]}`, runtime: true, at: previous.at };
      rest = rest.slice(unit[0].length);
    }
  }
  while (rest.length > 0) {
    const char = rest[0] as string;
    if (/\s/.test(char)) {
      const match = /^\s+/.exec(rest) as RegExpExecArray;
      out.push({ t: 'space', at: here() });
      rest = rest.slice(match[0].length);
      continue;
    }
    if (char === '"' || char === "'") {
      const close = rest.indexOf(char, 1);
      const end = close < 0 ? rest.length : close + 1;
      out.push({ t: 'string', value: rest.slice(1, end - 1), at: here() });
      rest = rest.slice(end);
      continue;
    }
    if (char === '#') {
      const match = /^#[\w-]*/.exec(rest) as RegExpExecArray;
      out.push({ t: 'hash', value: match[0], at: here() });
      rest = rest.slice(match[0].length);
      continue;
    }
    if (char === '(') {
      out.push({ t: 'function', name: '', at: here() });
      rest = rest.slice(1);
      continue;
    }
    if (char === ')') {
      out.push({ t: 'close', at: here() });
      rest = rest.slice(1);
      continue;
    }
    if (char === ',') {
      out.push({ t: 'comma', at: here() });
      rest = rest.slice(1);
      continue;
    }
    const signed = (char === '-' || char === '+') && /^[+-](\d|\.\d)/.test(rest);
    const previous = out[out.length - 1];
    const valueBefore = previous && ['number', 'ident', 'close', 'token', 'runtime', 'string'].includes(previous.t);
    if (/[\d.]/.test(char) || (signed && !valueBefore)) {
      const match = NUMBER.exec(rest);
      if (match) {
        const start = here();
        rest = rest.slice(match[0].length);
        const unit = UNIT.exec(rest);
        rest = unit ? rest.slice(unit[0].length) : rest;
        out.push({ t: 'number', value: Number(match[0]), unit: unit?.[1]?.toLowerCase() ?? '', raw: `${match[0]}${unit?.[1] ?? ''}`, runtime: false, at: start });
        continue;
      }
    }
    const ident = IDENT.exec(rest);
    if (ident) {
      const start = here();
      rest = rest.slice(ident[0].length);
      if (rest.startsWith('(')) {
        out.push({ t: 'function', name: ident[0].toLowerCase(), at: start });
        rest = rest.slice(1);
      } else out.push({ t: 'ident', value: ident[0], at: start });
      continue;
    }
    if ('*/+-'.includes(char)) {
      out.push({ t: 'op', value: char, at: here() });
      rest = rest.slice(1);
      continue;
    }
    out.push({ t: 'other', value: char, at: here() });
    rest = rest.slice(1);
  }
}

function lexPieces<At>(pieces: readonly Piece<At>[]): Lexeme<At>[] {
  const out: Lexeme<At>[] = [];
  let runtimeBefore = false;
  // Adjacent literal text from different expressions is one CSS token stream: `${width}%` with a
  // constant width is a percentage.
  const merged: (Piece<At> | { kind: 'text'; text: string; parts: { from: number; at: At }[] })[] = [];
  for (const piece of pieces) {
    const last = merged[merged.length - 1];
    if (piece.kind === 'text' && last?.kind === 'text' && 'parts' in last) {
      last.parts.push({ from: last.text.length, at: piece.at });
      last.text += piece.text;
    } else if (piece.kind === 'text') merged.push({ kind: 'text', text: piece.text, parts: [{ from: 0, at: piece.at }] });
    else merged.push(piece);
  }
  for (const piece of merged) {
    if (piece.kind === 'text' && 'parts' in piece) {
      const { parts } = piece;
      const atOf = (offset: number) => (parts.filter((part) => part.from <= offset).pop() ?? parts[0])?.at as At;
      lex(piece.text, atOf, out, runtimeBefore);
    } else if (piece.kind === 'token') out.push({ t: 'token', piece, at: piece.at });
    else if (piece.kind === 'runtime') out.push({ t: 'runtime', label: piece.label, at: piece.at });
    else if (piece.kind === 'keyframes') out.push({ t: 'keyframes', at: piece.at });
    runtimeBefore = piece.kind === 'runtime';
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Runtime variables
// ---------------------------------------------------------------------------------------------

/** A primitive-owned or component runtime variable: who writes it, which items may read it and where. */
export type RuntimeVariable = {
  name: string;
  owner: string;
  /** Registry items that may read it. */
  items: readonly string[];
  categories: readonly CategoryId[];
  authority: string;
};

export type Context = {
  /** The registry item the declaration belongs to, when it is a component or element file. */
  item?: string;
  /** The declaration block is the clip-hidden recipe, which carries its own 1px box. */
  clipHidden?: boolean;
  /** The declaration block styles a glyph: an inline SVG or a glyph-only slot. */
  glyph?: boolean;
  property: string;
  variables: readonly RuntimeVariable[];
  /** Reads a `--ult-*` custom property by name: the family it belongs to, or undefined when no token has that name. */
  tokenByName(name: string): Family | undefined;
};

export type Problem<At> = { at: At; message: string; repair: string; kind: 'value' | 'alias' | 'unresolved' };

const WIDE = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);
const MATH = new Set(['', 'calc', 'min', 'max', 'clamp']);
const COLOR_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix', 'light-dark']);
const VIEWPORT = new Set(['vw', 'vh', 'vi', 'vb', 'vmin', 'vmax', 'dvw', 'dvh', 'svw', 'svh', 'lvw', 'lvh', 'dvi', 'dvb', 'cqw', 'cqh', 'cqi', 'cqb']);
const ANGLE = new Set(['deg', 'turn', 'rad', 'grad']);
const TIME = new Set(['s', 'ms']);
const CLIP_HIDDEN: Record<string, readonly string[]> = {
  width: ['1px'],
  height: ['1px'],
  margin: ['-1px'],
};
const GLYPH: Record<string, readonly string[]> = {
  width: ['1em'],
  height: ['1em'],
  inlineSize: ['1em'],
  blockSize: ['1em'],
  flexBasis: ['1em'],
  minWidth: ['1em'],
  minHeight: ['1em'],
};

// CSS named colors, which are literal colors wherever they appear.
const NAMED_COLORS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue ' +
    'chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey ' +
    'darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray ' +
    'darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen ' +
    'fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen ' +
    'lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime ' +
    'limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue ' +
    'mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive ' +
    'olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue ' +
    'slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke ' +
    'yellow yellowgreen'
  ).split(' '),
);

/**
 * Check one alternative of a declaration's value against its category. Each problem names the piece
 * it sits in, so the caller reports it at that piece's source location.
 */
export function checkValue<At>(category: Category, pieces: readonly Piece<At>[], context: Context): Problem<At>[] {
  const problems: Problem<At>[] = [];
  const nulls = pieces.filter((piece) => piece.kind === 'null');
  if (nulls.length > 0 && pieces.length === nulls.length) return problems;

  for (const piece of pieces) {
    if (piece.kind === 'token' && piece.alias) {
      problems.push({
        at: piece.at,
        kind: 'alias',
        message: `${context.property} reads ${piece.label} through the local alias ${piece.alias}, which hides the token value`,
        repair: `Read ${piece.label} directly at the declaration; a local constant may combine token reads, never rename one.`,
      });
    }
  }

  const lexemes = lexPieces(pieces);
  const stack: { name: string; category: Category }[] = [];
  const current = () => stack[stack.length - 1]?.category ?? category;
  const inMath = () => stack.length > 0 && MATH.has((stack[stack.length - 1] as { name: string }).name);
  const where = context.property;
  const raw = (at: At, what: string) =>
    problems.push({
      at,
      kind: 'value',
      message: `${where} uses ${what} where it takes ${current().noun}`,
      repair: `Use ${current().source}; a new need becomes a new token.`,
    });

  for (let index = 0; index < lexemes.length; index += 1) {
    const lexeme = lexemes[index] as Lexeme<At>;
    const cat = current();
    switch (lexeme.t) {
      case 'space':
      case 'comma':
        break;
      case 'op':
        if (lexeme.value !== '/' && !inMath()) raw(lexeme.at, `the operator "${lexeme.value}" outside a calculation`);
        break;
      case 'close':
        stack.pop();
        break;
      case 'function': {
        const name = lexeme.name;
        if (MATH.has(name)) {
          stack.push({ name, category: cat });
          break;
        }
        if (name === 'var') {
          index = checkVariable(lexemes, index, cat, context, problems);
          break;
        }
        const inner = cat.functions?.[name];
        if (inner) {
          stack.push({ name, category: CATEGORIES[inner] });
          break;
        }
        if (COLOR_FUNCTIONS.has(name)) raw(lexeme.at, `the literal color function ${name}()`);
        else raw(lexeme.at, `the function ${name}()`);
        // Skip the whole call: its arguments belong to the rejected function.
        let depth = 1;
        while (depth > 0 && index + 1 < lexemes.length) {
          index += 1;
          const next = lexemes[index] as Lexeme<At>;
          if (next.t === 'function') depth += 1;
          else if (next.t === 'close') depth -= 1;
        }
        break;
      }
      case 'number':
        checkNumber(lexeme, cat, inMath(), context, raw);
        break;
      case 'ident': {
        const lower = lexeme.value.toLowerCase();
        if (WIDE.has(lower)) break;
        if (NAMED_COLORS.has(lower)) {
          raw(lexeme.at, `the literal color "${lexeme.value}"`);
          break;
        }
        if (cat.keywords === 'any' || cat.keywords.includes(lower)) break;
        raw(lexeme.at, `the keyword "${lexeme.value}"`);
        break;
      }
      case 'string':
        if (!cat.strings) raw(lexeme.at, `the string "${lexeme.value}"`);
        break;
      case 'hash':
        raw(lexeme.at, `the literal color ${lexeme.value}`);
        break;
      case 'token': {
        const { piece } = lexeme;
        if (piece.palette) {
          problems.push({
            at: piece.at,
            kind: 'value',
            message: `${where} reads the palette step ${piece.label}; components read only the semantic layer`,
            repair: 'Read the semantic token that resolves to that step, or add one.',
          });
        } else if (!piece.known) {
          problems.push({
            at: piece.at,
            kind: 'value',
            message: `${where} reads ${piece.label}, which no token group declares`,
            repair: 'Read a declared token; a new need becomes a new token in packages/tokens.',
          });
        } else if (!piece.family) {
          problems.push({
            at: piece.at,
            kind: 'value',
            message: `${where} reads ${piece.label} from a constant group with no declared role`,
            repair: 'Read a semantic token or a declared compile-time constant.',
          });
        } else if (!cat.families.includes(piece.family)) {
          problems.push({
            at: piece.at,
            kind: 'value',
            message: `${where} reads ${piece.label}, a ${piece.family} token, where it takes ${cat.noun}`,
            repair: `Use ${cat.source}.`,
          });
        }
        break;
      }
      case 'runtime':
        if (!cat.runtime) {
          problems.push({
            at: lexeme.at,
            kind: 'value',
            message: `${where} takes the runtime value ${lexeme.label}, and no runtime style contract names this property`,
            repair: 'Keep runtime values to the documented property and part, or read a token.',
          });
        }
        break;
      case 'keyframes':
        if (cat.id !== 'animation-name') raw(lexeme.at, 'a keyframes binding');
        break;
      case 'other':
        if (lexeme.value !== '[' && lexeme.value !== ']' && lexeme.value !== '!') raw(lexeme.at, `"${lexeme.value}"`);
        break;
    }
  }
  return problems;
}

function checkNumber<At>(
  lexeme: Extract<Lexeme<At>, { t: 'number' }>,
  cat: Category,
  math: boolean,
  context: Context,
  raw: (at: At, what: string) => void,
): void {
  const { unit, value } = lexeme;
  const zero = !lexeme.runtime && value === 0;
  if (unit === '') {
    if (math && cat.dimensioned) return;
    if (zero && cat.zero) return;
    if (!lexeme.runtime && cat.unitless?.(value)) return;
    if (lexeme.runtime && cat.unitless) return;
    raw(lexeme.at, `the number ${lexeme.raw}`);
    return;
  }
  if (TIME.has(unit)) {
    if (zero && cat.id === 'delay') return;
    raw(lexeme.at, zero ? `the zero duration ${lexeme.raw}, which only an explicit transition-cancellation contract permits` : `the duration ${lexeme.raw}`);
    return;
  }
  if (zero && cat.zero) return;
  if (unit === '%') {
    if (cat.percent) return;
    raw(lexeme.at, `the percentage ${lexeme.raw}`);
    return;
  }
  if (VIEWPORT.has(unit)) {
    if (cat.viewport) return;
    raw(lexeme.at, `the viewport length ${lexeme.raw}`);
    return;
  }
  if (unit === 'fr') {
    if (cat.fr) return;
    raw(lexeme.at, `the fraction ${lexeme.raw}`);
    return;
  }
  if (ANGLE.has(unit)) {
    if (cat.angle) return;
    raw(lexeme.at, `the angle ${lexeme.raw}`);
    return;
  }
  if (context.clipHidden && CLIP_HIDDEN[context.property]?.includes(lexeme.raw)) return;
  if (context.glyph && GLYPH[context.property]?.includes(lexeme.raw)) return;
  raw(lexeme.at, `the length ${lexeme.raw}`);
}

/** `var(--name[, fallback])`: a token by its CSS name, or a runtime variable its policy places. Returns the index of the closing paren. */
function checkVariable<At>(
  lexemes: readonly Lexeme<At>[],
  start: number,
  cat: Category,
  context: Context,
  problems: Problem<At>[],
): number {
  let index = start + 1;
  while (lexemes[index]?.t === 'space') index += 1;
  const name = lexemes[index];
  const at = (lexemes[start] as Lexeme<At>).at;
  if (!name || name.t !== 'ident' || !name.value.startsWith('--')) {
    problems.push({
      at,
      kind: 'unresolved',
      message: `${context.property} reads a variable whose name is computed`,
      repair: 'Write the variable name literally, or read the token through its imported group.',
    });
  } else if (name.value.startsWith('--ult-')) {
    const family = context.tokenByName(name.value);
    if (family === undefined) {
      problems.push({ at, kind: 'value', message: `${context.property} reads ${name.value}, which no token group declares`, repair: 'Read a declared token.' });
    } else if (!cat.families.includes(family)) {
      problems.push({ at, kind: 'value', message: `${context.property} reads ${name.value}, a ${family} token, where it takes ${cat.noun}`, repair: `Use ${cat.source}.` });
    }
  } else {
    const variable = context.variables.find((entry) => entry.name === name.value);
    if (!variable) {
      problems.push({
        at,
        kind: 'value',
        message: `${context.property} reads ${name.value}, a variable no primitive or component contract declares`,
        repair: 'Read a token, or declare the variable’s owner, items and properties in the runtime-variable policy with its authority.',
      });
    } else if (context.item === undefined || !variable.items.includes(context.item)) {
      problems.push({
        at,
        kind: 'value',
        message: `${context.property} reads ${name.value}, which ${variable.owner} writes for ${variable.items.join(', ')}, not ${context.item ?? 'this file'}`,
        repair: 'Read the variable only in the part its owning contract names, or extend the policy with that contract.',
      });
    } else if (!variable.categories.includes(cat.id)) {
      problems.push({
        at,
        kind: 'value',
        message: `${context.property} reads ${name.value}, which its contract places on ${variable.categories.join(', ')} values, not ${cat.noun}`,
        repair: 'Read the variable only on the property its owning contract names.',
      });
    }
  }
  // Walk to the matching close; a fallback after the comma is checked like the value itself.
  let depth = 1;
  let fallback = false;
  const inner: Lexeme<At>[] = [];
  while (depth > 0 && index + 1 < lexemes.length) {
    index += 1;
    const next = lexemes[index] as Lexeme<At>;
    if (next.t === 'function') depth += 1;
    else if (next.t === 'close') depth -= 1;
    if (depth === 0) break;
    if (depth === 1 && next.t === 'comma' && !fallback) {
      fallback = true;
      continue;
    }
    if (fallback) inner.push(next);
  }
  if (inner.length > 0) {
    const pieces = relex(inner);
    problems.push(...checkValue(cat, pieces, context).filter((problem) => problem.kind !== 'alias'));
  }
  return index;
}

/** Turn lexemes back into pieces, for checking a var() fallback with the same grammar. */
function relex<At>(lexemes: readonly Lexeme<At>[]): Piece<At>[] {
  return lexemes.flatMap((lexeme): Piece<At> | Piece<At>[] => {
    switch (lexeme.t) {
      case 'token':
        return lexeme.piece;
      case 'runtime':
        return { kind: 'runtime', label: lexeme.label, at: lexeme.at };
      case 'keyframes':
        return { kind: 'keyframes', at: lexeme.at };
      case 'number':
        return lexeme.runtime
          ? [
              { kind: 'runtime', label: lexeme.raw, at: lexeme.at },
              { kind: 'text', text: lexeme.unit, at: lexeme.at },
            ]
          : { kind: 'text', text: ` ${lexeme.raw} `, at: lexeme.at };
      case 'ident':
        return { kind: 'text', text: ` ${lexeme.value} `, at: lexeme.at };
      case 'function':
        return { kind: 'text', text: `${lexeme.name}(`, at: lexeme.at };
      case 'close':
        return { kind: 'text', text: ')', at: lexeme.at };
      case 'comma':
        return { kind: 'text', text: ',', at: lexeme.at };
      case 'op':
        return { kind: 'text', text: ` ${lexeme.value} `, at: lexeme.at };
      case 'string':
        return { kind: 'text', text: JSON.stringify(lexeme.value), at: lexeme.at };
      case 'hash':
        return { kind: 'text', text: lexeme.value, at: lexeme.at };
      case 'space':
        return { kind: 'text', text: ' ', at: lexeme.at };
      case 'other':
        return { kind: 'text', text: lexeme.value, at: lexeme.at };
    }
  });
}
