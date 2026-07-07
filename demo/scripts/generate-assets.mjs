// Generates the demo's static placeholder images into public/img/.
//
// Scans the demo source for every relative image reference — both literal
// `img/<name>.png` paths and `ICON('<name>')` calls (which the server maps to
// `img/<name>.png`) — and writes one solid-colour PNG per name. Colour is
// derived from the name, so distinct tiles get distinct colours. Dependency-
// free (Node zlib only). Run: `node scripts/generate-assets.mjs`.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import zlib from 'zlib';

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, '..', 'src');
const outDir = join(here, '..', 'public', 'img');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

// Collect referenced asset names + the aspect ratio each context expects:
//   - ICON('x') → icon tiles (IconGrid/ActionList) are SQUARE (1:1)
//   - img/x.png in a route → photo/poster (Card/Carousel/Media) is LANDSCAPE
// Square wins if a name is referenced both ways.
// Files whose images render in SQUARE boxes (ActionList thumbnails, map
// markers). Everything else (Card/Carousel/ActionGrid/Media) is landscape.
const SQUARE_FILES = new Set(['actions.ts', 'maps.ts']);

function collectNames() {
  const kind = new Map(); // name -> 'square' | 'wide'
  for (const file of walk(srcDir)) {
    const txt = readFileSync(file, 'utf8');
    const base = file.split('/').pop();
    const fileKind = SQUARE_FILES.has(base) ? 'square' : 'wide';
    for (const m of txt.matchAll(/img\/([A-Za-z0-9_-]+)\.png/g)) {
      if (!kind.has(m[1])) kind.set(m[1], fileKind);
    }
    for (const m of txt.matchAll(/ICON\(\s*['"]([^'"]+)['"]/g)) {
      kind.set(m[1], 'square'); // icon context always wins
    }
  }
  return kind;
}

function hash(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Two related colours from a seed (HSL → RGB) for a pleasant diagonal gradient.
function gradientColors(seed) {
  const h = hash(seed);
  const hue = h % 360;
  const c1 = hslToRgb(hue, 0.62, 0.55);
  const c2 = hslToRgb((hue + 40) % 360, 0.62, 0.42);
  return [c1, c2];
}

function hslToRgb(h, s, l) {
  h /= 360;
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

// Diagonal two-colour gradient PNG (RGBA), w×h.
function gradientPng(w, h, c1, c2) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc(h * (1 + w * 4));
  let p = 0;
  const denom = (w - 1) + (h - 1) || 1;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const t = (x + y) / denom;
      raw[p++] = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      raw[p++] = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      raw[p++] = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      raw[p++] = 255;
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(outDir, { recursive: true });
const kinds = collectNames();
for (const [name, kind] of kinds) {
  // Match the ratio the mobile app renders into:
  //   square  → IconGrid / ActionList tiles (1:1)
  //   wide    → Card hero / Carousel slide / Media poster (16:9)
  const [w, h] = kind === 'square' ? [256, 256] : [512, 288];
  const [c1, c2] = gradientColors(name);
  writeFileSync(join(outDir, `${name}.png`), gradientPng(w, h, c1, c2));
}
console.log(`[generate-assets] wrote ${kinds.size} PNG(s) to public/img/ ` +
  `(${[...kinds.values()].filter(k => k === 'square').length} square, ` +
  `${[...kinds.values()].filter(k => k === 'wide').length} wide)`);
