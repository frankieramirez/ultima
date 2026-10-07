precision mediump float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/** @mouse */
uniform vec2 u_mouse;

/**
 * @label Background
 * @color
 * @default #101011
 */
uniform vec3 u_bg;

/**
 * @label Dim dot
 * @color
 * @default #00464c
 */
uniform vec3 u_dim;

/**
 * @label Bright dot
 * @color
 * @default #79f0fc
 */
uniform vec3 u_bright;

/**
 * @label Cell size
 * @default 16
 * @range 6, 48
 */
uniform float u_cell;

/**
 * @label Dot size
 * @default 2
 * @range 1, 8
 */
uniform float u_dot;

/**
 * @label Drift speed
 * @default 0.05
 * @range 0, 0.5
 */
uniform float u_speed;

/**
 * @label Steps
 * @default 6
 * @range 2, 12
 */
uniform float u_steps;

/**
 * @label Focus x
 * @default 0.85
 * @range 0, 1
 */
uniform float u_focus_x;

/**
 * @label Focus y (from top)
 * @default 0.9
 * @range 0, 1
 */
uniform float u_focus_y;

/**
 * @label Focus reach
 * @default 0.75
 * @range 0.1, 2
 */
uniform float u_reach;

/**
 * @label Floor
 * @default 0.12
 * @range 0, 1
 */
uniform float u_floor;

/**
 * @label Cursor glow
 * @default 0.7
 * @range 0, 1
 */
uniform float u_glow;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 cell = floor(p / u_cell);
  vec2 local = p - cell * u_cell;
  float inDot = step(local.x, u_dot) * step(local.y, u_dot);

  vec2 c = cell * u_cell + 0.5 * u_dot;
  vec2 uv = vec2(c.x / u_resolution.x, 1.0 - c.y / u_resolution.y);
  float t = u_time * u_speed;

  float n = fbm(c / 240.0 + vec2(t, -0.6 * t));
  float wave = 0.5 + 0.5 * sin((uv.x * 2.4 - uv.y * 1.6) * 3.14159 - u_time * 0.3);
  float v = 0.8 * n + 0.2 * wave;

  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
  float d = length((uv - vec2(u_focus_x, u_focus_y)) * aspect);
  float mask = u_floor + (1.0 - u_floor) * (1.0 - smoothstep(0.0, u_reach, d));

  float spot = 1.0 - smoothstep(0.0, 200.0, distance(c, u_mouse));
  v = clamp(v * mask * 1.35 + spot * u_glow * 0.8, 0.0, 1.0);

  float q = clamp(floor(v * u_steps) / (u_steps - 1.0), 0.0, 1.0);
  vec3 col = mix(u_dim, u_bright, q * q);
  float a = inDot * (0.18 + 0.82 * q) * step(0.001, q + 0.2);

  gl_FragColor = vec4(mix(u_bg, col, a), 1.0);
}
