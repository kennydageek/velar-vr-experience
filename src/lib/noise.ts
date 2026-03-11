/**
 * 2D gradient noise (simplex-like) for procedural terrain.
 * Deterministic, no external deps, suitable for vertex displacement.
 */

const perm = new Uint8Array(512);
const grad = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function seed(seed: number) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}

// Default seed for consistent terrain
seed(12345);

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function dot2(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

export function noise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const u = x - Math.floor(x);
  const v = y - Math.floor(y);
  const uu = fade(u);
  const vv = fade(v);

  const aa = perm[perm[X] + Y];
  const ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X + 1] + Y];
  const bb = perm[perm[X + 1] + Y + 1];

  const g0 = grad[aa % grad.length];
  const g1 = grad[ab % grad.length];
  const g2 = grad[ba % grad.length];
  const g3 = grad[bb % grad.length];

  return lerp(
    lerp(dot2(g0, u, v), dot2(g2, u - 1, v), uu),
    lerp(dot2(g1, u, v - 1), dot2(g3, u - 1, v - 1), uu),
    vv
  );
}

/** Fractal Brownian Motion: layered noise for natural terrain. */
export function fbm(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return value / maxValue;
}
