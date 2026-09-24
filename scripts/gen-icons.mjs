/* Generates the PWA icons as PNG files with zero dependencies.
   Icon design: WhatsApp-green rounded square, white speech bubble + tail,
   green phone-handset glyph. Uses signed-distance rasterization. */
import * as zlib from "node:zlib";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT = path.join(process.cwd(), "public", "icons");
fs.mkdirSync(OUT, { recursive: true });

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function distSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)),
  );
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function inTriangle(px, py, a, b, c) {
  const sign = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const d1 = sign([px, py], a, b);
  const d2 = sign([px, py], b, c);
  const d3 = sign([px, py], c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

const smooth = (d, edge) => Math.max(0, Math.min(1, 0.5 - d / edge));

function lighten(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * (1 - f)));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * (1 - f)));
  const b = Math.min(255, Math.round((n & 255) + (255 - (n & 255)) * (1 - f)));
  return [r, g, b];
}

function renderIcon(size, { maskable }) {
  const px = Buffer.alloc(size * size * 4);
  const top = lighten("#128c7e", 0.1);
  const bottom = [7, 94, 84];
  const bubbleC = [size * 0.60, size * 0.46];
  const bubbleR = size * 0.245;
  const tail = [
    [size * 0.50, size * 0.62],
    [size * 0.585, size * 0.72],
    [size * 0.44, size * 0.70],
  ];
  const hw = size * 0.47;
  const hh = size * 0.47;
  const inRad = maskable ? size * 0.5 : size * 0.30;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const X = x + 0.5;
      const Y = y + 0.5;
      const i = (y * size + x) * 4;

      let a = 1;
      if (!maskable) {
        const d = sdRoundRect(X, Y, size / 2, size / 2, hw, hh, inRad);
        a = smooth(d, 1.4);
        if (a <= 0) continue;
      }

      const t = Y / size;
      let r = top[0] + (bottom[0] - top[0]) * t;
      let g = top[1] + (bottom[1] - top[1]) * t;
      let b = top[2] + (bottom[2] - top[2]) * t;

      const dc = Math.hypot(X - bubbleC[0], Y - bubbleC[1]);
      const inBubble = dc < bubbleR;
      const inBubbleEdge = smooth(dc - bubbleR, 1.4);
      const inTail = inTriangle(X, Y, tail[0], tail[1], tail[2]);

      if (inBubble || inTail) {
        r = g = b = 255;
      }

      // phone handset glyph: a rotated capsule so it reads as a "call" mark
      let inGlyph = false;
      if (inBubble) {
        const cxp = bubbleC[0] - size * 0.045;
        const cyp = bubbleC[1] - size * 0.02;
        const d1 = distSeg(X, Y, cxp - size * 0.075, cyp + size * 0.085, cxp + size * 0.07, cyp - size * 0.075);
        const d2 = distSeg(X, Y, cxp - size * 0.05, cyp + size * 0.105, cxp + size * 0.095, cyp - size * 0.05);
        inGlyph = d1 < size * 0.032 || d2 < size * 0.028;
        const gp = Math.max(Math.min(d1 - size * 0.032, d2 - size * 0.028), 0);
        if (inGlyph) {
          r = bottom[0];
          g = bottom[1];
          b = bottom[2];
          void gp;
        }
      }

      px[i] = Math.round(Math.min(255, r * a));
      px[i + 1] = Math.round(Math.min(255, g * a));
      px[i + 2] = Math.round(Math.min(255, b * a));
      px[i + 3] = Math.round(255 * a);
      // soft bubble edge: keep rounded corners crisp by fading glyph near edge
      if (inBubble && !inGlyph && !inTail && inBubbleEdge < 1) {
        px[i + 3] = Math.round(px[i + 3] * Math.max(inBubbleEdge, 0.15));
      }
    }
  }
  return px;
}

/* ---------------- minimal PNG encoder ---------------- */
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (~c) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [name, size, maskable] of [["icon-192", 192, false], ["icon-512", 512, false], ["icon-maskable-512", 512, true]]) {
  const png = encodePng(size, renderIcon(size, { maskable }));
  fs.writeFileSync(path.join(OUT, name + ".png"), png);
  console.log("wrote", name + ".png", png.length, "bytes");
}