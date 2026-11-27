/* eslint-disable */
// Still Sunset Meadow — MeadowBlush

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import * as THREE from 'three';

type RGB = [number, number, number];

export interface Sky {
  top: string;
  horizon: string;
  glow: string;
}

export interface DayCycle {
  /** Run the day. Off holds the scene at Time. */
  cycle: boolean;
  /** Time of day in hours: 6 sunrise, 12 noon, 18 sunset, 0 midnight. */
  time: number;
  /** Seconds for one full 24 h day. */
  length: number;
}

export interface MeadowBlushProps {
  /** How many flowers grow in the field, 0-10. 0 leaves only grass. */
  flowers?: number;
  /** Sky colours at sunset (and sunrise); day and night skies are fixed. */
  sky?: Partial<Sky>;
  /** How thick the grass grows, 0-10. */
  grass?: number;
  /** Horizon height from the top of the frame, %. */
  horizon?: number;
  /** Which arrangement of grass and flowers. */
  seed?: number;
  /** Size of the grass voxels, 0-10. */
  voxelSize?: number;
  /** Depth-of-field blur feeling / glow on the foreground, 0-10. */
  depthBlur?: number;
  /** Warm haze toward the horizon, 0-10. */
  haze?: number;
  /** How strongly the grass parts, follows and springs back around the pointer, 0-10. 0 is off. */
  hover?: number;
  /** How far the gusts lean the grass, 0-10. */
  wind?: number;
  /** Playback rate of the wind, 0-10. 0 holds the grass still. */
  speed?: number;
  /** Which way the clouds drift. */
  cloudDirection?: 'left' | 'right';
  /** How fast the clouds drift, 0-10. 0 holds them. */
  cloudSpeed?: number;
  /** The day-and-night cycle. */
  day?: Partial<DayCycle>;
  style?: CSSProperties;
  className?: string;
}

const DEFAULT_SKY: Sky = {
  top: '#E2A8AE',
  horizon: '#F8A68E',
  glow: '#FFCB8C',
};
const DEFAULT_DAY: DayCycle = { cycle: false, time: 18, length: 90 };

const DEFAULTS = {
  cloudDirection: 'right' as const,
  cloudSpeed: 3,
  flowers: 3.7,
  grass: 5,
  horizon: 50,
  seed: 7,
  voxelSize: 10,
  depthBlur: 4.9,
  haze: 5,
  hover: 10,
  wind: 10,
  speed: 10,
};

const DEG = Math.PI / 180;
const CAM_H = 1;
const REF_H = 0.47;
const VOXEL = 0.036;
const CLOUD_D = 40;
const STRIDE = 14;

const K_GRASS = 0;
const K_FLOWER = 1;
const K_BLOCK = 2;
const K_CLOUD = 3;

function hex(s: string): RGB {
  const n = parseInt(s.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const C = {
  sun: hex('#FFF7E8'),
  grassDark: hex('#172604'),
  grassMid: hex('#4A700E'),
  grassLight: hex('#8AAA18'),
  grassTip: hex('#CACC34'),
  rim: hex('#F4D040'),
  groundDark: hex('#162404'),
  groundMid: hex('#34500E'),
  groundFar: hex('#647616'),
  dapple: hex('#B09A1C'),
  dirt: hex('#74491E'),
  dirtDark: hex('#4E3212'),
  turf: hex('#6A8216'),
  turf2: hex('#A4A026'),
  stem: hex('#4A8C24'),
  leaf: hex('#2C5A16'),
  hazeGold: hex('#E2A832'),
  hazeSun: hex('#F7944A'),
};

const DAY_SKY = {
  top: hex('#5E9BE6'),
  horizon: hex('#BCD9F2'),
  glow: hex('#FFF4DC'),
};
const NIGHT_SKY = {
  top: hex('#060A20'),
  horizon: hex('#1A2350'),
  glow: hex('#9DB0F0'),
};
const LIGHT_DAY: RGB = [1.1, 1.1, 1.08];
const LIGHT_NIGHT: RGB = [0.22, 0.27, 0.46];
const CLOUD_DAY: RGB = [1.04, 1.04, 1.04];
const CLOUD_NIGHT: RGB = [0.3, 0.34, 0.5];

const FLOWER_COLS = [
  '#E0402C',
  '#F08030',
  '#F08AB0',
  '#D04A9A',
  '#3C6AE0',
  '#7A4AD0',
  '#F6F0EA',
  '#F2C83A',
];

type FlowerRow = [number, number, number, number, string, string];

const HERO_FLOWERS: FlowerRow[] = [
  [0.118, 0.655, 0.04, 0.735, '#D8352A', '#F08030'],
  [0.03, 0.69, 0.036, 0.765, '#F07A30', '#F2C83A'],
  [0.3, 0.728, 0.05, 0.83, '#F6F0EE', '#F2C83A'],
  [0.847, 0.69, 0.022, 0.745, '#E0508A', '#F2C83A'],
  [0.905, 0.655, 0.038, 0.74, '#F0507A', '#F2C83A'],
  [0.935, 0.74, 0.046, 0.85, '#F6B83A', '#E09A2A'],
  [0.69, 0.79, 0.07, 0.975, '#FFF4EC', '#F4C24A'],
];
const FRONT_FLOWERS: FlowerRow[] = [
  [0.45, 1.0, 0.068, 1.16, '#E890B0', '#F2C83A'],
  [0.95, 0.965, 0.068, 1.16, '#F6C040', '#E09A2A'],
];
const MID_FLOWERS: FlowerRow[] = [
  [0.075, 0.603, 0.018, 0.64, '#D88AB8', '#F2C83A'],
  [0.45, 0.598, 0.021, 0.64, '#3A5AE0', '#F2C83A'],
  [0.67, 0.603, 0.018, 0.642, '#D83030', '#F2C83A'],
  [0.63, 0.632, 0.019, 0.672, '#F4F0EA', '#F2C83A'],
  [0.2, 0.62, 0.018, 0.66, '#F08030', '#F2C83A'],
  [0.88, 0.598, 0.016, 0.632, '#F2E6D2', '#F2C83A'],
  [0.94, 0.62, 0.016, 0.655, '#F2C83A', '#E86A2A'],
  [0.61, 0.567, 0.012, 0.592, '#E86A2A', '#F2C83A'],
  [0.4, 0.575, 0.013, 0.6, '#7A4AD0', '#F2C83A'],
];

interface CloudDef {
  ax: number;
  color: string;
  blocks: number[][];
}

const CLOUDS: CloudDef[] = [
  {
    ax: 1,
    color: '#F8D4B8',
    blocks: [
      [0.83, 0.024, 1.04, 0.127],
      [0.74, 0.078, 0.8, 0.098],
      [0.69, 0.098, 0.83, 0.127],
      [0.615, 0.122, 0.82, 0.18],
      [0.82, 0.122, 0.995, 0.17],
      [0.67, 0.17, 0.99, 0.21],
    ],
  },
  {
    ax: 0.3,
    color: '#F4B0BA',
    blocks: [
      [0.19, 0.255, 0.415, 0.288],
      [0.235, 0.243, 0.3, 0.256],
      [0.27, 0.232, 0.37, 0.256],
      [0.36, 0.246, 0.4, 0.256],
    ],
  },
  {
    ax: 0.83,
    color: '#FAF2F2',
    blocks: [
      [0.7, 0.318, 0.965, 0.352],
      [0.72, 0.308, 0.79, 0.319],
      [0.76, 0.296, 0.86, 0.319],
      [0.86, 0.302, 0.93, 0.319],
      [0.93, 0.311, 0.952, 0.319],
    ],
  },
];

const WIDE_CLOUDS: {
  min: number;
  def: number;
  ax: number;
  dy: number;
  scale: number;
}[] = [
  { min: 1, def: 2, ax: 0.5, dy: -0.13, scale: 0.8 },
  { min: 1.5, def: 1, ax: 0.66, dy: 0.05, scale: 0.9 },
  { min: 2.2, def: 2, ax: 0.18, dy: -0.18, scale: 0.7 },
];

const clamp = (v: number, a: number, b: number) =>
  Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));
const mix = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
const shade = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

function parseColor(input: unknown, fallback: RGB): RGB {
  if (typeof input !== 'string') return fallback;
  let s = input.trim();
  const v = /^var\(\s*--[^,]+,\s*(.+)\)$/.exec(s);
  if (v) s = v[1].trim();
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) {
      h = h
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const n = parseInt(h.slice(0, 6), 16);
    return h.length >= 6 && !isNaN(n)
      ? [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
      : fallback;
  }
  const m = /rgba?\(([^)]+)\)/i.exec(s);
  if (m) {
    const p = m[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(parseFloat);
    if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) {
      return [p[0] / 255, p[1] / 255, p[2] / 255];
    }
  }
  return fallback;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vfovFor(aspect: number) {
  const t = clamp((aspect - 0.6) / 1.4, 0, 1);
  return 50 - 14 * t * t * (3 - 2 * t);
}

interface BuildOpts {
  flowers: number;
  grass: number;
  horizon: number;
  seed: number;
  voxelSize: number;
}

interface Built {
  main: number[];
  soft: number[];
  clouds: number[];
  near: number[];
  tile: number;
  cloudHalf: number;
  cloudWrap: number;
}

function put(
  o: number[],
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
  c: RGB,
  tip: number,
  rx: number,
  rz: number,
  h: number,
  kind: number,
) {
  o.push(cx, cy, cz, sx, sy, sz, c[0], c[1], c[2], tip, rx, rz, h, kind);
}

function buildMeadow(W: number, H: number, o: BuildOpts): Built {
  const rnd = mulberry32(Math.round(clamp(o.seed, 0, 9999)) * 9973 + 17);
  const aspect = W / Math.max(1, H);
  const h = clamp(o.horizon, 30, 70) / 100;
  const f = 0.5 / Math.tan((vfovFor(aspect) * DEG) / 2);
  const vk = Math.pow(2, (clamp(o.voxelSize, 0, 10) - 5) / 5);
  const v = VOXEL * vk;
  const dens = clamp(o.grass, 0, 10) / 5;
  const fd = clamp(o.flowers, 0, 10) / 5;
  const wk = Math.pow(Math.max(1, aspect / 0.5), 0.8);

  const toY = (fy: number) =>
    fy <= REF_H ? (fy * h) / REF_H : h + ((fy - REF_H) * (1 - h)) / (1 - REF_H);
  const depthAt = (y: number) => (f * CAM_H) / Math.max(1e-4, y - h);
  const wx = (x: number, d: number) => ((x - aspect / 2) / f) * d;
  const halfW = (d: number) => (aspect / 2 / f) * d;
  const heightAt = (y: number, d: number) => CAM_H - ((y - h) / f) * d;
  const len = (s: number, d: number) => (s / f) * d;

  const dBottom = depthAt(1);
  const main: number[] = [];
  const soft: number[] = [];
  const near: number[] = [];
  const clouds: number[] = [];
  const pick = (d: number) =>
    d < dBottom * 0.94 ? near : d < dBottom * 1.3 ? soft : main;

  const blade = (
    out: number[],
    x: number,
    d: number,
    c: number,
    n: number,
    bright: boolean,
    y0 = 0,
  ) => {
    const tone = bright ? 0.3 + rnd() * 0.7 : rnd();
    const body = mix(C.grassMid, C.grassLight, 0.1 + tone * 0.6);
    const slant = (rnd() - 0.5) * 0.5;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 1;
      let col = mix(C.grassDark, body, Math.min(1, 0.3 + t * 1.1));
      if (i === n - 1) col = mix(col, C.grassTip, 0.55);
      else if (i === n - 2) col = mix(col, C.grassTip, 0.2);
      const r = rnd();
      if (r < 0.18) col = shade(col, 0.78);
      else if (r < 0.28) col = mix(col, C.grassTip, 0.35);
      put(
        out,
        x + Math.round(i * slant) * c * 0.8,
        y0 + (i + 0.5) * c,
        -d,
        c * 0.8,
        c,
        c * 0.35,
        col,
        t,
        x,
        -d,
        (i + 0.5) * c,
        K_GRASS,
      );
    }
  };

  const pathX = 0.07 * dBottom;
  const pathHalf = 0.17 * dBottom;
  const pathEnd = dBottom / 0.39;
  const ph1 = rnd() * 6.28;
  const ph2 = rnd() * 6.28;

  if (dens > 0) {
    const fPx = f * Math.min(H, 900);
    const sq = Math.sqrt(dens);
    let d = dBottom * 0.6;
    while (d < 48) {
      const c = v * Math.max(1, d / 14);
      const step = Math.max(0.8 * c * d, (2 * d * d) / Math.max(1, fPx)) / sq;
      const sx = (c * 1.5) / sq;
      const hw = halfW(d) + c * 4;
      const q = d / dBottom;
      for (let x = -hw + rnd() * sx; x < hw; x += sx * (0.6 + rnd() * 0.8)) {
        const bd = d + rnd() * step;
        const clump =
          0.5 +
          0.5 *
            Math.sin(x * 2.3 + bd * 0.9 + ph1) *
            Math.sin(x * 0.7 - bd * 1.7 + ph2);
        const tall =
          (0.22 + 0.1 / q) * (0.55 + 0.45 * rnd()) * (0.7 + 0.6 * clump);
        let n = Math.max(1, Math.round(tall / c));
        if (
          bd < pathEnd * (0.85 + rnd() * 0.3) &&
          Math.abs(x - pathX) < pathHalf + (rnd() - 0.5) * 0.12 * dBottom
        ) {
          if (rnd() > 0.08) continue;
          n = 1 + Math.floor(rnd() * 2);
        }
        blade(pick(bd), x, bd, c, n, false);
      }
      d += step;
    }

    const bokeh = (
      count: number,
      u0: number,
      u1: number,
      top0: number,
      top1: number,
    ) => {
      for (let i = 0; i < count; i++) {
        const d = dBottom * (0.5 + rnd() * 0.35);
        const u = u0 + (u1 - u0) * ((i + rnd() * 0.8) / Math.max(1, count));
        const c = len((0.05 + rnd() * 0.03) * 0.5 * vk, d);
        const top = heightAt(toY(top0 + rnd() * (top1 - top0)), d);
        blade(
          near,
          wx(u * aspect, d),
          d,
          c,
          Math.max(3, Math.round(top / c)),
          true,
        );
      }
    };
    bokeh(Math.round(11 * wk * sq), 0, 0.3, 0.72, 0.8);
    bokeh(Math.round(8 * wk * sq), 0.66, 1, 0.84, 0.9);
  }

  const flower = (
    x: number,
    d: number,
    stemH: number,
    s: number,
    petal: RGB,
    centre: RGB,
    leafy: boolean,
  ) => {
    const out = pick(d);
    const z = -d;
    const sw = s * 0.55;
    const n = Math.max(1, Math.round(stemH / sw));
    const step = stemH / n;
    const stem = mix(C.stem, C.grassDark, rnd() * 0.25);
    for (let i = 0; i < n; i++) {
      const y = (i + 0.5) * step;
      put(
        out,
        x,
        y,
        z,
        sw,
        step,
        sw,
        i % 2 ? shade(stem, 0.9) : stem,
        0,
        x,
        z,
        y,
        K_FLOWER,
      );
    }
    if (leafy && n > 2) {
      const a = Math.max(1, Math.floor(n * 0.3));
      const b = Math.max(a + 1, Math.floor(n * 0.55));
      put(
        out,
        x - sw * 1.05,
        (a + 0.5) * step,
        z,
        sw * 1.1,
        sw * 0.9,
        sw * 1.1,
        C.leaf,
        0,
        x,
        z,
        (a + 0.5) * step,
        K_FLOWER,
      );
      put(
        out,
        x + sw * 1.05,
        (b + 0.5) * step,
        z,
        sw * 1.1,
        sw * 0.9,
        sw * 1.1,
        C.leaf,
        0,
        x,
        z,
        (b + 0.5) * step,
        K_FLOWER,
      );
      for (let k = 0; k < 3; k++) {
        const lx = x + (k - 1) * sw * 1.15;
        const lz = z + (rnd() - 0.5) * sw * 1.4;
        const lh = sw * (0.9 + rnd() * 1.4);
        put(
          out,
          lx,
          lh / 2,
          lz,
          sw * 1.1,
          lh,
          sw * 1.1,
          shade(C.leaf, 0.75 + rnd() * 0.3),
          0,
          x,
          z,
          lh / 2,
          K_FLOWER,
        );
      }
    }
    const hc = stemH + s * 0.5;
    const pv = (): RGB => mix(petal, [1, 1, 1], (rnd() - 0.5) * 0.12);
    const r = s * 0.8;
    const up = r * 0.82;
    const fwd = r * 0.57;
    const petals = [
      [-r, 0, 0],
      [r, 0, 0],
      [0, up, -fwd],
      [0, -up, fwd],
    ];
    for (const [dx, dy, dz] of petals) {
      put(out, x + dx, hc + dy, z + dz, s, s, s, pv(), 0, x, z, hc, K_FLOWER);
    }
    put(
      out,
      x,
      hc + s * 0.05,
      z + s * 0.5,
      s * 0.75,
      s * 0.75,
      s * 0.75,
      centre,
      0,
      x,
      z,
      hc,
      K_FLOWER,
    );
  };

  const fromRow = (r: FlowerRow, sizeK: number, leafy: boolean) => {
    const d = depthAt(toY(r[3]));
    const s = len(r[2] * 0.5 * sizeK, d);
    const stemH = Math.max(s * 1.5, heightAt(toY(r[1]), d) - s * 0.5);
    flower(wx(r[0] * aspect, d), d, stemH, s, hex(r[4]), hex(r[5]), leafy);
  };

  if (fd > 0) {
    for (const r of HERO_FLOWERS) fromRow(r, vk, true);
    for (const r of FRONT_FLOWERS) fromRow(r, vk, true);
    for (const r of MID_FLOWERS) fromRow(r, vk * 1.35, rnd() < 0.5);
    for (let k = 1; k < Math.floor(aspect / 0.9); k++) {
      const r = HERO_FLOWERS[(k * 3) % HERO_FLOWERS.length];
      fromRow(
        [
          (k + 0.4 + rnd() * 0.3) / Math.floor(aspect / 0.9 + 1),
          r[1],
          r[2] * 0.8,
          r[3],
          r[4],
          r[5],
        ],
        vk,
        true,
      );
    }
    const pickCol = () => FLOWER_COLS[Math.floor(rnd() * FLOWER_COLS.length)];
    const extra = Math.round(16 * fd * wk);
    for (let i = 0; i < extra; i++) {
      const yc = 0.56 + rnd() * 0.12;
      const col = pickCol();
      const cen = col === '#F2C83A' ? '#E86A2A' : '#F2C83A';
      fromRow(
        [
          rnd(),
          yc,
          (0.011 + rnd() * 0.008) * (1 + (yc - 0.56) * 4),
          yc + 0.028 + rnd() * 0.02,
          col,
          cen,
        ],
        vk,
        rnd() < 0.4,
      );
    }
    const tiny = Math.round(70 * fd * wk);
    for (let i = 0; i < tiny; i++) {
      const d = depthAt(toY(0.502 + Math.pow(rnd(), 1.6) * 0.1));
      const c = v * Math.max(1, d / 14);
      const x = (rnd() * 2 - 1) * halfW(d);
      const sh = c * (2 + Math.floor(rnd() * 4));
      put(
        main,
        x,
        sh / 2,
        -d,
        c * 0.5,
        sh,
        c * 0.5,
        C.stem,
        0,
        x,
        -d,
        sh / 2,
        K_FLOWER,
      );
      put(
        main,
        x,
        sh + c,
        -d,
        c * 2.2,
        c * 1.8,
        c * 2.2,
        hex(pickCol()),
        0,
        x,
        -d,
        sh + c,
        K_FLOWER,
      );
    }
  }

  const terrace = (
    u0: number,
    u1: number,
    base: number,
    top: number,
    rows: number,
  ) => {
    const d = depthAt(toY(base));
    const tall = heightAt(toY(top), d);
    const B = tall / rows;
    const deep = B * 3;
    const x0 = u0 <= 0 ? -halfW(d) * 1.1 : wx(u0 * aspect, d);
    const x1 = u1 >= 1 ? halfW(d) * 1.1 : wx(u1 * aspect, d);
    for (let x = x0; x < x1; x += B) {
      put(
        main,
        x + B / 2,
        tall / 2,
        -d - deep / 2,
        B,
        tall,
        deep,
        C.dirt,
        8 / B,
        0,
        0,
        0,
        K_BLOCK,
      );
    }
    const c = B / 5;
    for (let x = x0; x < x1; x += c * (0.5 + rnd() * 0.7)) {
      blade(
        main,
        x,
        d + rnd() * c * 3,
        c,
        1 + Math.floor(rnd() * 5),
        true,
        tall,
      );
      if (fd > 0 && rnd() < 0.05) {
        const fx = x + c / 2;
        put(
          main,
          fx,
          tall + c * 2.2,
          -d - c,
          c * 1.8,
          c * 1.5,
          c * 1.8,
          hex(FLOWER_COLS[Math.floor(rnd() * FLOWER_COLS.length)]),
          0,
          fx,
          -d,
          c * 2.2,
          K_FLOWER,
        );
      }
    }
  };
  terrace(0.62, 1, 0.494, 0.438, 4);
  terrace(0.48, 1, 0.508, 0.471, 2);
  terrace(0, 0.23, 0.51, 0.476, 2);

  {
    const d = 170;
    const hw = halfW(d) * 1.1;
    const B = 2.4;
    for (let x = -hw; x < hw; x += B) {
      const u = (x + hw) / (2 * hw);
      const lift = Math.max(0, 1 - u * 1.8);
      let rows = 1 + (Math.sin(x * 0.09 + ph1) + rnd() * 0.8 > 0.6 ? 1 : 0);
      if (rnd() < 0.06 + lift * 0.2) rows += 1;
      const tall = rows * B;
      put(
        main,
        x + B / 2,
        tall / 2,
        -d - rnd() * 10,
        B,
        tall,
        B * 3,
        C.dirt,
        8 / B,
        0,
        0,
        0,
        K_BLOCK,
      );
    }
  }

  let cloudWide = 0;
  const cloud = (def: CloudDef, ax: number, dy: number, scale: number) => {
    const dc = CLOUD_D;
    const cx = ax * aspect;
    const rate = 0.85 + rnd() * 0.3;
    const col = hex(def.color);
    const rects = def.blocks.map((b) => [
      cx + (b[0] - def.ax) * 0.5 * scale,
      toY(b[1] + dy),
      cx + (b[2] - def.ax) * 0.5 * scale,
      toY(b[3] + dy),
    ]);
    const x0 = Math.min(...rects.map((r) => r[0]));
    const x1 = Math.max(...rects.map((r) => r[2]));
    const span = len(x1 - x0, dc);
    const mid = wx((x0 + x1) / 2, dc);
    cloudWide = Math.max(cloudWide, span);
    for (const r of rects) {
      const xa = wx(r[0], dc);
      const xb = wx(r[2], dc);
      const yt = heightAt(r[1], dc);
      const yb = heightAt(r[3], dc);
      const dz = span * (0.6 + rnd() * 0.5);
      put(
        clouds,
        (xa + xb) / 2,
        (yt + yb) / 2,
        -dc - dz / 2,
        xb - xa,
        yt - yb,
        dz,
        col,
        0,
        mid,
        rate,
        0,
        K_CLOUD,
      );
    }
  };
  for (const def of CLOUDS) cloud(def, def.ax, 0, 1);
  for (const w of WIDE_CLOUDS)
    if (aspect >= w.min) cloud(CLOUDS[w.def], w.ax, w.dy, w.scale);

  const cloudHalf = halfW(CLOUD_D);
  return {
    main,
    soft,
    clouds,
    near,
    tile: v * 1.6,
    cloudHalf,
    cloudWrap: cloudHalf + cloudWide * 0.6,
  };
}

const NOISE = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
`;

const LIGHT = /* glsl */ `
uniform vec3 uGlow;
uniform vec3 uLight;
uniform float uKeyDir;
uniform vec3 uHazeA;
uniform vec3 uHazeB;
uniform float uHazeK;
uniform vec2 uSunNdc;
uniform float uAspect;
float sunNear(vec2 ndc) { return exp(-length((ndc - uSunNdc) * vec2(uAspect, 1.0)) * 1.3); }
vec3 hazeOf(vec3 col, float depth, float sunP) {
    float fog = 1.0 - exp(-depth * uHazeK);
    return mix(col, mix(uHazeA, uHazeB, sunP), fog);
}
`;

const VOXEL_VERT = /* glsl */ `
attribute vec3 aCenter;
attribute vec3 aSize;
attribute vec4 aColor;
attribute vec4 aBend;
uniform float uTime;
uniform float uWind;
uniform float uAspect;
uniform sampler2D uPush;
uniform float uCloudShift;
uniform float uCloudWrap;
varying vec3 vColor;
varying vec3 vN;
varying vec3 vLocal;
varying vec3 vSize;
varying float vTip;
varying float vKind;
varying float vDepth;
varying vec3 vClip;
void main() {
    float kind = aBend.w;
    vec3 p = aCenter + position * aSize;
    if (kind < 1.5) {
        float h = aBend.z;
        vec2 r = aBend.xy;
        float s = sin(uTime * 0.7 - r.x * 0.32 - r.y * 0.04);
        float gust = s > 0.0 ? s * s * s : 0.0;
        float sway = sin(uTime * 2.1 + r.x * 3.7 + r.y * 2.9);
        float lean = uWind * (0.11 * gust + 0.022 * sway);
        vec4 rc = projectionMatrix * viewMatrix * vec4(r.x, h, r.y, 1.0);
        vec2 puv = rc.xy / max(rc.w, 1e-4) * 0.5 + 0.5;
        lean += texture2D(uPush, clamp(puv, 0.001, 0.999)).r;
        p.x += lean * h;
        p.y -= 0.5 * lean * lean * h;
    } else if (kind > 2.5) {
        float cx = aBend.x;
        float wrapSpan = max(uCloudWrap * 2.0, 1.0);
        float nx = mod(cx + uCloudShift * aBend.y + uCloudWrap, wrapSpan) - uCloudWrap;
        p.x += nx - cx;
    }
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = aColor.rgb;
    vTip = aColor.a;
    vKind = kind;
    vN = normal;
    vLocal = position;
    vSize = aSize;
    vDepth = -mv.z;
    vClip = gl_Position.xyw;
}
`;

const VOXEL_FRAG = /* glsl */ `
uniform vec3 uRim;
uniform float uRimK;
uniform vec3 uCloudLight;
uniform float uCloudWhite;
uniform vec3 uDirt;
uniform vec3 uDirt2;
uniform vec3 uTurf;
uniform vec3 uTurf2;
uniform float uSoftK;
varying vec3 vColor;
varying vec3 vN;
varying vec3 vLocal;
varying vec3 vSize;
varying float vTip;
varying float vKind;
varying float vDepth;
varying vec3 vClip;
${NOISE}
${LIGHT}
void main() {
    vec3 n = vN;
    vec3 col = vColor;
    float sunP = sunNear(vClip.xy / max(vClip.z, 1e-4));
    if (vKind > 2.5) {
        col = mix(col, vec3(1.0), uCloudWhite);
        vec3 top = mix(col, vec3(1.0), 0.45);
        vec3 under = col * mix(vec3(0.88, 0.66, 0.56), vec3(0.86, 0.88, 0.94), uCloudWhite);
        float lit = 0.5 + 0.5 * n.x * uKeyDir;
        if (n.y < -0.5) col = under;
        else if (abs(n.x) > 0.5) col = mix(mix(col, under, 0.5), mix(col, top, 0.4), lit);
        else col = mix(mix(col, under, 0.3), mix(col, top, 0.3), vLocal.y + 0.5);
        gl_FragColor = vec4(mix(col * uCloudLight, uHazeA, 0.08), 1.0);
        return;
    }
    if (vKind > 1.5) {
        vec3 lp = (vLocal + 0.5) * vSize * vTip;
        vec2 uv = abs(n.y) > 0.5 ? lp.xz : (abs(n.x) > 0.5 ? lp.zy : lp.xy);
        vec2 tx = floor(uv);
        float hs = h21(tx + n.xz * 31.0);
        float lip = 1.0 + floor(h21(vec2(tx.x, 7.0)) * 2.5);
        bool turf = n.y > 0.5 || (vSize.y * vTip - lp.y) < lip;
        col = turf ? mix(uTurf, uTurf2, hs) : mix(uDirt, uDirt2, hs);
    }
    float side = abs(n.x) > 0.5 ? 0.5 + 0.5 * n.x * uKeyDir : 0.0;
    float face = n.y > 0.5 ? 0.95 : (abs(n.x) > 0.5 ? mix(0.55, 0.88, side) : 0.68);
    col *= face;
    col = mix(col, col * uGlow * 1.3, max(n.y, 0.0) * 0.2 + side * 0.25);
    col *= uLight;
    if (vKind < 0.5) {
        col += uRim * uRimK * pow(vTip, 2.0) * (0.04 + 0.3 * sunP + 0.5 * smoothstep(5.0, 25.0, vDepth));
    }
    vec3 outCol = hazeOf(col, vDepth, sunP);
    if (uSoftK > 0.001) {
        outCol = mix(outCol, mix(outCol, uGlow, 0.25), uSoftK * 0.22);
    }
    gl_FragColor = vec4(outCol, 1.0);
}
`;

const GROUND_VERT = /* glsl */ `
varying vec3 vW;
varying float vDepth;
varying vec3 vClip;
void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    vec4 mv = viewMatrix * wp;
    gl_Position = projectionMatrix * mv;
    vDepth = -mv.z;
    vClip = gl_Position.xyw;
}
`;

const GROUND_FRAG = /* glsl */ `
uniform float uTile;
uniform vec3 uGDark;
uniform vec3 uGMid;
uniform vec3 uGFar;
uniform vec3 uDapple;
varying vec3 vW;
varying float vDepth;
varying vec3 vClip;
${NOISE}
${LIGHT}
void main() {
    float d = -vW.z;
    vec2 cell = floor(vW.xz / max(uTile, 0.001));
    float hs = h21(cell);
    float chk = mod(abs(cell.x + cell.y), 2.0);
    vec3 tile = mix(uGDark, uGMid, chk * 0.45 + hs * 0.55);
    float dap = smoothstep(0.5, 0.68, vn(cell * 0.16 + 11.0));
    tile = mix(tile, uDapple * (0.75 + 0.45 * hs), dap * 0.6);
    vec3 far = mix(uGMid, uGFar, smoothstep(3.0, 30.0, d));
    vec3 col = mix(far, tile, clamp(1.4 - d / 14.0, 0.0, 1.0));
    col = mix(col, col * uGlow * 1.3, 0.25) * uLight;
    float sunP = sunNear(vClip.xy / max(vClip.z, 1e-4));
    gl_FragColor = vec4(hazeOf(col, vDepth, sunP), 1.0);
}
`;

const SCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const SKY_FRAG = /* glsl */ `
uniform float uAspect;
uniform float uHy;
uniform vec3 uTop;
uniform vec3 uHor;
uniform vec3 uGlow;
uniform vec3 uSun;
uniform vec2 uSunPos;
uniform float uSunSize;
uniform float uSunK;
uniform vec2 uMoonPos;
uniform float uMoonK;
uniform float uGold;
uniform float uNight;
uniform float uTime;
uniform float uClock;
varying vec2 vUv;
${NOISE}
void main() {
    vec2 p = vec2(vUv.x * uAspect, 1.0 - vUv.y);
    float t = clamp(p.y / max(uHy, 0.05), 0.0, 1.0);
    vec3 peach = mix(mix(uTop, uHor, 0.5), uGlow, 0.12 * uGold);
    vec3 c = mix(uTop, peach, smoothstep(0.0, 0.42, t));
    c = mix(c, uHor, smoothstep(0.5, 0.95, t));
    c = mix(c, c * vec3(0.95, 0.97, 1.06), (1.0 - t) * vUv.x * 0.7 * uGold);

    if (uNight > 0.02 && p.y < uHy) {
        vec2 sp = floor(vUv * vec2(90.0 * uAspect, 90.0));
        float star = h21(sp);
        if (star > 0.992) {
            float tw = 0.65 + 0.35 * sin(uTime * 2.5 + star * 120.0);
            c += vec3(0.85, 0.9, 1.0) * uNight * tw * (1.0 - t * 0.6);
        }
    }

    if (uSunK > 0.01) {
        vec2 dq = abs(p - uSunPos);
        float sq = max(dq.x, dq.y);
        float disk = 1.0 - smoothstep(uSunSize * 0.85, uSunSize, sq);
        float halo = exp(-length((p - uSunPos) * vec2(1.0, 1.3)) / max(uSunSize * 3.8, 0.01));
        c += uGlow * halo * 0.32 * uSunK;
        c = mix(c, uSun, disk * uSunK);
    }

    if (uMoonK > 0.01) {
        vec2 mq = abs(p - uMoonPos);
        float msq = max(mq.x, mq.y);
        float mdisk = 1.0 - smoothstep(uSunSize * 0.72, uSunSize * 0.85, msq);
        float mhalo = exp(-length(p - uMoonPos) / max(uSunSize * 2.8, 0.01));
        c += vec3(0.75, 0.85, 1.0) * mhalo * 0.2 * uMoonK;
        c = mix(c, vec3(0.94, 0.96, 1.0), mdisk * uMoonK);
    }

    gl_FragColor = vec4(c, 1.0);
}
`;

const PUSH_VERT = SCREEN_VERT;
const PUSH_FRAG = /* glsl */ `
uniform sampler2D uPrev;
uniform vec2 uPointer;
uniform vec2 uVel;
uniform float uStrength;
uniform float uDt;
varying vec2 vUv;
void main() {
    float cur = texture2D(uPrev, vUv).r;
    float d = length(vUv - uPointer);
    float rad = 0.16;
    float falloff = smoothstep(rad, 0.0, d);
    float target = falloff * (uVel.x * 1.4 + sign(uVel.x + 0.0001) * 0.28) * uStrength;
    float spring = -cur * 9.0;
    float nextVal = cur + (spring + (target - cur) * 8.0) * min(uDt, 0.05);
    nextVal = clamp(nextVal * 0.965, -1.2, 1.2);
    gl_FragColor = vec4(nextVal, 0.0, 0.0, 1.0);
}
`;

function buildInstancedGeometry(
  data: number[],
): THREE.InstancedBufferGeometry | null {
  const count = Math.floor(data.length / STRIDE);
  if (count <= 0) return null;

  const base = new THREE.BoxGeometry(1, 1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.attributes.position = base.attributes.position;
  geo.attributes.normal = base.attributes.normal;
  geo.instanceCount = count;

  const centers = new Float32Array(count * 3);
  const sizes = new Float32Array(count * 3);
  const colors = new Float32Array(count * 4);
  const bends = new Float32Array(count * 4);

  for (let i = 0; i < count; i++) {
    const off = i * STRIDE;
    centers[i * 3] = data[off];
    centers[i * 3 + 1] = data[off + 1];
    centers[i * 3 + 2] = data[off + 2];

    sizes[i * 3] = data[off + 3];
    sizes[i * 3 + 1] = data[off + 4];
    sizes[i * 3 + 2] = data[off + 5];

    colors[i * 4] = data[off + 6];
    colors[i * 4 + 1] = data[off + 7];
    colors[i * 4 + 2] = data[off + 8];
    colors[i * 4 + 3] = data[off + 9];

    bends[i * 4] = data[off + 10];
    bends[i * 4 + 1] = data[off + 11];
    bends[i * 4 + 2] = data[off + 12];
    bends[i * 4 + 3] = data[off + 13];
  }

  geo.setAttribute('aCenter', new THREE.InstancedBufferAttribute(centers, 3));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 3));
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 4));
  geo.setAttribute('aBend', new THREE.InstancedBufferAttribute(bends, 4));
  return geo;
}

export default function MeadowBlush(props: MeadowBlushProps) {
  const { className, style } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<MeadowBlushProps>(props);
  propsRef.current = props;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.autoClear = false;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 300);
    camera.position.set(0, CAM_H, 0);
    camera.lookAt(0, CAM_H, -10);

    const quadGeo = new THREE.PlaneGeometry(2, 2);

    const rtOpts: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };
    let rtA = new THREE.WebGLRenderTarget(64, 64, rtOpts);
    let rtB = new THREE.WebGLRenderTarget(64, 64, rtOpts);

    const pushMat = new THREE.ShaderMaterial({
      vertexShader: PUSH_VERT,
      fragmentShader: PUSH_FRAG,
      uniforms: {
        uPrev: { value: rtA.texture },
        uPointer: { value: new THREE.Vector2(-10, -10) },
        uVel: { value: new THREE.Vector2(0, 0) },
        uStrength: { value: 1 },
        uDt: { value: 0.016 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const pushQuad = new THREE.Mesh(quadGeo, pushMat);

    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SCREEN_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uAspect: { value: 1 },
        uHy: { value: 0.5 },
        uTop: {
          value: new THREE.Color(
            ...(DEFAULT_SKY.top ? hex(DEFAULT_SKY.top) : [0.88, 0.65, 0.68]),
          ),
        },
        uHor: { value: new THREE.Color(...hex(DEFAULT_SKY.horizon)) },
        uGlow: { value: new THREE.Color(...hex(DEFAULT_SKY.glow)) },
        uSun: { value: new THREE.Color(...C.sun) },
        uSunPos: { value: new THREE.Vector2(0.2, 0.36) },
        uSunSize: { value: 0.042 },
        uSunK: { value: 1 },
        uMoonPos: { value: new THREE.Vector2(0.8, 0.2) },
        uMoonK: { value: 0 },
        uGold: { value: 1 },
        uNight: { value: 0 },
        uTime: { value: 0 },
        uClock: { value: 18 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const skyQuad = new THREE.Mesh(quadGeo, skyMat);

    const groundGeo = new THREE.PlaneGeometry(240, 240, 1, 1);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.ShaderMaterial({
      vertexShader: GROUND_VERT,
      fragmentShader: GROUND_FRAG,
      uniforms: {
        uTile: { value: 0.06 },
        uGDark: { value: new THREE.Color(...C.groundDark) },
        uGMid: { value: new THREE.Color(...C.groundMid) },
        uGFar: { value: new THREE.Color(...C.groundFar) },
        uDapple: { value: new THREE.Color(...C.dapple) },
        uGlow: { value: new THREE.Color(...hex(DEFAULT_SKY.glow)) },
        uLight: { value: new THREE.Color(1, 0.9, 0.85) },
        uKeyDir: { value: -1 },
        uHazeA: { value: new THREE.Color(...C.hazeGold) },
        uHazeB: { value: new THREE.Color(...C.hazeSun) },
        uHazeK: { value: 0.02 },
        uSunNdc: { value: new THREE.Vector2(-0.5, 0.2) },
        uAspect: { value: 1 },
      },
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.set(0, 0, -110);

    const makeVoxelMat = (softK: number) =>
      new THREE.ShaderMaterial({
        vertexShader: VOXEL_VERT,
        fragmentShader: VOXEL_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uWind: { value: 1 },
          uAspect: { value: 1 },
          uPush: { value: rtA.texture },
          uCloudShift: { value: 0 },
          uCloudWrap: { value: 20 },
          uRim: { value: new THREE.Color(...C.rim) },
          uRimK: { value: 1 },
          uCloudLight: { value: new THREE.Color(1, 0.92, 0.86) },
          uCloudWhite: { value: 0 },
          uDirt: { value: new THREE.Color(...C.dirt) },
          uDirt2: { value: new THREE.Color(...C.dirtDark) },
          uTurf: { value: new THREE.Color(...C.turf) },
          uTurf2: { value: new THREE.Color(...C.turf2) },
          uSoftK: { value: softK },
          uGlow: { value: new THREE.Color(...hex(DEFAULT_SKY.glow)) },
          uLight: { value: new THREE.Color(1, 0.9, 0.85) },
          uKeyDir: { value: -1 },
          uHazeA: { value: new THREE.Color(...C.hazeGold) },
          uHazeB: { value: new THREE.Color(...C.hazeSun) },
          uHazeK: { value: 0.02 },
          uSunNdc: { value: new THREE.Vector2(-0.5, 0.2) },
        },
      });

    const matMain = makeVoxelMat(0);
    const matSoft = makeVoxelMat(0.5);
    const matCloud = makeVoxelMat(0);
    const matNear = makeVoxelMat(1);
    const voxelMats = [matMain, matSoft, matCloud, matNear];

    let meshMain: THREE.Mesh | null = null;
    let meshSoft: THREE.Mesh | null = null;
    let meshCloud: THREE.Mesh | null = null;
    let meshNear: THREE.Mesh | null = null;
    let lastBuildKey = '';
    let cloudWrap = 25;

    const rebuildIfNeeded = (w: number, h: number) => {
      const p = propsRef.current;
      const flowers = p.flowers ?? DEFAULTS.flowers;
      const grass = p.grass ?? DEFAULTS.grass;
      const horizon = p.horizon ?? DEFAULTS.horizon;
      const seed = p.seed ?? DEFAULTS.seed;
      const voxelSize = p.voxelSize ?? DEFAULTS.voxelSize;
      const key = `${w}x${h}|${flowers}|${grass}|${horizon}|${seed}|${voxelSize}`;
      if (key === lastBuildKey) return;
      lastBuildKey = key;

      const built = buildMeadow(w, h, {
        flowers,
        grass,
        horizon,
        seed,
        voxelSize,
      });
      cloudWrap = built.cloudWrap;
      groundMat.uniforms.uTile.value = built.tile;

      const swapMesh = (
        prev: THREE.Mesh | null,
        data: number[],
        mat: THREE.ShaderMaterial,
      ): THREE.Mesh | null => {
        if (prev) {
          scene.remove(prev);
          (prev.geometry as THREE.BufferGeometry).dispose();
        }
        const geo = buildInstancedGeometry(data);
        if (!geo) return null;
        const m = new THREE.Mesh(geo, mat);
        m.frustumCulled = false;
        scene.add(m);
        return m;
      };

      meshMain = swapMesh(meshMain, built.main, matMain);
      meshSoft = swapMesh(meshSoft, built.soft, matSoft);
      meshCloud = swapMesh(meshCloud, built.clouds, matCloud);
      meshNear = swapMesh(meshNear, built.near, matNear);
    };

    const pointer = {
      x: -10,
      y: -10,
      px: -10,
      py: -10,
      vx: 0,
      vy: 0,
      down: false,
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = 1 - (e.clientY - rect.top) / rect.height;
      if (pointer.x >= 0) {
        pointer.vx = (nx - pointer.x) * 18;
        pointer.vy = (ny - pointer.y) * 18;
      }
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.x = nx;
      pointer.y = ny;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointer.down = true;
      onPointerMove(e);
    };

    const onPointerUp = () => {
      pointer.down = false;
    };

    const onPointerLeave = () => {
      pointer.down = false;
      pointer.x = -10;
      pointer.y = -10;
      pointer.vx = 0;
      pointer.vy = 0;
    };

    const dom = renderer.domElement;
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointerleave', onPointerLeave);

    let width = 1;
    let height = 1;
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width || window.innerWidth));
      height = Math.max(1, Math.floor(rect.height || window.innerHeight));
      const aspect = width / height;
      camera.fov = vfovFor(aspect);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      rebuildIfNeeded(width, height);
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    let rafId = 0;
    let prevTime = performance.now();
    let simTime = 0;
    let cloudShift = 0;

    const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const pushScene = new THREE.Scene();
    pushScene.add(pushQuad);
    const skyScene = new THREE.Scene();
    skyScene.add(skyQuad);
    scene.add(groundMesh);

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      const dt = Math.min(0.05, Math.max(0.001, (now - prevTime) / 1000));
      prevTime = now;

      const p = propsRef.current;
      const speedK = clamp(p.speed ?? DEFAULTS.speed, 0, 10) / 10;
      const windK = clamp(p.wind ?? DEFAULTS.wind, 0, 10) / 10;
      const hoverK = clamp(p.hover ?? DEFAULTS.hover, 0, 10) / 10;
      const hazeK = clamp(p.haze ?? DEFAULTS.haze, 0, 10) / 10;
      const blurK = clamp(p.depthBlur ?? DEFAULTS.depthBlur, 0, 10) / 10;
      const cSpeedK = clamp(p.cloudSpeed ?? DEFAULTS.cloudSpeed, 0, 10) / 10;
      const cDir =
        (p.cloudDirection ?? DEFAULTS.cloudDirection) === 'left' ? -1 : 1;
      const hy = clamp(p.horizon ?? DEFAULTS.horizon, 30, 70) / 100;
      const aspect = width / height;

      simTime += dt * speedK * 2.2;
      cloudShift += dt * cSpeedK * cDir * 1.4;

      const dayCfg = { ...DEFAULT_DAY, ...(p.day ?? {}) };
      const clock = dayCfg.cycle
        ? (dayCfg.time + (now / 1000) * (24 / Math.max(5, dayCfg.length))) % 24
        : dayCfg.time;

      // Day phase: 0 at noon (12), 1 at sunset/sunrise (18/6), 2 at midnight (0)
      const phase = Math.abs(((clock - 12 + 24) % 24) - 12) / 6;
      const dayToSunset = clamp(phase, 0, 1);
      const sunsetToNight = clamp(phase - 1, 0, 1);

      const skyTopUser = parseColor(p.sky?.top, hex(DEFAULT_SKY.top));
      const skyHorUser = parseColor(p.sky?.horizon, hex(DEFAULT_SKY.horizon));
      const skyGlowUser = parseColor(p.sky?.glow, hex(DEFAULT_SKY.glow));

      const sunsetTop = mix(hex(DEFAULT_SKY.top), skyTopUser, 0.85);
      const sunsetHor = mix(hex(DEFAULT_SKY.horizon), skyHorUser, 0.85);
      const sunsetGlow = mix(hex(DEFAULT_SKY.glow), skyGlowUser, 0.85);

      const topCol =
        phase <= 1
          ? mix(DAY_SKY.top, sunsetTop, dayToSunset)
          : mix(sunsetTop, NIGHT_SKY.top, sunsetToNight);
      const horCol =
        phase <= 1
          ? mix(DAY_SKY.horizon, sunsetHor, dayToSunset)
          : mix(sunsetHor, NIGHT_SKY.horizon, sunsetToNight);
      const glowCol =
        phase <= 1
          ? mix(DAY_SKY.glow, sunsetGlow, dayToSunset)
          : mix(sunsetGlow, NIGHT_SKY.glow, sunsetToNight);

      const lightCol =
        phase <= 1
          ? mix(LIGHT_DAY, [1.02, 0.88, 0.8], dayToSunset)
          : mix([1.02, 0.88, 0.8], LIGHT_NIGHT, sunsetToNight);
      const cloudTint =
        phase <= 1
          ? mix(CLOUD_DAY, [1.0, 0.92, 0.88], dayToSunset)
          : mix([1.0, 0.92, 0.88], CLOUD_NIGHT, sunsetToNight);

      // Sun sets on left (-x in world) at sunset (18)
      const sunArc = ((clock - 6 + 24) % 24) / 12;
      const sunX = aspect * (0.85 - sunArc * 0.7);
      const sunY =
        hy * (0.14 + Math.sin(clamp(sunArc, 0, 1.3) * Math.PI) * 0.58);
      const sunVisible = clock >= 5.2 && clock <= 19.2 ? 1 : 0;
      const moonVisible = 1 - sunVisible;

      // Update pointer spring grid
      pushMat.uniforms.uPrev.value = rtA.texture;
      pushMat.uniforms.uPointer.value.set(pointer.x, pointer.y);
      pushMat.uniforms.uVel.value.set(pointer.vx, pointer.vy);
      pushMat.uniforms.uStrength.value = hoverK * (pointer.down ? 1.85 : 1.0);
      pushMat.uniforms.uDt.value = dt;
      pointer.vx *= 0.82;
      pointer.vy *= 0.82;

      renderer.setRenderTarget(rtB);
      renderer.clear();
      renderer.render(pushScene, orthoCam);
      renderer.setRenderTarget(null);

      const tmp = rtA;
      rtA = rtB;
      rtB = tmp;

      skyMat.uniforms.uAspect.value = aspect;
      skyMat.uniforms.uHy.value = hy;
      skyMat.uniforms.uTop.value.setRGB(...topCol);
      skyMat.uniforms.uHor.value.setRGB(...horCol);
      skyMat.uniforms.uGlow.value.setRGB(...glowCol);
      skyMat.uniforms.uSunPos.value.set(sunX, sunY);
      skyMat.uniforms.uSunK.value = sunVisible;
      skyMat.uniforms.uMoonPos.value.set(aspect * 0.78, hy * 0.24);
      skyMat.uniforms.uMoonK.value = moonVisible;
      skyMat.uniforms.uGold.value = 1 - sunsetToNight;
      skyMat.uniforms.uNight.value = sunsetToNight;
      skyMat.uniforms.uTime.value = simTime;
      skyMat.uniforms.uClock.value = clock;

      const sunNdcX = (sunX / aspect) * 2 - 1;
      const sunNdcY = 1 - (sunY / hy) * 2;

      groundMat.uniforms.uGlow.value.setRGB(...glowCol);
      groundMat.uniforms.uLight.value.setRGB(...lightCol);
      groundMat.uniforms.uHazeA.value.setRGB(...C.hazeGold);
      groundMat.uniforms.uHazeB.value.setRGB(...C.hazeSun);
      groundMat.uniforms.uHazeK.value = 0.006 + hazeK * 0.028;
      groundMat.uniforms.uSunNdc.value.set(sunNdcX, sunNdcY);
      groundMat.uniforms.uAspect.value = aspect;

      for (const m of voxelMats) {
        m.uniforms.uTime.value = simTime;
        m.uniforms.uWind.value = windK;
        m.uniforms.uAspect.value = aspect;
        m.uniforms.uPush.value = rtA.texture;
        m.uniforms.uCloudShift.value = cloudShift;
        m.uniforms.uCloudWrap.value = cloudWrap;
        m.uniforms.uGlow.value.setRGB(...glowCol);
        m.uniforms.uLight.value.setRGB(...lightCol);
        m.uniforms.uCloudLight.value.setRGB(...cloudTint);
        m.uniforms.uCloudWhite.value = 1 - dayToSunset;
        m.uniforms.uHazeA.value.setRGB(...C.hazeGold);
        m.uniforms.uHazeB.value.setRGB(...C.hazeSun);
        m.uniforms.uHazeK.value = 0.006 + hazeK * 0.028;
        m.uniforms.uSunNdc.value.set(sunNdcX, sunNdcY);
      }
      matSoft.uniforms.uSoftK.value = 0.2 + blurK * 0.5;
      matNear.uniforms.uSoftK.value = 0.45 + blurK * 0.85;

      renderer.clear();
      renderer.render(skyScene, orthoCam);
      if (meshCloud) renderer.render(meshCloud, camera);
      renderer.render(groundMesh, camera);
      if (meshMain) renderer.render(meshMain, camera);
      if (meshSoft) renderer.render(meshSoft, camera);
      if (meshNear) renderer.render(meshNear, camera);
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointerleave', onPointerLeave);
      [meshMain, meshSoft, meshCloud, meshNear].forEach((m) => {
        if (m) (m.geometry as THREE.BufferGeometry).dispose();
      });
      quadGeo.dispose();
      groundGeo.dispose();
      skyMat.dispose();
      groundMat.dispose();
      pushMat.dispose();
      voxelMats.forEach((m) => m.dispose());
      rtA.dispose();
      rtB.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '360px',
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}
