import { cropDialog, cropToFile, removeBgDialog, autoBgCanvas, maskCanvas, MASKS } from './imgtools.js';
// Skin Studio v4 — drag & drop design editor (কোনো বাইরের লাইব্রেরি ছাড়া)
// Layer এর মান সব অনুপাতে (0..1) রাখা হয়, তাই preview ও full-quality export একই জায়গায় মেলে।

export const KINDS = [
  ['banner', '🏷', 'Banner'],
  ['shape', '◆', 'Shape pack'],
  ['name', '✍', 'Name design'],
  ['accessory', '🚌', 'Front accessories'],
  ['sticker', '⭐', 'Sticker'],
  ['pattern', '🎨', 'Pattern / Texture'],
  ['logo', '🔰', 'Logo'],
];
const SHORT = { banner: 'Banner', shape: 'Pack', name: 'Name', accessory: 'Parts', sticker: 'Sticker', pattern: 'Pattern', logo: 'Logo', fav: 'Fav', vshape: 'Shapes', text: 'Text', img: 'Image', ref: 'Ref', zones: 'Zones', layers: 'Layers' };
export const filt = (l) => ((l.hue || 0) || (l.sat ?? 1) !== 1 || (l.bri ?? 1) !== 1 ? `hue-rotate(${l.hue || 0}deg) saturate(${l.sat ?? 1}) brightness(${l.bri ?? 1})` : '');

/* ---------- Basic shapes ---------- */
export const SHAPES = [['rect', 'Square'], ['circle', 'Circle'], ['tri', 'Triangle'], ['rtri', 'Right ∆'], ['diamond', 'Diamond'], ['pent', 'Pentagon'], ['hex', 'Hexagon'], ['oct', 'Octagon'], ['star5', 'Star'], ['star6', 'Star 6'], ['burst', 'Burst'], ['heart', 'Heart'], ['arrow', 'Arrow'], ['chevron', 'Chevron'], ['cross', 'Plus'], ['ring', 'Ring'], ['para', 'Parallelogram'], ['trap', 'Trapezoid'], ['bolt', 'Bolt'], ['moon', 'Moon']];
const poly = (n, rot = -90, inner = 1) => {
  const m = inner < 1 ? n * 2 : n, p = [];
  for (let i = 0; i < m; i++) { const r = 50 * (inner < 1 && i % 2 ? inner : 1), a = ((rot + (i * 360) / m) * Math.PI) / 180; p.push((50 + r * Math.cos(a)).toFixed(2) + ',' + (50 + r * Math.sin(a)).toFixed(2)); }
  return 'M' + p.join('L') + 'Z';
};
const PATHS = {
  circle: 'M0,50A50,50 0 1 1 100,50A50,50 0 1 1 0,50Z',
  tri: poly(3), rtri: 'M0,0L0,100L100,100Z', diamond: poly(4), pent: poly(5), hex: poly(6, 0), oct: poly(8, 22.5),
  star5: poly(5, -90, 0.4), star6: poly(6, -90, 0.55), burst: poly(12, -90, 0.8),
  heart: 'M50,92C10,62 0,38 0,25C0,9 14,0 27,0C39,0 47,7 50,16C53,7 61,0 73,0C86,0 100,9 100,25C100,38 90,62 50,92Z',
  arrow: 'M0,35H55V8L100,50L55,92V65H0Z', chevron: 'M0,0H60L100,50L60,100H0L40,50Z', cross: 'M35,0H65V35H100V65H65V100H35V65H0V35H35Z',
  ring: 'M0,50A50,50 0 1 1 100,50A50,50 0 1 1 0,50ZM28,50A22,22 0 1 0 72,50A22,22 0 1 0 28,50Z',
  para: 'M25,0H100L75,100H0Z', trap: 'M20,0H80L100,100H0Z', bolt: 'M60,0L12,56H44L34,100L88,38H56Z',
  moon: 'M62,2A48,48 0 1 0 98,72A40,40 0 0 1 62,2Z',
};
const ptsPath = (pts, sm) => {
  const P = (pts || []).map((p) => [+p[0], +p[1]]).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])), n = P.length, f = (v) => v.toFixed(2);
  if (n < 3) return 'M0,0H100V100H0Z';
  if (!sm) return 'M' + P.map((p) => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';
  let d = `M${f(P[0][0])},${f(P[0][1])}`;
  for (let i = 0; i < n; i++) {
    const a = P[(i - 1 + n) % n], b = P[i], c = P[(i + 1) % n], e = P[(i + 2) % n];
    d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}`;
  }
  return d + 'Z';
};
// shape এর বাইরের রেখা বরাবর সমান দূরত্বে n টি বিন্দু (point editing এর জন্য)
export function outlinePts(d, n) {
  const NS = 'http://www.w3.org/2000/svg', sv = document.createElementNS(NS, 'svg'), pa = document.createElementNS(NS, 'path');
  sv.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden'); pa.setAttribute('d', d); sv.appendChild(pa); document.body.appendChild(sv);
  const L = pa.getTotalLength(), out = [];
  for (let i = 0; i < n; i++) { const pt = pa.getPointAtLength((L * i) / n); out.push([+pt.x.toFixed(2), +pt.y.toFixed(2)]); }
  sv.remove();
  return out;
}
export function shapeD(l) {
  if (l.k === 'custom' && Array.isArray(l.pts)) return ptsPath(l.pts, !!l.sm);
  if (l.k === 'rect' || !PATHS[l.k]) {
    const r = Math.min(0.5, Math.max(0, +l.rad || 0)) * 100;
    return r < 0.1 ? 'M0,0H100V100H0Z' : `M${r},0H${100 - r}A${r},${r} 0 0 1 100,${r}V${100 - r}A${r},${r} 0 0 1 ${100 - r},100H${r}A${r},${r} 0 0 1 0,${100 - r}V${r}A${r},${r} 0 0 1 ${r},0Z`;
  }
  return PATHS[l.k];
}
const hexc = (v, d) => (/^#[0-9a-f]{3,8}$/i.test(String(v)) ? String(v) : d);
export const BLENDS = ['normal', 'multiply', 'darken', 'lighten', 'overlay', 'screen', 'soft-light', 'hard-light', 'color-dodge', 'color-burn', 'difference', 'exclusion'];
export const gradStops = (l) => [hexc(l.t === 'text' ? l.color : l.fill, '#00e5ff'), hexc(l.fill2, '#8b5cf6'), ...(l.g3 ? [hexc(l.fill3, '#ff2e93')] : [])];
export const rgbaOf = (hex, a) => { const h = hexc(hex, '#000000').slice(1), f = h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6); return `rgba(${parseInt(f.slice(0, 2), 16)},${parseInt(f.slice(2, 4), 16)},${parseInt(f.slice(4, 6), 16)},${a})`; };
const nnum = (v, d) => (Number.isFinite(+v) ? +v : d);
export const shadowCss = (l, W) => (l.shadow ? `drop-shadow(${nnum(l.shx, 0) * W}px ${nnum(l.shy, 0) * W}px ${nnum(l.shb, 0.03) * W}px ${rgbaOf(l.shc, 0.7)})` : '');
function tintCv(bmp, l) {
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const x = c.getContext('2d'); x.drawImage(bmp, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = l.tna ?? 1;
  if (l.grad) {
    const a = ((l.ang ?? 45) * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a), w = c.width, h = c.height, g = x.createLinearGradient(w / 2 - (co * w) / 2, h / 2 - (si * h) / 2, w / 2 + (co * w) / 2, h / 2 + (si * h) / 2);
    gradStops(l).forEach((cl, i, arr) => g.addColorStop(i / (arr.length - 1), cl));
    x.fillStyle = g;
  } else x.fillStyle = hexc(l.fill, '#00e5ff');
  x.fillRect(0, 0, c.width, c.height);
  return c;
}
export function shapeSvg(l, swCss, gid = 'g') {
  const a = ((Number.isFinite(+l.ang) ? +l.ang : 45) * Math.PI) / 180, c = Math.cos(a) * 50, s = Math.sin(a) * 50;
  const f1 = hexc(l.fill, '#00e5ff'), st = gradStops(l);
  const grad = l.grad ? `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${(50 - c).toFixed(2)}" y1="${(50 - s).toFixed(2)}" x2="${(50 + c).toFixed(2)}" y2="${(50 + s).toFixed(2)}">${st.map((cl, i) => `<stop offset="${i / (st.length - 1)}" stop-color="${cl}"/>`).join('')}</linearGradient></defs>` : '';
  const pat = patOn(l) ? patSvg('p' + gid, l, 100) : '';
  const sk = +l.sw > 0 ? ` stroke="${hexc(l.stroke, '#000000')}" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke-width:${swCss}"` : '';
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible">${grad}${pat ? `<defs>${pat}</defs>` : ''}<path d="${shapeD(l)}" fill="${pat ? `url(#p${gid})` : l.grad ? `url(#${gid})` : f1}" fill-rule="${l.k === 'ring' ? 'evenodd' : 'nonzero'}"${sk}/></svg>`;
}

/* ---------- Template / design mini preview (user + admin দুই জায়গাতেই) ---------- */
let miniSeq = 0;
export function miniLayersHtml(list, assetOf, esc) {
  const n = (v, d) => (Number.isFinite(+v) ? +v : d);
  return (list || []).map((l) => {
    if (!l || l.hid) return '';
    const sy = n(l.sy, 1), fl = l.flip ? -1 : 1, fv = l.flv ? -1 : 1, bmx = l.bm && BLENDS.includes(l.bm) && l.bm !== 'normal' ? `;mix-blend-mode:${l.bm}` : '';
    const shm = l.shadow ? `;filter:drop-shadow(${n(l.shx, 0) * 100}cqw ${n(l.shy, 0) * 100}cqw ${n(l.shb, 0.03) * 100}cqw ${rgbaOf(l.shc, 0.7)})` : '';
    const pos = `left:${(n(l.x, 0.5) * 100).toFixed(2)}%;top:${(n(l.y, 0.5) * 100).toFixed(2)}%;opacity:${n(l.op, 1)}${bmx}${shm}`;
    const tr = `translate(-50%,-50%) rotate(${n(l.rot, 0)}deg)`;
    if (l.t === 'img') {
      const a = assetOf(l.aid);
      const tnt = l.tint ? `<i style="position:absolute;inset:0;background:${l.grad ? `linear-gradient(${n(l.ang, 45) + 90}deg,${gradStops(l).join(',')})` : hexc(l.fill, '#00e5ff')};opacity:${n(l.tna, 1)};-webkit-mask-image:url('${esc(a ? a.preview : '')}');mask-image:url('${esc(a ? a.preview : '')}');-webkit-mask-size:100% 100%;mask-size:100% 100%"></i>` : '';
      return a ? `<div class="ml" style="${pos};transform:${tr};width:${(n(l.w, 0.3) * 100).toFixed(2)}%"><img src="${esc(a.preview)}" alt="" style="transform:scale(${fl},${sy * fv});filter:${filt(l) || 'none'}">${tnt}</div>` : '';
    }
    if (l.t === 'shape') {
      const w = n(l.w, 0.25);
      return `<div class="ml" style="${pos};transform:${tr};width:${(w * 100).toFixed(2)}%;aspect-ratio:1/${sy}"><div style="width:100%;height:100%${fl < 0 || fv < 0 ? `;transform:scale(${fl},${fv})` : ''}">${shapeSvg(l, (n(l.sw, 0) * w * 100).toFixed(2) + 'cqw', 'mg' + ++miniSeq)}</div></div>`;
    }
    const fs = (n(l.fs, 0.08) * 100).toFixed(2);
    const tg = l.grad ? `;background:linear-gradient(${n(l.ang, 45) + 90}deg,${gradStops(l).join(',')});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent` : '';
    return `<div class="ml mtx" style="${pos};transform:${tr} scaleY(${sy * fv});font-size:${fs}cqw;font-family:'${esc(l.font)}',sans-serif;color:${esc(hexc(l.color, '#fff'))}${tg};-webkit-text-stroke:${(n(l.strokeW, 0) * fs).toFixed(2)}cqw ${esc(hexc(l.stroke, '#000'))};paint-order:stroke fill"><span style="display:inline-block;${fl < 0 ? 'transform:scaleX(-1)' : ''}">${esc(l.text)}</span></div>`;
  }).join('');
}

// Export এর সময় রং বদল (CSS filter এর হুবহু গণিত, সব ব্রাউজারে চলে)
function recolor(bmp, l) {
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(bmp, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  const a = ((l.hue || 0) * Math.PI) / 180, co = Math.cos(a), si = Math.sin(a), s = l.sat ?? 1, br = l.bri ?? 1;
  const Hm = [[0.213 + co * 0.787 - si * 0.213, 0.715 - co * 0.715 - si * 0.715, 0.072 - co * 0.072 + si * 0.928], [0.213 - co * 0.213 + si * 0.143, 0.715 + co * 0.285 + si * 0.14, 0.072 - co * 0.072 - si * 0.283], [0.213 - co * 0.213 - si * 0.787, 0.715 - co * 0.715 + si * 0.715, 0.072 + co * 0.928 + si * 0.072]];
  const Sm = [[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s], [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s], [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]];
  const M = Sm.map((r) => [0, 1, 2].map((j) => r[0] * Hm[0][j] + r[1] * Hm[1][j] + r[2] * Hm[2][j]));
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], g = p[i + 1], b = p[i + 2];
    p[i] = (M[0][0] * r + M[0][1] * g + M[0][2] * b) * br;
    p[i + 1] = (M[1][0] * r + M[1][1] * g + M[1][2] * b) * br;
    p[i + 2] = (M[2][0] * r + M[2][1] * g + M[2][2] * b) * br;
  }
  x.putImageData(d, 0, 0);
  return c;
}
const DEF_W = { banner: 0.6, shape: 0.25, name: 0.5, accessory: 0.3, sticker: 0.2, pattern: 1, logo: 0.2 };
const _mc = document.createElement('canvas').getContext('2d');
// বাঁকা লেখা: প্রতিটি অক্ষর বৃত্তের চাপ বরাবর বসে (DOM ও Export একই হিসাব ব্যবহার করে)
export function curveLay(text, fs, font, c) {
  _mc.font = `800 ${fs}px "${font}", sans-serif`;
  const ch = [...String(text)], ws = ch.map((g) => _mc.measureText(g).width), Wt = ws.reduce((a, b) => a + b, 0) || 1;
  const r = c ? Wt / ((c / 100) * Math.PI * 1.5) : 0; let s = -Wt / 2; const out = [];
  ch.forEach((g, i) => { const m = s + ws[i] / 2; s += ws[i]; if (!r) return out.push({ g, x: m, y: 0, rot: 0, w: ws[i] }); const p = m / r; out.push({ g, x: r * Math.sin(p), y: r * (1 - Math.cos(p)), rot: (p * 180) / Math.PI, w: ws[i] }); });
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  out.forEach((o) => { const a = (o.rot * Math.PI) / 180, ca = Math.abs(Math.cos(a)), sa = Math.abs(Math.sin(a)), hw = (o.w / 2) * ca + fs * 0.55 * sa, hh = fs * 0.55 * ca + (o.w / 2) * sa; x0 = Math.min(x0, o.x - hw); x1 = Math.max(x1, o.x + hw); y0 = Math.min(y0, o.y - hh); y1 = Math.max(y1, o.y + hh); });
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  out.forEach((o) => { o.x -= cx; o.y -= cy; });
  return { chars: out, w: Math.max(1, x1 - x0), h: Math.max(fs * 1.1, y1 - y0) };
}
// Style presets: [নাম, রং১, রং২(বা null), outline রং, outline মোটা, shadow/glow রং, glow?]
export const PRESETS = [
  ['Neon', '#00e5ff', '#ff2e93', '#001018', 0.06, '#00e5ff', 1], ['Fire', '#ffe259', '#ff3b00', '#3a0a00', 0.08, '#ff6a00', 1], ['Gold', '#fff1a8', '#d4a017', '#4a3200', 0.08, '#000000', 0],
  ['Chrome', '#ffffff', '#8a95a5', '#1a1f2b', 0.07, '#000000', 0], ['Ice', '#e0faff', '#3ba7ff', '#05304d', 0.07, '#3ba7ff', 1], ['Racing', '#ffffff', null, '#e10600', 0.14, '#000000', 0],
  ['Retro', '#ffd23f', '#ff2e93', '#2b0a4a', 0.1, '#8b5cf6', 0], ['Candy', '#ff9ad5', '#ffd6a5', '#ffffff', 0.1, '#ff2e93', 0], ['Bold', '#ffcc00', null, '#000000', 0.16, '#000000', 0],
  ['Clean', '#ffffff', null, '#000000', 0.06, null, 0], ['Dark', '#111111', null, '#ffffff', 0.1, null, 0], ['Glow', '#ffffff', null, '#000000', 0, '#ffffff', 1],
];
// Pattern fill (stripes/checker/…): SVG ও canvas দুই জায়গাতেই একই ডিজাইন
export const PATK = [['', 'None'], ['stripe', 'Stripes'], ['checker', 'Checker'], ['dots', 'Dots'], ['grid', 'Grid'], ['diamond', 'Diamonds']];
const PATP = { stripe: [['r', 0, 0.5, 1, 0.5]], checker: [['r', 0, 0, 0.5, 0.5], ['r', 0.5, 0.5, 0.5, 0.5]], dots: [['c', 0.5, 0.5, 0.26]], grid: [['r', 0, 0, 1, 0.14], ['r', 0, 0, 0.14, 1]], diamond: [['p', [0.5, 0, 1, 0.5, 0.5, 1, 0, 0.5]]] };
export const patOn = (l) => !!(l && l.pk && PATP[l.pk]);
const patD = (l) => ({ a: l.t === 'text' ? hexc(l.color, '#ffffff') : hexc(l.fill, '#00e5ff'), b: hexc(l.pc, '#000000'), ps: Math.min(0.6, Math.max(0.03, +l.ps || 0.12)), pa: +l.pa || 0 });
function patSvg(id, l, unit) {
  const { a, b, ps, pa } = patD(l), sz = ps * unit;
  return `<pattern id="${id}" width="${sz}" height="${sz}" viewBox="0 0 1 1" patternUnits="userSpaceOnUse" patternTransform="rotate(${pa})"><rect width="1" height="1" fill="${a}"/>${PATP[l.pk].map((q) => (q[0] === 'r' ? `<rect x="${q[1]}" y="${q[2]}" width="${q[3]}" height="${q[4]}" fill="${b}"/>` : q[0] === 'c' ? `<circle cx="${q[1]}" cy="${q[2]}" r="${q[3]}" fill="${b}"/>` : `<polygon points="${q[1].join(' ')}" fill="${b}"/>`)).join('')}</pattern>`;
}
// canvas pattern: unit = tile এর মাপ (destination এককে), pre = বাইরের matrix (shape এর জন্য scale)
function patCanvas(x, l, unit, pre) {
  const { a, b, ps, pa } = patD(l), sz = ps * unit, T = Math.max(8, Math.min(512, Math.round(sz * (pre ? 1 : 1))));
  const c = document.createElement('canvas'); c.width = c.height = T; const g = c.getContext('2d');
  g.fillStyle = a; g.fillRect(0, 0, T, T); g.fillStyle = b;
  PATP[l.pk].forEach((q) => { if (q[0] === 'r') g.fillRect(q[1] * T, q[2] * T, q[3] * T, q[4] * T); else if (q[0] === 'c') { g.beginPath(); g.arc(q[1] * T, q[2] * T, q[3] * T, 0, 7); g.fill(); } else { g.beginPath(); for (let i = 0; i < q[1].length; i += 2) g[i ? 'lineTo' : 'moveTo'](q[1][i] * T, q[1][i + 1] * T); g.fill(); } });
  const pt = x.createPattern(c, 'repeat'), m = new DOMMatrix();
  if (pre) m.multiplySelf(pre);
  m.rotateSelf(pa).scaleSelf(sz / T);
  pt.setTransform(m); return pt;
}
const DEF = { op: 1, sy: 1, hue: 0, sat: 1, bri: 1, ang: 45, sw: 0, rad: 0, pk: '', pc: '#000000', ps: 0.12, pa: 45, cv: 0, grad: false, shadow: false, fill: '#00e5ff', fill2: '#8b5cf6', fill3: '#ff2e93', g3: false, stroke: '#000000', bm: 'normal', shc: '#000000', shb: 0.03, shx: 0, shy: 0, tna: 1, tint: false, bgt: 28, bgs: 1, bge: 0, mk: '' };
// [selector, layer key, allowed types (null = সব), kind: n=number s=string b=bool]
const BIND = [
  ['#op', 'op', null, 'n'], ['#sy', 'sy', null, 'n'], ['#bm', 'bm', null, 's'],
  ['#tt', 'text', ['text'], 's'], ['#tf', 'font', ['text'], 's'], ['#tc', 'color', ['text'], 's'], ['#tcv', 'cv', ['text'], 'n'], ['#pk', 'pk', ['text', 'shape'], 's'], ['#pc', 'pc', ['text', 'shape'], 's'], ['#ps', 'ps', ['text', 'shape'], 'n'], ['#pa', 'pa', ['text', 'shape'], 'n'], ['#ts', 'stroke', ['text'], 's'], 
  ['#rh', 'hue', ['img'], 'n'], ['#rs', 'sat', ['img'], 'n'], ['#rb', 'bri', ['img'], 'n'],
  ['#sf', 'fill', ['shape', 'img'], 's'], ['#sg', 'grad', ['shape', 'text', 'img'], 'b'], ['#sf2', 'fill2', ['shape', 'text', 'img'], 's'], ['#sg3', 'g3', ['shape', 'text', 'img'], 'b'], ['#sf3', 'fill3', ['shape', 'text', 'img'], 's'], ['#sa', 'ang', ['shape', 'text', 'img'], 'n'],
  ['#bgt', 'bgt', ['img'], 'n'], ['#bgs', 'bgs', ['img'], 'n'], ['#bge', 'bge', ['img'], 'n'], ['#mk', 'mk', ['img'], 's'], ['#tn', 'tint', ['img'], 'b'], ['#tna', 'tna', ['img'], 'n'],
  ['#ss', 'stroke', ['shape'], 's'], ['#sh', 'shadow', null, 'b'], ['#shc', 'shc', null, 's'], ['#shb', 'shb', null, 'n'], ['#shx', 'shx', null, 'n'], ['#shy', 'shy', null, 'n'], ['#ptS', 'sm', ['shape'], 'b'],
];

const stepper = (id, label, presets = [0, 2, 4, 6, 8, 10, 15, 20]) => `<span class="inl stp" id="${id}"><label class="mut small">${label}</label><button class="tb" data-s="-1">−</button><b class="sv">0</b><button class="tb" data-s="1">＋</button>${presets.map((v) => `<button class="tb wide" data-v="${v}">${v}</button>`).join('')}</span>`;

export function mountStudio(root, skin, H, opts = {}) {
  const { S, esc, toast, modal } = H;
  const q$ = (s, r = root) => r.querySelector(s);
  const qa = (s, r = root) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mob = () => window.matchMedia('(max-width:860px)').matches;
  const key = 'studio:' + skin.id + (opts.template ? ':' + opts.template.id : '');
  let layers = [], sel = null, hist = [], fut = [], tab = 'banner', query = '', liveSnap = null, drag = null, snap0 = null;
  const pts = new Map(), vpts = new Map(), msel = new Set(), locals = new Map();
  let vz = null, baseHid = false, pickMode = false, showZones = false, editPts = false, selNode = -1, lastSel = null, baseIdx = 0;
  const Z = { z: 1, x: 0, y: 0 };
  let snapOn = true, tplId = opts.template ? opts.template.id : null;
  const guides = {};
  let seq = 0;
  const nid = () => 'L' + ++seq + Date.now().toString(36);
  const gidn = () => 'G' + ++seq + Date.now().toString(36);
  const fonts = () => [...S.fonts.map((f) => f.family), ...H.BASE_FONTS];
  const assetOf = (id) => S.assets.find((a) => a.id === id);
  const cur = () => layers.find((l) => l.id === sel);
  const snap = () => JSON.stringify(layers);
  const members = (l) => (l && l.gid ? layers.filter((o) => o.gid === l.gid) : l ? [l] : []);
  const gcol = (g) => { let h = 0; for (const ch of String(g)) h = (h * 31 + ch.charCodeAt(0)) % 360; return `hsl(${h} 85% 60%)`; };

  /* ---------- layout ---------- */
  const hasZones = !opts.own && Array.isArray(skin.zones) && skin.zones.length > 0;
  const tabs = [['vshape', '▲', 'Shapes'], ['text', '✏', 'Text'], ...(opts.admin ? [] : [['img', '🖼', 'My image'], ['ref', '📷', 'Reference']]), ...(hasZones ? [['zones', '▦', 'Zones']] : []), ...KINDS, ...(H.toggleFav ? [['fav', '⭐', 'Favorites']] : []), ['layers', '☰', 'Layers']];
  root.innerHTML = `<div class="wrap studio" data-drawer="">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px"><a href="${opts.admin ? '#/templates' : '#/studio'}" class="mut small">← Back</a><h2 class="grad" style="font-size:20px">${esc(skin.name)}</h2>${opts.admin ? '<span class="badge new">TEMPLATE BUILDER</span>' : opts.own ? '<span class="badge free">MY PNG</span>' : `<span class="badge ${skin.type}">${skin.type === 'paid' ? '⚡ ' + skin.price + ' CR' : 'FREE'}</span>`}${opts.template ? `<span class="badge paid">TEMPLATE: ${esc(opts.template.name)}</span>` : ''}</div>
    <nav class="rail" id="rail">${tabs.map((t) => `<button class="rl" data-rt="${t[0]}" title="${t[2]}"><span>${t[1]}</span><small>${SHORT[t[0]] || t[2]}</small></button>`).join('')}<i class="rsep"></i><button class="rl" data-ract="tools" title="Tools"><span>🛠</span><small>Tools</small></button><button class="rl" data-ract="undo"><span>↶</span><small>Undo</small></button><button class="rl" data-ract="redo"><span>↷</span><small>Redo</small></button><button class="rl go" data-ract="export"><span>⬇</span><small>${opts.admin ? 'Save' : 'Export'}</small></button></nav>
    <div class="st-grid">
      <aside class="card st-side"><button class="dclose" data-dc>✕</button><div class="st-tabs" id="tabs">${tabs.map((t) => `<button class="st-tab" data-t="${t[0]}" title="${t[2]}"><span>${t[1]}</span><small>${t[2]}</small></button>`).join('')}</div><div class="st-body" id="panel"></div></aside>
      <section class="st-main">
        <div class="card st-tools" id="tools"><button class="dclose" data-dc>✕</button>
          <button class="tb" data-act="undo" title="Undo (Ctrl+Z)">↶</button><button class="tb" data-act="redo" title="Redo">↷</button><i class="vsep"></i>
          <button class="tb" data-act="dup" title="Duplicate">⧉</button><button class="tb" data-act="flip" title="বাম↔ডান উল্টানো (Mirror)">⇋</button><button class="tb" data-act="flipv" title="উপর↕নিচ উল্টানো">⇅</button><button class="tb" data-act="up" title="Bring forward">⬆</button><button class="tb" data-act="down" title="Send back">⬇</button><button class="tb" data-act="del" title="Delete">🗑</button><i class="vsep"></i>
          <button class="tb wide on" data-act="snap" title="Snap / Guide লাইন">🧲 Snap</button><button class="tb wide" data-act="clear">Clear all</button><button class="tb wide" data-act="save" title="ডিজাইন ফাইল হিসেবে সেভ">💾 Save</button><button class="tb wide" data-act="open" title="সেভ করা ডিজাইন ফাইল খুলুন">📂 Open</button>${opts.admin ? '' : '<button class="tb wide" data-act="ver" title="আগের version ফিরিয়ে আনুন">🕘 Versions</button>'}<input type="file" id="openF" accept=".json,application/json" class="hide">
        </div>
        <div class="card props hide" id="props">
          <div class="pchips" id="pchips"></div>
          <div class="psec">
            <div class="pg" data-g="text" data-t="text" data-l="✏ Text"><input class="inp" id="tt" placeholder="লেখা…" maxlength="40"><select class="inp" id="tf"></select><label class="mut small">Curve (বাঁকা লেখা)</label><input type="range" id="tcv" min="-100" max="100" step="1"></div>
            <div class="pg" data-g="pat" data-t="text shape" data-l="▦ Pattern"><label class="mut small">Pattern</label><select class="inp" id="pk">${PATK.map((k) => `<option value="${k[0]}">${k[1]}</option>`).join('')}</select><label class="mut small">২য় রং</label><input type="color" id="pc"><label class="mut small">Size</label><input type="range" id="ps" min="0.03" max="0.6" step="0.01"><label class="mut small">Angle</label><input type="range" id="pa" min="0" max="180" step="1"><p class="mut small" style="width:100%">রং ১ = লেখা/shape এর মূল রং। Gradient থাকলে Pattern কাজ করবে।</p></div>
            <div class="pg" data-g="pre" data-t="text shape img" data-l="🎭 Style"><p class="mut small" style="width:100%">এক ক্লিকে রেডি স্টাইল (রং + outline + shadow)</p><div class="pstl" id="pstl"></div></div>
            <div class="pg" data-g="fill" data-t="text shape img" data-l="text:🎨 Color|shape:🎨 Fill|img:🌈 Tint">
              <span class="inl" data-t="img"><label class="chk mut small"><input type="checkbox" id="tn"> Tint ON (ছবির উপর রং)</label><label class="mut small">Amount</label><input type="range" id="tna" min="0.1" max="1" step="0.05"></span>
              <span class="inl" data-t="text"><label class="mut small">Color</label><input class="inp" type="color" id="tc"></span>
              <span class="inl" data-t="shape img"><label class="mut small">Color</label><input class="inp" type="color" id="sf"></span>
              <label class="chk mut small"><input type="checkbox" id="sg"> Gradient</label>
              <span id="sgw" class="inl hide"><input class="inp" type="color" id="sf2" title="Color 2"><label class="chk mut small"><input type="checkbox" id="sg3"> +Color</label><input class="inp hide" type="color" id="sf3" title="Color 3"><label class="mut small">Angle</label><input type="range" id="sa" min="0" max="360" step="5"></span>
            </div>
            <div class="pg" data-g="stroke" data-t="text shape" data-l="✒ Stroke"><span class="inl" data-t="text"><label class="mut small">Stroke color</label><input class="inp" type="color" id="ts"></span><span class="inl" data-t="shape"><label class="mut small">Stroke color</label><input class="inp" type="color" id="ss"></span>${stepper('bdc', 'Width')}</div>
            <div class="pg" data-g="shadow" data-t="text shape img" data-l="◐ Shadow"><label class="chk mut small"><input type="checkbox" id="sh"> Shadow ON</label><span class="inl"><label class="mut small">Color</label><input class="inp" type="color" id="shc"></span><span class="inl"><label class="mut small">Blur</label><input type="range" id="shb" min="0" max="0.06" step="0.002"></span><span class="inl"><label class="mut small">← →</label><input type="range" id="shx" min="-0.05" max="0.05" step="0.002"></span><span class="inl"><label class="mut small">↑ ↓</label><input type="range" id="shy" min="-0.05" max="0.05" step="0.002"></span></div>
            <div class="pg" data-g="crop" data-t="img" data-l="✂ Crop"><button class="tb wide" id="crB">✂ Crop…</button><button class="tb wide" id="crR">↺ Reset</button><button class="tb wide" id="bgB">🖌 Manual BG…</button></div>
            <div class="pg" data-g="rmbg" data-t="img" data-l="✨ Remove BG"><label class="chk mut small"><input type="checkbox" id="bgo"> Auto remove background</label><label class="mut small">Tolerance</label><input type="range" id="bgt" min="5" max="80" step="1"><label class="mut small">Smooth</label><input type="range" id="bgs" min="0" max="4" step="1"><label class="mut small">Edge</label><input type="range" id="bge" min="-5" max="5" step="1"></div>
            <div class="pg" data-g="mask" data-t="img" data-l="⬭ Mask"><label class="mut small">Shape</label><select class="inp" id="mk">${MASKS.map((m) => `<option value="${m[0]}">${m[1]}</option>`).join('')}</select></div>
            <div class="pg" data-g="imgc" data-t="img" data-l="🎚 Adjust colors"><label class="mut small">Hue</label><input type="range" id="rh" min="-180" max="180" step="1"><label class="mut small">Saturation</label><input type="range" id="rs" min="0" max="2" step="0.05"><label class="mut small">Brightness</label><input type="range" id="rb" min="0.3" max="1.7" step="0.05"><button class="tb wide" id="rr">Reset</button></div>
            <div class="pg" data-g="arr" data-t="text shape img" data-l="📐 Arrange">
              <span class="inl"><label class="mut small">X%</label><input class="inp nn" type="number" id="nx" step="0.5"></span><span class="inl"><label class="mut small">Y%</label><input class="inp nn" type="number" id="ny" step="0.5"></span><span class="inl"><label class="mut small">W%</label><input class="inp nn" type="number" id="nw" step="0.5" min="1"></span><span class="inl"><label class="mut small">H%</label><input class="inp nn" type="number" id="nh" step="1" min="5"></span><span class="inl"><label class="mut small">Angle°</label><input class="inp nn" type="number" id="nr" step="1"></span>
              <b class="mut small" style="width:100%">ALIGN (canvas এর সাপেক্ষে)</b>
              <button class="tb" data-al="l" title="বামে">⇤</button><button class="tb" data-al="ch" title="মাঝে (আড়াআড়ি)">↔</button><button class="tb" data-al="r" title="ডানে">⇥</button><button class="tb" data-al="t" title="উপরে">⤒</button><button class="tb" data-al="cv" title="মাঝে (খাড়া)">↕</button><button class="tb" data-al="b" title="নিচে">⤓</button><button class="tb wide" data-al="c">⊕ Center</button>
              <button class="tb wide" id="mir" title="উল্টো পাশে আয়নার মতো কপি">🪞 Mirror copy</button>
              <b class="mut small" style="width:100%">REPEAT</b>
              <span class="inl"><label class="mut small">Copies</label><input class="inp nn" type="number" id="rpn" min="2" max="20" value="4"></span><span class="inl"><label class="mut small">Gap →%</label><input class="inp nn" type="number" id="rpx" step="0.5" value="8"></span><span class="inl"><label class="mut small">Gap ↓%</label><input class="inp nn" type="number" id="rpy" step="0.5" value="0"></span><button class="tb wide" id="rpb">⧉ Repeat</button>
            </div>
            <div class="pg" data-g="shape" data-t="shape" data-l="◆ Shape">
              <span id="srw" class="inl hide">${stepper('rdc', 'Corner')}</span>
              <b class="mut small" style="width:100%">✎ POINTS (বিন্দু টেনে নিজের মতো shape)</b>
              <button class="tb wide" id="ptE">✎ Edit points</button>
              ${stepper('ptn', 'Points', [3, 4, 6, 8, 10, 12, 15, 20])}
              <span id="ptw" class="inl hide"><label class="chk mut small"><input type="checkbox" id="ptS"> Smooth</label><button class="tb wide" id="ptA">＋ Point</button><button class="tb wide" id="ptD">− Point</button></span>
            </div>
            <div class="pg" data-g="adj" data-t="text shape img" data-l="⚙ Opacity / Blend"><label class="mut small">Opacity</label><input type="range" id="op" min="0.1" max="1" step="0.05" value="1"><label class="mut small">Blend</label><select class="inp" id="bm" style="width:auto;padding:6px 8px">${BLENDS.map((b) => `<option>${b}</option>`).join('')}</select><label class="mut small" title="উপর-নিচে টানা / চাপা">↕ Stretch</label><input type="range" id="sy" min="0.2" max="4" step="0.05" value="1"><button class="tb wide" id="syr" title="Stretch রিসেট">1×</button></div>
          </div>
          <div id="palc" class="st-text"><b class="mut small">🎨</b><button class="tb wide" id="pickB" title="ছবি/স্ক্রিন থেকে রং তুলুন">💧 Pick</button><select class="inp" id="pk" style="width:auto;padding:6px 8px"><option value="fill">→ Fill / Text</option><option value="border">→ Border</option><option value="c2">→ Gradient 2</option></select><span id="pal" class="pal"></span></div>
        </div>
        <div class="card" style="padding:12px"><div class="vp" id="vp"><div class="stage2" id="stg"><img id="base" alt=""></div><div class="zbar"><button class="tb" id="zout" title="Zoom out">−</button><button class="tb wide" id="zfit" title="Fit">100%</button><button class="tb" id="zin" title="Zoom in">＋</button></div></div><p class="c mut small" style="margin-top:8px">টেনে সরান · কোণার ডট দিয়ে বড়-ছোট · লাল ডট দিয়ে ঘোরান · ＋/− বা দুই আঙুলে zoom · zoom করে ফাঁকা জায়গা টেনে সরান</p></div>
        ${opts.admin ? `<div class="card st-export"><div style="flex:1;min-width:240px"><span class="mut small">TEMPLATE INFO</span><div class="row" style="margin-top:6px"><input class="inp" id="tpName" maxlength="40" placeholder="Template name" value="${esc((opts.template && opts.template.name) || '')}"><input class="inp" id="tpCat" maxlength="30" placeholder="Category (optional)" value="${esc((opts.template && opts.template.category) || '')}"><input class="inp" id="tpPrice" type="number" min="0" placeholder="Extra price" title="Template এর আলাদা দাম (credits), 0 = বিনামূল্যে" value="${(opts.template && opts.template.price) || 0}" style="max-width:120px"></div></div><button class="btn big" id="tpSave">💾 Save template</button></div>` : `<div class="card st-export"><div><span class="mut small">EXPORT COST</span><div id="costTx" style="font-family:var(--hf);font-size:18px"></div></div><button class="btn big" id="exp">⬇ Export PNG</button></div>`}
      </section>
    </div></div>`;
  const stud = q$('.studio'), vp = q$('#vp'), stg = q$('#stg'), base = q$('#base'), zl = q$('#zfit');
  const openDrawer = (d) => { stud.dataset.drawer = d; };
  const closeDrawer = () => { stud.dataset.drawer = ''; };
  qa('[data-dc]').forEach((b) => (b.onclick = closeDrawer));
  base.src = skin.preview;
  base.onload = () => { stg.style.aspectRatio = base.naturalWidth + ' / ' + base.naturalHeight; applyZ(); layers.forEach((l) => { const el = elOf(l.id); el && place(el, l); }); };
  q$('#tf').innerHTML = fonts().map((f) => `<option>${esc(f)}</option>`).join('');
  fonts().forEach(H.ensureFont);
  const onFontsDone = () => layers.forEach((l) => { if (l.t === 'text' && l.cv) { const e = elOf(l.id); e && place(e, l); } });
  document.fonts && document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', onFontsDone);

  /* ---------- zoom / pan ---------- */
  function applyZ() {
    const W = stg.clientWidth, Hh = stg.clientHeight;
    Z.z = clamp(Z.z, 1, 6);
    Z.x = clamp(Z.x, W - W * Z.z, 0); Z.y = clamp(Z.y, Hh - Hh * Z.z, 0);
    stg.style.transform = Z.z === 1 ? '' : `translate(${Z.x}px,${Z.y}px) scale(${Z.z})`;
    stg.style.setProperty('--z', Z.z);
    zl.textContent = Math.round(Z.z * 100) + '%';
  }
  function zoomAt(nz, px, py) {
    nz = clamp(nz, 1, 6);
    Z.x = px - (px - Z.x) * (nz / Z.z); Z.y = py - (py - Z.y) * (nz / Z.z); Z.z = nz;
    applyZ();
  }
  const zc = () => [stg.clientWidth / 2, stg.clientHeight / 2];
  q$('#zin').onclick = () => zoomAt(Z.z * 1.3, ...zc());
  q$('#zout').onclick = () => zoomAt(Z.z / 1.3, ...zc());
  zl.onclick = () => { Z.z = 1; Z.x = 0; Z.y = 0; applyZ(); };
  vp.addEventListener('wheel', (e) => {
    if (!(e.ctrlKey || e.metaKey || Z.z > 1)) return;
    e.preventDefault();
    const r = vp.getBoundingClientRect();
    zoomAt(Z.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  /* ---------- stage render ---------- */
  const elOf = (id) => stg.querySelector(`.ly[data-id="${id}"]`);
  function place(el, l) {
    const W = stg.clientWidth || 600, sy = l.sy || 1, fl = l.flip ? -1 : 1, fv = l.flv ? -1 : 1, c = cur();
    Object.assign(el.style, { zIndex: (layers.indexOf(l) + 1) * 2, mixBlendMode: l.bm && l.bm !== 'normal' ? l.bm : '', display: l.hid ? 'none' : '', left: l.x * 100 + '%', top: l.y * 100 + '%', transform: `translate(-50%,-50%) rotate(${l.rot || 0}deg)`, opacity: l.op ?? 1 });
    const inn = el.firstChild;
    el.classList.toggle('tl', l.t === 'text');
    if (l.t === 'text') {
      el.classList.remove('fx'); el.style.width = 'auto'; el.style.aspectRatio = '';
      const fs = l.fs * W, lay = l.cv || patOn(l) ? curveLay(l.text, fs, l.font, l.cv || 0) : null;
      if (lay) {
        el.style.width = lay.w + 'px'; el.style.height = lay.h * sy + 'px';
        Object.assign(inn.style, { width: lay.w + 'px', height: lay.h + 'px', fontSize: '', fontFamily: '', color: '', fontWeight: '', webkitTextStroke: '0', paintOrder: '', background: '', webkitBackgroundClip: '', backgroundClip: '', webkitTextFillColor: '', transform: `scale(${fl},${sy * fv})`, filter: shadowCss(l, W) });
        const gid = 'cg' + l.id, a = ((l.ang ?? 45) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
        const pid = 'cp' + l.id, gd = patOn(l) ? `<defs>${patSvg(pid, l, fs)}</defs>` : l.grad ? `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${(-ca * lay.w) / 2}" y1="${(-sa * lay.h) / 2}" x2="${(ca * lay.w) / 2}" y2="${(sa * lay.h) / 2}">${gradStops(l).map((cl, i, ar) => `<stop offset="${i / (ar.length - 1)}" stop-color="${cl}"/>`).join('')}</linearGradient></defs>` : '';
        inn.innerHTML = `<svg width="${lay.w}" height="${lay.h}" viewBox="${-lay.w / 2} ${-lay.h / 2} ${lay.w} ${lay.h}" style="display:block;overflow:visible">${gd}${lay.chars.filter((o) => o.g.trim()).map((o) => `<text transform="translate(${o.x} ${o.y}) rotate(${o.rot})" text-anchor="middle" dominant-baseline="central" font-family="${esc(l.font)},sans-serif" font-size="${fs}" font-weight="800" fill="${patOn(l) ? `url(#${pid})` : l.grad ? `url(#${gid})` : hexc(l.color, '#ffffff')}" ${l.strokeW > 0 ? `stroke="${hexc(l.stroke, '#000000')}" stroke-width="${l.strokeW * fs}" stroke-linejoin="round" paint-order="stroke"` : ''}>${esc(o.g)}</text>`).join('')}</svg>`;
        el.style.aspectRatio = '';
      } else {
      inn.style.width = ''; inn.style.height = ''; el.style.width = 'auto';
      el.style.height = fs * 1.1 * sy + 'px';
      Object.assign(inn.style, { fontSize: fs + 'px', fontFamily: `"${l.font}",sans-serif`, color: l.color, fontWeight: 800, webkitTextStroke: l.strokeW > 0 ? l.strokeW * fs + 'px ' + l.stroke : '0', paintOrder: 'stroke fill', transform: `scale(${fl},${sy * fv})` });
      if (l.grad) Object.assign(inn.style, { background: `linear-gradient(${(l.ang ?? 45) + 90}deg,${gradStops(l).join(',')})`, webkitBackgroundClip: 'text', backgroundClip: 'text', webkitTextFillColor: 'transparent' });
      else Object.assign(inn.style, { background: '', webkitBackgroundClip: '', backgroundClip: '', webkitTextFillColor: '' });
      inn.style.filter = shadowCss(l, W);
      inn.textContent = l.text;
      }
    } else if (l.t === 'shape') {
      el.classList.add('fx'); el.style.width = l.w * 100 + '%'; el.style.height = ''; el.style.aspectRatio = '1 / ' + sy;
      inn.style.transform = fl < 0 || fv < 0 ? `scale(${fl},${fv})` : '';
      inn.style.filter = shadowCss(l, W);
      inn.innerHTML = shapeSvg(l, (l.sw || 0) * l.w * W + 'px', 'g' + l.id);
    } else {
      el.style.width = l.w * 100 + '%'; el.style.height = '';
      const kk = cropK(l.cr), pk = procKey(l), pc = pk && procCache.get(pk);
      if (pk && !pc) ensureProc(l);
      { const i0 = inn.querySelector('img'), ns = pc ? pc.url : l.url; if (i0 && i0.dataset.s !== ns) { i0.dataset.s = ns; i0.src = ns; } }
      if (l.nar) { el.classList.add('fx'); el.style.aspectRatio = '1 / ' + (l.nar * (kk.kh / kk.kw)) * sy; } else { el.classList.remove('fx'); el.style.aspectRatio = ''; }
      inn.style.transform = fl < 0 || fv < 0 ? `scale(${fl},${fv})` : ''; inn.style.filter = shadowCss(l, W);
      const im0 = inn.querySelector('img'); if (im0) im0.style.filter = filt(l);
      let tn = inn.querySelector('.tn');
      if (l.tint) {
        if (!tn) { tn = document.createElement('i'); tn.className = 'tn'; inn.appendChild(tn); }
        const u = `url("${String(pc ? pc.url : l.url).replace(/"/g, '%22')}")`;
        Object.assign(tn.style, { background: l.grad ? `linear-gradient(${(l.ang ?? 45) + 90}deg,${gradStops(l).join(',')})` : hexc(l.fill, '#00e5ff'), opacity: l.tna ?? 1, webkitMaskImage: u, maskImage: u });
      } else if (tn) tn.remove();
    }
    qa('.nd', el).forEach((n) => n.remove());
    if (l.t === 'shape' && l.k === 'custom' && editPts && l.id === sel && Array.isArray(l.pts)) {
      l.pts.forEach((pt, i) => {
        const n = document.createElement('i');
        n.className = 'nd' + (i === selNode ? ' on' : '');
        n.style.left = (fl < 0 ? 100 - pt[0] : pt[0]) + '%'; n.style.top = (fv < 0 ? 100 - pt[1] : pt[1]) + '%';
        n.onpointerdown = (e) => down(e, l.id, 'node', i);
        el.appendChild(n);
      });
    }
    el.style.pointerEvents = l.lock ? 'none' : '';
    el.classList.toggle('ref', !!l.ref);
    el.classList.toggle('sel', l.id === sel);
    el.classList.toggle('gm', !!l.gid && !!c && c.gid === l.gid && l.id !== sel);
    el.style.setProperty('--gc', l.gid ? gcol(l.gid) : 'transparent');
  }
  const bIdx = () => Math.min(Math.max(baseIdx, 0), layers.length);
  const applyBase = () => { base.style.zIndex = bIdx() * 2 + 1; };
  function renderStage() {
    applyBase();
    qa('.ly', stg).forEach((e) => e.remove());
    layers.forEach((l) => {
      const el = document.createElement('div');
      el.className = 'ly'; el.dataset.id = l.id;
      el.innerHTML = `<div class="in ${l.t === 'text' ? 'tx' : ''}">${l.t === 'img' ? '<img draggable="false" alt="">' : ''}</div><i class="hs"></i><i class="hr"></i>`;
      if (l.t === 'img') {
        const im = el.querySelector('img'), id = l.id;
        im.onload = () => { const L = layers.find((x) => x.id === id); if (L && im.naturalWidth && !L.nar) { L.nar = im.naturalHeight / im.naturalWidth; const e2 = elOf(id); e2 && place(e2, L); } };
        im.dataset.s = l.url; im.src = l.url;
      }
      el.onpointerdown = (e) => down(e, l.id, 'move');
      el.querySelector('.hs').onpointerdown = (e) => down(e, l.id, 'scale');
      el.querySelector('.hr').onpointerdown = (e) => down(e, l.id, 'rot');
      stg.appendChild(el);
      place(el, l);
    });
  }
  function refreshSel() { if (sel !== lastSel) { editPts = false; selNode = -1; lastSel = sel; } layers.forEach((l) => { const el = elOf(l.id); el && place(el, l); }); tools(); if (tab === 'layers') panel(); }

  /* ---------- history ---------- */
  const save = () => { if (opts.admin) return; try { localStorage.setItem(key, JSON.stringify(layers.filter((l) => !l.local))); } catch (e) {} };
  /* ---------- version history (browser এ শেষ ১০টি) ---------- */
  const verKey = 'studio:ver:' + key;
  const verGet = () => { try { const a = JSON.parse(localStorage.getItem(verKey) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  function verSnap(force) {
    if (opts.admin) return;
    const d = JSON.stringify(layers.filter((l) => !l.local)), a = verGet();
    if (!layers.some((l) => !l.local) || (a.length && a[0].d === d)) return false;
    a.unshift({ t: Date.now(), n: layers.filter((l) => !l.local).length, d });
    while (a.length > 10 || JSON.stringify(a).length > 1.8e6) a.pop();
    try { localStorage.setItem(verKey, JSON.stringify(a)); return true; } catch (e) { return false; }
  }
  const verTimer = setInterval(() => verSnap(), 60000);
  function verModal() {
    verSnap();
    const a = verGet(), fm = (t) => new Date(t).toLocaleString('bn-BD', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">🕘 Version history</h3><p class="mut small" style="margin-bottom:10px">ডিজাইন নিজে নিজে (প্রতি মিনিটে, বদলালে) এই ব্রাউজারে সেভ হয়। পছন্দের version এ ফিরুন — এখনকার ডিজাইনও আলাদা version হয়ে থাকবে।</p>${a.length ? a.map((v, i) => `<div class="lrow" style="margin-bottom:6px"><span class="lnm">${fm(v.t)} · ${v.n} layer${i === 0 ? ' (সর্বশেষ)' : ''}</span><button class="btn ghost sm" data-r="${i}">↩ Restore</button><button class="btn danger sm" data-d="${i}">🗑</button></div>`).join('') : '<p class="mut">এখনো কোনো version নেই। ডিজাইন করুন, নিজে নিজে জমা হবে।</p>'}<div class="lact" style="margin-top:10px"><button class="btn sm" id="vNow">💾 এখনকার version জমা করুন</button></div>`);
    ov.querySelector('#vNow').onclick = () => { toast(verSnap() ? 'Version জমা হয়েছে ✅' : 'নতুন কিছু বদলায়নি'); ov.close(); };
    ov.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { const v = verGet()[+b.dataset.r]; if (!v) return; verSnap(); try { const ls = hydrate(JSON.parse(v.d)); mutate(() => { layers = ls; sel = null; msel.clear(); }); toast('Version ফিরিয়ে আনা হয়েছে ↩'); } catch (e) { toast('এই version খোলা গেল না', 'err'); } ov.close(); }));
    ov.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { const x = verGet(); x.splice(+b.dataset.d, 1); try { localStorage.setItem(verKey, JSON.stringify(x)); } catch (e) {} ov.close(); verModal(); }));
  }
  function push(before) { hist.push(before); if (hist.length > 60) hist.shift(); fut = []; }
  function full() { renderStage(); tools(); cost(); if (tab === 'layers' || tab === 'ref') panel(); save(); }
  function mutate(fn) { const b = snap(); fn(); push(b); full(); }
  function live(fn) { if (liveSnap === null) liveSnap = snap(); fn(); const l = cur(); if (l) { const el = elOf(l.id); el && place(el, l); } }
  function endLive() { if (liveSnap !== null) { if (liveSnap !== snap()) push(liveSnap); liveSnap = null; save(); cost(); tools(); } }
  function undo() { if (!hist.length) return; fut.push(snap()); layers = JSON.parse(hist.pop()); if (!cur()) sel = null; full(); }
  function redo() { if (!fut.length) return; hist.push(snap()); layers = JSON.parse(fut.pop()); if (!cur()) sel = null; full(); }

  /* ---------- add / edit ---------- */
  const afterAdd = (needTools) => { if (!mob()) return; needTools ? openDrawer('tools') : closeDrawer(); };
  function addAsset(a, at) {
    mutate(() => {
      const l = { id: nid(), t: 'img', aid: a.id, url: a.preview, name: a.name, x: at ? clamp(at.x, 0, 1) : 0.5, y: at ? clamp(at.y, 0, 1) : 0.5, w: DEF_W[a.kind] || 0.3, sy: 1, rot: 0, flip: false, op: 1 };
      if (a.kind === 'pattern') { l.x = 0.5; l.y = 0.5; l.w = 1; }
      layers.push(l); sel = l.id;
    });
    afterAdd(false);
  }
  function addShape(k) {
    mutate(() => { const l = { id: nid(), t: 'shape', k, fill: '#00e5ff', fill2: '#8b5cf6', grad: false, ang: 45, stroke: '#000000', sw: 0, rad: 0, shadow: false, x: 0.5, y: 0.5, w: 0.25, sy: 1, rot: 0, flip: false, op: 1 };
      if (k === 'custom') { l.pts = outlinePts(PATHS.circle, 8); l.sm = true; editPts = true; selNode = -1; }
      layers.push(l); sel = l.id; lastSel = sel; });
    afterAdd(true);
  }
  function addLocal(f, ref) {
    const url = URL.createObjectURL(f);
    mutate(() => { const l = { id: nid(), t: 'img', local: true, aid: '', url, name: (ref ? '📷 ' : '') + (f.name || 'My image'), x: 0.5, y: 0.5, w: ref ? 0.6 : 0.4, sy: 1, rot: 0, flip: false, op: ref ? 0.5 : 1 }; if (ref) { l.ref = true; l.lock = false; } locals.set(url, f); layers.push(l); sel = l.id; });
    afterAdd(false);
  }
  function replaceLocal(l, f) {
    const url = URL.createObjectURL(f);
    locals.set(url, f);
    mutate(() => { l.url = url; l.name = (l.ref ? '📷 ' : '') + f.name; });
  }
  async function editLocal(l, how) {
    const f = locals.get(l.url); if (!f) return toast('ফাইল পাওয়া যায়নি', 'err');
    if (how === 'crop') {
      const cr = await cropDialog(modal, l.url); if (!cr) return;
      try { replaceLocal(l, await cropToFile(f, cr)); } catch (e) { toast('Crop হয়নি', 'err'); }
    } else {
      const nf = await removeBgDialog(modal, f); if (nf) replaceLocal(l, nf);
    }
  }
  function importFlow(f, isRef) {
    let cur = f, u = URL.createObjectURL(f);
    const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">🖼 ছবি যোগ</h3><div class="imp"><img id="impI" src="${u}" alt=""></div><div class="lact" style="margin-top:10px"><button class="btn ghost sm" id="impC">✂ Crop</button><button class="btn ghost sm" id="impB">✨ Remove BG</button><button class="btn sm" id="impA">✔ যোগ করুন</button></div>`);
    const img = ov.querySelector('#impI'); let done = false;
    const setF = (nf) => { cur = nf; URL.revokeObjectURL(u); u = URL.createObjectURL(nf); img.src = u; };
    ov.querySelector('#impC').onclick = async () => { const cr = await cropDialog(modal, u); if (cr) setF(await cropToFile(cur, cr)); };
    ov.querySelector('#impB').onclick = async () => { const nf = await removeBgDialog(modal, cur); if (nf) setF(nf); };
    ov.querySelector('#impA').onclick = () => { done = true; addLocal(cur, isRef); ov.close ? ov.close() : ov.remove(); };
    ov.onClose = () => { URL.revokeObjectURL(u); };
  }
  function addText() {
    mutate(() => { const l = { id: nid(), t: 'text', text: 'MY BUS', font: fonts()[0], color: '#ffffff', stroke: '#000000', strokeW: 0.08, fs: 0.08, x: 0.5, y: 0.5, sy: 1, rot: 0, flip: false, op: 1 }; layers.push(l); sel = l.id; });
    afterAdd(true);
    setTimeout(() => { const t = q$('#tt'); t && t.focus(); t && t.select(); }, 80);
  }
  function dupMany(arr) {
    const gm = {}, ids = {};
    arr.forEach((m) => {
      const c = { ...m, id: nid(), x: clamp(m.x + 0.04, 0, 1), y: clamp(m.y + 0.04, 0, 1) };
      if (m.gid) { gm[m.gid] = gm[m.gid] || gidn(); c.gid = gm[m.gid]; } else delete c.gid;
      layers.push(c); ids[m.id] = c.id;
    });
    return ids;
  }
  function dupLayer(l) { const ids = dupMany(members(l)); sel = ids[l.id]; }
  function copyTicked() {
    const ids = new Set([...msel].filter((id) => layers.some((l) => l.id === id)));
    if (!ids.size) return toast('Layer টিক দিন', 'err');
    layers.forEach((l) => { if (ids.has(l.id) && l.gid) layers.forEach((m) => m.gid === l.gid && ids.add(m.id)); });
    mutate(() => { const arr = layers.filter((l) => ids.has(l.id)), m = dupMany(arr); sel = m[arr[arr.length - 1].id]; msel.clear(); });
    toast('Copy হয়েছে ⧉');
  }
  function act(a) {
    const l = cur();
    if (a === 'undo') return undo();
    if (a === 'redo') return redo();
    if (a === 'clear') { if (layers.length && confirm('সব layer মুছে ফেলবেন?')) mutate(() => { layers = []; sel = null; msel.clear(); }); return; }
    if (a === 'snap') { snapOn = !snapOn; q$('[data-act="snap"]').classList.toggle('on', snapOn); return; }
    if (a === 'save') return saveFile();
    if (a === 'ver') return verModal();
    if (a === 'open') return q$('#openF').click();
    if (!l) return toast('আগে একটি layer সিলেক্ট করুন', 'err');
    if (a === 'del') mutate(() => { layers = layers.filter((x) => x.id !== l.id); sel = null; });
    if (a === 'dup') mutate(() => dupLayer(l));
    if (a === 'flip') mutate(() => { l.flip = !l.flip; });
    if (a === 'flipv') mutate(() => { l.flv = !l.flv; });
    if (a === 'up') mutate(() => { const i = layers.indexOf(l); if (i < layers.length - 1) [layers[i], layers[i + 1]] = [layers[i + 1], layers[i]]; });
    if (a === 'down') mutate(() => { const i = layers.indexOf(l); if (i > 0) [layers[i], layers[i - 1]] = [layers[i - 1], layers[i]]; });
  }
  qa('[data-act]').forEach((b) => (b.onclick = () => act(b.dataset.act)));
  BIND.forEach(([id, k, types, kind]) => {
    const el = q$(id);
    const ok = (l) => l && (!types || types.includes(l.t));
    const get = () => (kind === 'n' ? +el.value : kind === 'b' ? el.checked : el.value);
    if (kind === 'b') el.onchange = () => { const l = cur(); if (ok(l)) mutate(() => { l[k] = get(); }); };
    else {
      el.oninput = () => live(() => { const l = cur(); if (ok(l)) l[k] = get(); });
      el.onchange = () => { if (k === 'font') H.ensureFont(el.value); endLive(); };
    }
  });
  const STEP = {
    bdc: { get: (l) => Math.round((l.t === 'shape' ? (l.sw || 0) * l.w : (l.strokeW || 0) * l.fs) * 1000), set: (l, v) => { v = clamp(v, 0, 40); if (l.t === 'shape') l.sw = v / 1000 / l.w; else l.strokeW = clamp(v / 1000 / l.fs, 0, 0.6); } },
    ptn: { get: (l) => (l.k === 'custom' && l.pts ? l.pts.length : 0), set: (l, v) => { const n = clamp(Math.round(v), 3, 40); l.pts = outlinePts(shapeD(l), n); if (l.k !== 'custom') { l.sm = l.k === 'circle'; l.k = 'custom'; } } },
    rdc: { get: (l) => Math.round((l.rad || 0) * 100), set: (l, v) => { l.rad = clamp(v, 0, 50) / 100; } },
  };
  Object.entries(STEP).forEach(([id, st]) => {
    qa('#' + id + ' button').forEach((b) => (b.onclick = () => {
      const l = cur(); if (!l) return;
      mutate(() => st.set(l, b.dataset.v !== undefined ? +b.dataset.v : st.get(l) + +b.dataset.s));
    }));
  });
  q$('#ptE').onclick = () => {
    const l = cur(); if (!l || l.t !== 'shape') return;
    if (l.k !== 'custom') { mutate(() => STEP.ptn.set(l, 8)); editPts = true; } else editPts = !editPts;
    selNode = -1; refreshSel();
  };
  q$('#ptA').onclick = () => {
    const l = cur(); if (!l || l.k !== 'custom' || l.pts.length >= 40) return;
    mutate(() => { let bi = 0, bd = -1; l.pts.forEach((a, i) => { const b = l.pts[(i + 1) % l.pts.length], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (d > bd) { bd = d; bi = i; } }); const a = l.pts[bi], b = l.pts[(bi + 1) % l.pts.length]; l.pts.splice(bi + 1, 0, [+((a[0] + b[0]) / 2).toFixed(2), +((a[1] + b[1]) / 2).toFixed(2)]); selNode = bi + 1; });
    editPts = true; refreshSel();
  };
  q$('#ptD').onclick = () => {
    const l = cur(); if (!l || l.k !== 'custom') return;
    if (l.pts.length <= 3) return toast('কমপক্ষে ৩টি বিন্দু লাগবে', 'err');
    mutate(() => { l.pts.splice(selNode >= 0 && selNode < l.pts.length ? selNode : l.pts.length - 1, 1); selNode = -1; });
  };
  q$('#syr').onclick = () => { const l = cur(); if (l) mutate(() => { l.sy = 1; }); };

  /* ---------- Phase 12: crop / auto-BG / mask (সব ছবিতে, preview ও export একই pipeline) ---------- */
  const procCache = new Map(), procBusy = new Set(), procTimer = new Map(); let procWarned = false;
  const procKey = (l) => (l.t === 'img' && (l.cr || l.bgt || l.mk) ? l.url + '|' + JSON.stringify([l.cr || 0, l.bgt || 0, l.bgs ?? 1, l.bge || 0, l.mk || '']) : '');
  const cropK = (cr) => { const c = cr || [0, 0, 0, 0]; return { kw: Math.max(0.02, 1 - c[0] - c[2]), kh: Math.max(0.02, 1 - c[1] - c[3]) }; };
  function procApply(src, sw, sh, l, maxDim) {
    const cr = l.cr || [0, 0, 0, 0], { kw, kh } = cropK(l.cr), cw = Math.max(1, kw * sw), ch = Math.max(1, kh * sh), k = maxDim ? Math.min(1, maxDim / Math.max(cw, ch)) : 1;
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(cw * k)); c.height = Math.max(1, Math.round(ch * k));
    c.getContext('2d').drawImage(src, cr[0] * sw, cr[1] * sh, cw, ch, 0, 0, c.width, c.height);
    if (l.bgt) autoBgCanvas(c, { tol: l.bgt, smooth: l.bgs ?? 1, shift: l.bge || 0 });
    if (l.mk) maskCanvas(c, l.mk);
    return c;
  }
  function refreshProc(key) { layers.forEach((l) => { if (procKey(l) === key) { const e = elOf(l.id); e && place(e, l); } }); const c = cur(); if (c && procKey(c) === key && tab === 'layers') panel(); }
  function ensureProc(l) {
    const key = procKey(l); if (!key || procCache.has(key) || procBusy.has(key)) return;
    clearTimeout(procTimer.get(l.id));
    procTimer.set(l.id, setTimeout(() => {
      if (procKey(l) !== key || procCache.has(key) || procBusy.has(key)) return;
      procBusy.add(key);
      const im = new Image(); im.crossOrigin = 'anonymous';
      const fail = () => { procBusy.delete(key); if (!procWarned) { procWarned = true; toast('Preview তে এই ইফেক্ট দেখানো যায়নি — Export এ ঠিকই লাগবে', 'err'); } };
      im.onload = () => {
        try {
          const c = procApply(im, im.naturalWidth, im.naturalHeight, l, 900);
          c.toBlob((b) => { if (!b) return fail(); procCache.set(key, { url: URL.createObjectURL(b) }); procBusy.delete(key); if (procCache.size > 60) { const k0 = procCache.keys().next().value; URL.revokeObjectURL(procCache.get(k0).url); procCache.delete(k0); } refreshProc(key); }, 'image/png');
        } catch (e) { fail(); }
      };
      im.onerror = fail; im.src = l.url;
    }, 140));
  }
  // crop বদলালে ছবির সাইজ/জায়গা এমনভাবে ঠিক রাখে যাতে বাকি অংশ যেখানে ছিল সেখানেই থাকে
  function applyCrop(l, ncr) {
    const o = cropK(l.cr), n = cropK(ncr), oc = l.cr || [0, 0, 0, 0], nc = ncr || [0, 0, 0, 0];
    const R = stg.clientHeight / stg.clientWidth || 1, nar = l.nar || 1, sy = l.sy || 1;
    const dxs = (nc[0] + (1 - nc[2])) / 2 - (oc[0] + (1 - oc[2])) / 2, dys = (nc[1] + (1 - nc[3])) / 2 - (oc[1] + (1 - oc[3])) / 2;
    const bw = l.w, bh = l.w * nar * (o.kh / o.kw) * sy / R;
    let dx = (dxs / o.kw) * bw * (l.flip ? -1 : 1), dy = (dys / o.kh) * bh * (l.flv ? -1 : 1);
    const th = ((l.rot || 0) * Math.PI) / 180, co = Math.cos(th), si = Math.sin(th);
    const rx = dx * co - dy * R * si, ry = (dx * si + dy * R * co) / R;
    l.w = clamp(l.w * (n.kw / o.kw), 0.02, 3); l.x += rx; l.y += ry;
    if (ncr && ncr.some((v) => v > 0.001)) l.cr = ncr.map((v) => Math.round(v * 1e4) / 1e4); else delete l.cr;
  }
  q$('#crB').onclick = async () => {
    const l = cur(); if (!l || l.t !== 'img') return;
    const cr = await cropDialog(modal, l.url, l.cr || null);
    if (cr) mutate(() => applyCrop(l, cr));
  };
  q$('#crR').onclick = () => { const l = cur(); l && l.cr && mutate(() => applyCrop(l, null)); };
  q$('#bgo').onchange = (e) => { const l = cur(); l && l.t === 'img' && mutate(() => { l.bgt = e.target.checked ? l.bgt || 28 : 0; }); };

  /* ---------- Phase 12: Arrange (সংখ্যা, align, mirror, repeat) ---------- */
  const NUMF = {
    '#nx': { g: (l) => l.x * 100, s: (l, v) => { l.x = clamp(v / 100, -0.5, 1.5); } },
    '#ny': { g: (l) => l.y * 100, s: (l, v) => { l.y = clamp(v / 100, -0.5, 1.5); } },
    '#nw': { g: (l) => (l.t === 'text' ? l.fs : l.w) * 100, s: (l, v) => { if (l.t === 'text') l.fs = clamp(v / 100, 0.015, 0.6); else l.w = clamp(v / 100, 0.02, 3); } },
    '#nh': { g: (l) => (l.sy || 1) * 100, s: (l, v) => { l.sy = clamp(v / 100, 0.2, 4); } },
    '#nr': { g: (l) => l.rot || 0, s: (l, v) => { l.rot = clamp(v, -3600, 3600); } },
  };
  Object.entries(NUMF).forEach(([id, f]) => {
    const el = q$(id);
    el.oninput = () => { const l = cur(); if (!l || el.value === '' || !Number.isFinite(+el.value)) return; live(() => f.s(l, +el.value)); };
    el.onchange = endLive;
  });
  qa('[data-al]').forEach((b) => (b.onclick = () => {
    const l = cur(), el = l && elOf(l.id); if (!l || !el) return;
    const r = el.getBoundingClientRect(), sr = stg.getBoundingClientRect(), hw = r.width / 2 / sr.width, hh = r.height / 2 / sr.height, a = b.dataset.al;
    mutate(() => {
      if (a === 'l') l.x = hw; else if (a === 'r') l.x = 1 - hw; else if (a === 'ch') l.x = 0.5;
      else if (a === 't') l.y = hh; else if (a === 'b') l.y = 1 - hh; else if (a === 'cv') l.y = 0.5;
      else { l.x = 0.5; l.y = 0.5; }
    });
  }));
  q$('#mir').onclick = () => {
    const l = cur(); if (!l) return;
    if (layers.length >= 80) return toast('সর্বোচ্চ ৮০টি layer', 'err');
    mutate(() => { const m = dupMany([l]), c = layers.find((z) => z.id === m[l.id]); c.x = clamp(1 - l.x, -0.5, 1.5); c.y = l.y; c.flip = !l.flip; c.rot = -(l.rot || 0); delete c.gid; sel = c.id; });
    toast('🪞 উল্টো পাশে কপি হয়েছে');
  };
  q$('#rpb').onclick = () => {
    const l = cur(); if (!l) return;
    const n = clamp(Math.floor(+q$('#rpn').value) || 2, 2, 20), dx = (+q$('#rpx').value || 0) / 100, dy = (+q$('#rpy').value || 0) / 100;
    if (layers.length + n - 1 > 80) return toast('সর্বোচ্চ ৮০টি layer — কম copy দিন', 'err');
    mutate(() => { let last = l.id; for (let i = 1; i < n; i++) { const m = dupMany([l]), c = layers.find((z) => z.id === m[l.id]); c.x = l.x + dx * i; c.y = l.y + dy * i; delete c.gid; last = c.id; } sel = last; });
    toast(`⧉ ${n - 1}টি copy হয়েছে`);
  };
  q$('#bgB').onclick = () => { const l = cur(); l && l.local && editLocal(l, 'bg'); };
  q$('#pstl').innerHTML = PRESETS.map((p, i) => `<button class="pst" data-p="${i}" title="${p[0]}" style="background:${p[2] ? `linear-gradient(135deg,${p[1]},${p[2]})` : p[1]};color:${p[2] ? '#fff' : p[1] === '#ffffff' || p[1] === '#ffcc00' ? '#222' : '#fff'}">${p[0]}</button>`).join('');
  q$('#pstl').onclick = (e) => {
    const b = e.target.closest('[data-p]'), l = cur(); if (!b || !l) return;
    const [, a, c, st, sw, sh, gl] = PRESETS[+b.dataset.p];
    mutate(() => {
      if (l.t === 'text') { l.color = a; l.grad = !!c; if (c) { l.fill2 = c; l.g3 = false; l.ang = 90; } l.stroke = st; l.strokeW = sw; }
      else if (l.t === 'shape') { l.fill = a; l.grad = !!c; if (c) { l.fill2 = c; l.g3 = false; l.ang = 90; } l.stroke = st; l.sw = sw * 0.25; }
      if (sh) { l.shadow = true; l.shc = sh; l.shb = gl ? 0.035 : 0.015; l.shx = 0; l.shy = gl ? 0 : 0.012; } else l.shadow = false;
    });
  };
  q$('#rr').onclick = () => { const l = cur(); if (l && l.t === 'img') mutate(() => { l.hue = 0; l.sat = 1; l.bri = 1; }); };
  let pg = '';
  const DEFG = { text: 'text', shape: 'fill', img: 'imgc' };
  function syncProps(l) {
    const pr = q$('#props');
    pr.classList.toggle('hide', !l);
    stud.dataset.sel = l ? '1' : '';
    if (!l) return;
    qa('[data-t]', pr).forEach((e) => e.classList.toggle('hide', !e.dataset.t.split(' ').includes(l.t)));
    const gs = qa('.pg', pr).filter((g) => !g.classList.contains('hide'));
    if (!gs.some((g) => g.dataset.g === pg)) pg = (gs.find((g) => g.dataset.g === DEFG[l.t]) || gs[0]).dataset.g;
    const lab = (g) => { const d = g.dataset.l; if (!d.includes(':')) return d; const m = Object.fromEntries(d.split('|').map((x) => x.split(':'))); return m[l.t] || d; };
    q$('#pchips').innerHTML = gs.map((g) => `<button class="pc2 ${g.dataset.g === pg ? 'on' : ''}" data-pg="${g.dataset.g}">${lab(g)}</button>`).join('');
    gs.forEach((g) => { g.style.display = g.dataset.g === pg ? '' : 'none'; });
  }
  q$('#pchips').onclick = (e) => { const b = e.target.closest('[data-pg]'); if (b) { pg = b.dataset.pg; tools(); } };
  function tools() {
    const l = cur(), t = l && l.t;
    syncProps(l);
    if (l) {
      BIND.forEach(([id, k, types, kind]) => {
        if (types && !types.includes(l.t)) return;
        const el = q$(id), v = l[k] ?? DEF[k] ?? '';
        if (kind === 'b') el.checked = !!v; else if (document.activeElement !== el) el.value = v;
      });
      Object.entries(NUMF).forEach(([id, f]) => { const e = q$(id); if (document.activeElement !== e) e.value = Math.round(f.g(l) * 10) / 10; });
      q$('#bgo').checked = !!l.bgt; q$('#bgB').classList.toggle('hide', !l.local); q$('#crR').classList.toggle('hide', !l.cr);
      q$('#sgw').classList.toggle('hide', !l.grad);
      q$('#sf3').classList.toggle('hide', !l.g3);
      if (t === 'shape' || t === 'text') q$('#bdc .sv').textContent = STEP.bdc.get(l);
      if (t === 'shape' && l.k === 'rect') q$('#rdc .sv').textContent = STEP.rdc.get(l);
      if (t === 'shape') {
        const cu = l.k === 'custom';
        q$('#ptn .sv').textContent = cu ? STEP.ptn.get(l) : '–';
        q$('#ptw').classList.toggle('hide', !cu);
        q$('#ptE').textContent = cu && editPts ? '✔ Done' : '✎ Edit points';
      }
      q$('#srw').classList.toggle('hide', !(t === 'shape' && l.k === 'rect'));
    } else { q$('#op').value = 1; q$('#sy').value = 1; }
    qa('[data-act="undo"]')[0].disabled = !hist.length;
    qa('[data-act="redo"]')[0].disabled = !fut.length;
  }

  /* ---------- pointer: move / scale / rotate / pinch (group সহ) ---------- */
  const itemsOf = (l) => members(l).map((o) => ({ o, x0: o.x, y0: o.y, w0: o.w, fs0: o.fs, rot0: o.rot || 0 }));
  const centroid = (items) => ({ x: items.reduce((s, i) => s + i.x0, 0) / items.length, y: items.reduce((s, i) => s + i.y0, 0) / items.length });
  function down(e, id, mode, idx) {
    e.preventDefault(); e.stopPropagation();
    if (sel !== id) { sel = id; refreshSel(); }
    const l = cur(); if (!l) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = stg.getBoundingClientRect();
    if (pts.size === 2 && drag && drag.mode === 'move') {
      const [a, b] = [...pts.values()];
      const items = itemsOf(l), c = centroid(items);
      drag = { mode: 'pinch', items, cx: c.x, cy: c.y, d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x) };
      return;
    }
    const items = itemsOf(l), c = centroid(items);
    const pcx = r.left + c.x * r.width, pcy = r.top + c.y * r.height;
    snap0 = snap();
    if (mode === 'node') { selNode = idx; qa('.nd', elOf(id)).forEach((n, i) => n.classList.toggle('on', i === idx)); }
    drag = { mode, idx, px0: e.clientX, py0: e.clientY, items, cx: c.x, cy: c.y, pcx, pcy, d0: Math.hypot(e.clientX - pcx, e.clientY - pcy) || 1, a0: Math.atan2(e.clientY - pcy, e.clientX - pcx) };
  }
  // k = বড়-ছোট গুণক, dth = ঘোরার ডিগ্রি (centroid ঘিরে)
  function applyXform(k, dth) {
    const R = stg.clientHeight / stg.clientWidth || 1, th = (dth * Math.PI) / 180, co = Math.cos(th), si = Math.sin(th);
    drag.items.forEach(({ o, x0, y0, w0, fs0, rot0 }) => {
      const dx = x0 - drag.cx, dy = (y0 - drag.cy) * R;
      o.x = drag.cx + (dx * co - dy * si) * k;
      o.y = drag.cy + ((dx * si + dy * co) * k) / R;
      o.rot = Math.round(rot0 + dth);
      if (o.t === 'text') o.fs = clamp(fs0 * k, 0.015, 0.6); else o.w = clamp(w0 * k, 0.03, 3);
    });
  }
  function showGuide(kind, pos) {
    let g = guides[kind];
    if (pos == null) { if (g) { g.remove(); guides[kind] = null; } return; }
    if (!g) { g = document.createElement('div'); g.className = 'gl ' + kind; stg.appendChild(g); guides[kind] = g; }
    if (kind === 'v') g.style.left = pos * 100 + '%'; else g.style.top = pos * 100 + '%';
  }
  function snapMove(l) {
    if (!snapOn) { showGuide('v', null); showGuide('h', null); return; }
    const el = elOf(l.id), thr = 0.012;
    const hw = el ? el.offsetWidth / 2 / stg.clientWidth : 0, hh = el ? el.offsetHeight / 2 / stg.clientHeight : 0;
    const plain = Math.abs((l.rot || 0) % 180) < 1;
    const others = layers.filter((o) => o.id !== l.id);
    let gx = null, gy = null;
    for (const t of [0.5, ...others.map((o) => o.x)]) if (Math.abs(l.x - t) < thr) { l.x = t; gx = t; break; }
    if (gx === null && plain) { if (Math.abs(l.x - hw) < thr) { l.x = hw; gx = 0; } else if (Math.abs(l.x + hw - 1) < thr) { l.x = 1 - hw; gx = 1; } }
    for (const t of [0.5, ...others.map((o) => o.y)]) if (Math.abs(l.y - t) < thr) { l.y = t; gy = t; break; }
    if (gy === null && plain) { if (Math.abs(l.y - hh) < thr) { l.y = hh; gy = 0; } else if (Math.abs(l.y + hh - 1) < thr) { l.y = 1 - hh; gy = 1; } }
    showGuide('v', gx); showGuide('h', gy);
  }
  const redraw = (items) => items.forEach(({ o }) => { const el = elOf(o.id); el && place(el, o); });
  function onMove(e) {
    if (vpts.has(e.pointerId)) vpts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (vz) {
      if (vz.mode === 'pan') {
        const dx = e.clientX - vz.sx, dy = e.clientY - vz.sy;
        if (Math.hypot(dx, dy) > 5) vz.moved = true;
        if (Z.z > 1 && vz.moved) { Z.x = vz.x0 + dx; Z.y = vz.y0 + dy; applyZ(); }
      } else if (vpts.size >= 2) {
        const [a, b] = [...vpts.values()];
        zoomAt(vz.z0 * ((Math.hypot(a.x - b.x, a.y - b.y) || 1) / vz.d0), vz.mx, vz.my);
      }
      return;
    }
    if (!drag) return;
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const l = cur(); if (!l) return;
    const r = stg.getBoundingClientRect();
    if (drag.mode === 'move') {
      const ddx = (e.clientX - drag.px0) / r.width, ddy = (e.clientY - drag.py0) / r.height;
      drag.items.forEach(({ o, x0, y0 }) => { o.x = clamp(x0 + ddx, -0.2, 1.2); o.y = clamp(y0 + ddy, -0.2, 1.2); });
      if (drag.items.length === 1) snapMove(l);
    } else if (drag.mode === 'node' && l.pts && l.pts[drag.idx]) {
      const el = elOf(l.id), rc = el.getBoundingClientRect(), th = (-(l.rot || 0) * Math.PI) / 180, dx = e.clientX - (rc.left + rc.width / 2), dy = e.clientY - (rc.top + rc.height / 2);
      const rx = dx * Math.cos(th) - dy * Math.sin(th), ry = dx * Math.sin(th) + dy * Math.cos(th);
      let u = rx / (el.offsetWidth * Z.z) + 0.5, v = ry / (el.offsetHeight * Z.z) + 0.5;
      if (l.flip) u = 1 - u; if (l.flv) v = 1 - v;
      l.pts[drag.idx] = [+clamp(u * 100, -30, 130).toFixed(2), +clamp(v * 100, -30, 130).toFixed(2)];
    } else if (drag.mode === 'scale') applyXform(Math.hypot(e.clientX - drag.pcx, e.clientY - drag.pcy) / drag.d0, 0);
    else if (drag.mode === 'rot') applyXform(1, (Math.atan2(e.clientY - drag.pcy, e.clientX - drag.pcx) - drag.a0) * 180 / Math.PI);
    else if (drag.mode === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      applyXform((Math.hypot(a.x - b.x, a.y - b.y) || 1) / drag.d0, ((Math.atan2(b.y - a.y, b.x - a.x) - drag.a0) * 180) / Math.PI);
    }
    redraw(drag.items);
  }
  function onUp(e) {
    pts.delete(e.pointerId);
    if (vpts.has(e.pointerId)) {
      vpts.delete(e.pointerId);
      if (vz && vz.mode === 'pan' && !vz.moved && vpts.size === 0) { sel = null; msel.clear(); refreshSel(); closeDrawer(); }
      if (vz && (vz.mode === 'zoom' || vpts.size === 0)) vz = null;
    }
    showGuide('v', null); showGuide('h', null);
    if (!drag) return;
    if (drag.mode === 'pinch' ? pts.size < 2 : pts.size === 0) {
      if (snap0 !== null && snap0 !== snap()) { push(snap0); save(); cost(); tools(); }
      snap0 = null; drag = null; pts.clear();
    }
  }
  stg.onpointerdown = (e) => {
    if (e.target !== stg || drag) return;
    vpts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (vpts.size === 1) vz = { mode: 'pan', sx: e.clientX, sy: e.clientY, x0: Z.x, y0: Z.y, moved: false };
    else if (vpts.size === 2) {
      const [a, b] = [...vpts.values()], r = vp.getBoundingClientRect();
      vz = { mode: 'zoom', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: Z.z, mx: (a.x + b.x) / 2 - r.left, my: (a.y + b.y) / 2 - r.top };
    }
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  const onRes = () => { applyZ(); layers.forEach((l) => { const el = elOf(l.id); el && place(el, l); }); };
  window.addEventListener('resize', onRes);
  const onKey = (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) || document.querySelector('.ov')) return;
    const l = cur();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && l) { e.preventDefault(); act('del'); }
    else if (l && e.key.startsWith('Arrow')) { e.preventDefault(); const d = 0.004 * (e.shiftKey ? 5 : 1); const b = snap(); members(l).forEach((m) => { m.x += e.key === 'ArrowRight' ? d : e.key === 'ArrowLeft' ? -d : 0; m.y += e.key === 'ArrowDown' ? d : e.key === 'ArrowUp' ? -d : 0; }); push(b); full(); }
  };
  window.addEventListener('keydown', onKey);
  stg.ondragover = (e) => e.preventDefault();
  stg.ondrop = (e) => {
    e.preventDefault();
    const a = assetOf(e.dataTransfer.getData('text/plain'));
    if (!a) return;
    const r = stg.getBoundingClientRect();
    addAsset(a, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height });
  };

  /* ---------- layers: group / hide / delete ---------- */
  function mergeSel() {
    const ids = new Set([...msel].filter((id) => layers.some((l) => l.id === id)));
    if (ids.size < 2) return toast('২টি বা বেশি layer টিক দিন', 'err');
    layers.forEach((l) => { if (ids.has(l.id) && l.gid) layers.forEach((m) => m.gid === l.gid && ids.add(m.id)); });
    mutate(() => { const g = gidn(); layers.forEach((l) => { if (ids.has(l.id)) l.gid = g; }); msel.clear(); });
    toast('Merge (Group) হয়েছে — এখন একসাথে সরবে/ঘুরবে 🔗');
  }
  function splitSel() {
    const gs = new Set();
    [...msel, sel].forEach((id) => { const l = layers.find((x) => x.id === id); l && l.gid && gs.add(l.gid); });
    if (!gs.size) return toast('কোনো group সিলেক্ট নেই', 'err');
    mutate(() => { layers.forEach((l) => { if (gs.has(l.gid)) delete l.gid; }); msel.clear(); });
  }
  function delSel() {
    const ids = [...msel].filter((id) => layers.some((l) => l.id === id));
    if (!ids.length) return toast('Layer টিক দিন', 'err');
    mutate(() => { layers = layers.filter((l) => !ids.includes(l.id)); if (!cur()) sel = null; msel.clear(); });
  }

  /* ---------- side panel ---------- */
  function setTab(t) { tab = t; query = ''; panel(); }
  function panel() {
    qa('.st-tab, .rl[data-rt]').forEach((b) => b.classList.toggle('on', (b.dataset.t || b.dataset.rt) === tab));
    const p = q$('#panel');
    if (tab === 'vshape') {
      p.innerHTML = `<p class="mut small" style="margin-bottom:10px">যেকোনো shape ট্যাপ করুন। তারপর Tools থেকে রং, gradient, outline, ↕ Stretch (চ্যাপ্টা/লম্বা) বদলান।</p><div class="vgrid"><button class="vs" data-k="custom" title="নিজের মতো shape বানান"><svg viewBox="0 0 100 100"><path d="M50,8C80,5 95,35 88,60C80,90 40,97 20,78C3,60 12,15 50,8Z" fill="none" stroke="#00e5ff" stroke-width="5" stroke-dasharray="8 6"/><circle cx="50" cy="8" r="7" fill="#fff"/><circle cx="88" cy="60" r="7" fill="#fff"/><circle cx="20" cy="78" r="7" fill="#fff"/></svg><small>Custom ✎</small></button>${SHAPES.map(([k, n]) => `<button class="vs" data-k="${k}" title="${n}">${shapeSvg({ k, fill: '#00e5ff', fill2: '#8b5cf6', grad: true, ang: 45, sw: 0, rad: 0.12 }, '0', 'vp' + k)}<small>${n}</small></button>`).join('')}</div>`;
      qa('.vs', p).forEach((b) => (b.onclick = () => addShape(b.dataset.k)));
      return;
    }
    if (tab === 'text') {
      p.innerHTML = `<p class="mut small" style="margin-bottom:12px">নিজের নাম বা যেকোনো লেখা যোগ করুন। যোগ করার পর Tools এ লেখা, ফন্ট, রং ও ↕ Stretch বদলানো যাবে।</p><button class="btn" id="addTx" style="width:100%">＋ Add text</button>`;
      q$('#addTx').onclick = addText;
      return;
    }
    if (tab === 'ref') {
      const rl = layers.filter((l) => l.ref), R = stg.clientHeight / stg.clientWidth || 1;
      p.innerHTML = `<p class="mut small" style="margin-bottom:10px">📷 আসল বাসের ছবি আধা-স্বচ্ছ করে ভাসিয়ে তার উপর shape/লেখা বসিয়ে কপি করুন। এই ছবি <b>Export এ আসবে না</b>, ফাইলেও থাকে না। নিচের slider দিয়ে ইচ্ছামতো ছোট-বড় ও সরান, তারপর <b>🔒 Lock</b> করুন যাতে আঁকার সময় না সরে।</p><label class="btn" style="width:100%;cursor:pointer">📷 বাসের ছবি বেছে নিন<input type="file" id="refF" accept="image/png,image/jpeg,image/webp" class="hide"></label><div class="lact" style="margin:10px 0"><button class="btn ghost sm" id="refPal">🎨 Palette নিন</button><button class="btn ghost sm" id="refPick">💧 রং তুলুন</button></div>` + rl.map((l) => `<div class="rfc" data-id="${l.id}"><b class="small">${esc(l.name)}</b>${[['op', 'Opacity', 0.1, 1, 0.05, l.op], ['w', 'Size %', 5, 300, 1, Math.round(l.w * 100)], ['x', '← → %', -20, 120, 1, Math.round(l.x * 100)], ['y', '↑ ↓ %', -20, 120, 1, Math.round(l.y * 100)]].map((r) => `<div class="rfr"><label class="mut small">${r[1]}</label><input type="range" data-k="${r[0]}" min="${r[2]}" max="${r[3]}" step="${r[4]}" value="${r[5]}"></div>`).join('')}<div class="lact"><button class="btn ghost sm" data-lk>${l.lock ? '🔓 Unlock' : '🔒 Lock'}</button><button class="btn ghost sm" data-fit>⛶ Fit</button><button class="btn danger sm" data-rm>🗑</button></div></div>`).join('');
      q$('#refF').onchange = (e) => {
        const f = e.target.files[0]; e.target.value = '';
        if (!f) return;
        if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast('শুধু PNG/JPG/WEBP', 'err');
        if (f.size > 15 * 1024 * 1024) return toast('ছবি ১৫MB এর বেশি', 'err');
        importFlow(f, true);
      };
      q$('#refPal').onclick = autoPalette; q$('#refPick').onclick = () => { closeDrawer(); pickColor(); };
      qa('.rfc', p).forEach((c) => {
        const id = c.dataset.id, L = () => layers.find((x) => x.id === id);
        qa('input[type=range]', c).forEach((r) => {
          r.oninput = () => { const l = L(); if (!l) return; if (liveSnap === null) liveSnap = snap(); const k = r.dataset.k; l[k] = k === 'op' ? +r.value : +r.value / 100; const el = elOf(id); el && place(el, l); };
          r.onchange = endLive;
        });
        c.querySelector('[data-lk]').onclick = () => { const l = L(); l && mutate(() => { l.lock = !l.lock; }); panel(); };
        c.querySelector('[data-fit]').onclick = () => { const l = L(); l && mutate(() => { l.w = Math.min(1, R / (l.nar || 1)); l.x = 0.5; l.y = 0.5; }); panel(); };
        c.querySelector('[data-rm]').onclick = () => { mutate(() => { layers = layers.filter((x) => x.id !== id); if (!cur()) sel = null; }); panel(); };
      });
      return;
    }
    if (tab === 'zones') {
      p.innerHTML = `<p class="mut small" style="margin-bottom:10px">এই skin এ নামের জন্য ঠিক করা জায়গাগুলো। ট্যাপ করে সেখানে shape/লেখা বসান, বা সিলেক্ট করা layer কে ওই জায়গায় ফিট করুন।</p><label class="chk mut small" style="margin-bottom:10px"><input type="checkbox" id="zshow" ${showZones ? 'checked' : ''}> Stage এ zone দেখান</label>${skin.zones.map((z, i) => `<div class="zrow" data-i="${i}"><b style="flex:1;min-width:70px">${esc(z.label || 'Zone ' + (i + 1))}</b><button class="btn ghost sm" data-zs>▭ Shape</button><button class="btn ghost sm" data-zt>T Text</button><button class="btn ghost sm" data-zf>⤢ Fit</button></div>`).join('')}`;
      q$('#zshow').onchange = (e) => { showZones = e.target.checked; zonesOverlay(); };
      qa('.zrow', p).forEach((r) => {
        const z = skin.zones[+r.dataset.i];
        r.querySelector('[data-zs]').onclick = () => zoneShape(z);
        r.querySelector('[data-zt]').onclick = () => zoneText(z);
        r.querySelector('[data-zf]').onclick = () => zoneFit(z);
      });
      return;
    }
    if (tab === 'img') {
      p.innerHTML = `<p class="mut small" style="margin-bottom:12px">নিজের ছবি/লোগো (PNG, JPG, WEBP) যোগ করুন। 🔒 ফাইল আপলোড হয় না — শুধু আপনার ব্রাউজারে থাকে। ফাইলের ডিজাইন Save-এ ছবি থাকবে না, শুধু Export এ আসবে।</p><label class="btn" style="width:100%;cursor:pointer">🖼 ছবি বেছে নিন<input type="file" id="locF" accept="image/png,image/jpeg,image/webp" class="hide" multiple></label>`;
      q$('#locF').onchange = (e) => {
        const fl = [...e.target.files].slice(0, 10);
        fl.forEach((f) => {
          if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast('শুধু PNG/JPG/WEBP', 'err');
          if (f.size > 15 * 1024 * 1024) return toast(f.name + ' — ১৫MB এর বেশি', 'err');
          if (fl.length === 1) importFlow(f, false); else addLocal(f);
        });
        e.target.value = '';
      };
      return;
    }
    if (tab === 'layers') {
      const act2 = `<div class="lact"><button class="btn sm" id="gM">🔗 Merge</button><button class="btn ghost sm" id="gS">Ungroup</button><button class="btn ghost sm" id="gC">⧉ Copy</button><button class="btn danger sm" id="gD">🗑 Delete</button></div><p class="mut small" style="margin:6px 0 10px">২+ layer টিক দিয়ে <b>Merge</b> চাপলে সেগুলো একসাথে সরবে, বড়-ছোট হবে ও ঘুরবে। 👁 দিয়ে hide/show।</p>`;
      const rowOf = (l) => `<div class="lrow ${l.id === sel ? 'on' : ''} ${l.hid ? 'hid' : ''}" data-id="${l.id}"><input type="checkbox" class="chk" data-m ${msel.has(l.id) ? 'checked' : ''}><span class="lth">${l.t === 'img' ? `<img src="${esc(l.url)}" alt="">` : l.t === 'shape' ? shapeSvg({ ...l, sw: 0 }, '0', 'lt' + l.id) : 'T'}</span><span class="dgh" data-dg title="ধরে টেনে উপর-নিচ করুন">⠿</span><span class="lnm">${esc(l.nm ? l.nm : l.t === 'text' ? l.text : l.t === 'shape' ? (SHAPES.find((s) => s[0] === l.k) || [0, 'Shape'])[1] : l.name)}</span>${l.gid ? `<i class="gtag" style="background:${gcol(l.gid)}" title="Group"></i>` : ''}<button class="lck" data-rn title="নাম বদলান">✏</button><button class="lck" data-u title="উপরে আনুন">▲</button><button class="lck" data-dn title="নিচে নামান">▼</button><button class="lck" data-k title="Lock / Unlock">${l.lock ? '🔒' : '🔓'}</button><button class="lck" data-h title="Hide / Show">${l.hid ? '🚫' : '👁'}</button><button class="lck" data-x title="Delete">🗑</button></div>`;
      const baseRow = `<div class="lrow base ${baseHid ? 'hid' : ''}"><span class="lth"><img src="${esc(skin.preview)}" alt=""></span><span class="lnm">${opts.own ? 'Imported skin (base)' : 'Base skin'}</span><button class="lck" data-bu title="উপরে আনুন (layer এর উপরে)">▲</button><button class="lck" data-bdn title="নিচে নামান (layer এর নিচে)">▼</button><button class="lck" data-bh title="Hide / Show">${baseHid ? '🚫' : '👁'}</button></div>`;
      let rows = '';
      for (let i = layers.length - 1; i >= 0; i--) { if (i === bIdx() - 1) rows += baseRow; rows += rowOf(layers[i]); }
      if (bIdx() === 0) rows += baseRow;
      p.innerHTML = act2 + (layers.length ? '' : '<p class="mut small">কোনো layer নেই। ডিজাইন, Shape বা Text যোগ করুন।</p>') + rows;
      q$('#gM', p).onclick = mergeSel; q$('#gS', p).onclick = splitSel; q$('#gD', p).onclick = delSel; q$('#gC', p).onclick = copyTicked;
      q$('[data-bu]', p).onclick = () => { if (baseIdx < layers.length) { baseIdx = bIdx() + 1; applyBase(); panel(); } };
      q$('[data-bdn]', p).onclick = () => { if (baseIdx > 0) { baseIdx = bIdx() - 1; applyBase(); panel(); } };
      q$('[data-bh]', p).onclick = () => { baseHid = !baseHid; base.style.visibility = baseHid ? 'hidden' : ''; panel(); };
      qa('.lrow[data-id]', p).forEach((r) => {
        const mv = (d) => mutate(() => { const i = layers.findIndex((x) => x.id === r.dataset.id), j = i + d; if (i >= 0 && j >= 0 && j < layers.length) [layers[i], layers[j]] = [layers[j], layers[i]]; });
        r.querySelector('[data-u]').onclick = (e) => { e.stopPropagation(); mv(1); };
        r.querySelector('[data-dn]').onclick = (e) => { e.stopPropagation(); mv(-1); };
      });
      qa('.lrow[data-id]', p).forEach((r) => {
        const id = r.dataset.id;
        r.onclick = () => { sel = id; refreshSel(); };
        r.querySelector('[data-rn]').onclick = (e) => { e.stopPropagation(); const l = layers.find((x) => x.id === id); if (!l) return; const n = prompt('Layer এর নাম (খালি রাখলে আগের নাম):', l.nm || ''); if (n !== null) mutate(() => { if (n.trim()) l.nm = n.trim().slice(0, 30); else delete l.nm; }); };
        r.querySelector('[data-dg]').onpointerdown = (e) => {
          e.preventDefault(); e.stopPropagation(); const h = e.currentTarget; h.setPointerCapture(e.pointerId); r.classList.add('dragging'); let tgt = null;
          const mv = (ev) => { const t = document.elementFromPoint(ev.clientX, ev.clientY), row = t && t.closest && t.closest('.lrow[data-id]'); qa('.lrow.dt', p).forEach((x) => x.classList.remove('dt')); tgt = row && row !== r ? row.dataset.id : null; if (row && row !== r) row.classList.add('dt'); };
          const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); r.classList.remove('dragging'); qa('.lrow.dt', p).forEach((x) => x.classList.remove('dt')); if (tgt) mutate(() => { const i = layers.findIndex((x) => x.id === id), [m] = layers.splice(i, 1), j = layers.findIndex((x) => x.id === tgt); layers.splice(j + (i > j + 0 ? 0 : 1), 0, m); }); };
          h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
        };
        r.querySelector('[data-m]').onclick = (e) => { e.stopPropagation(); e.target.checked ? msel.add(id) : msel.delete(id); };
        r.querySelector('[data-k]').onclick = (e) => { e.stopPropagation(); const l = layers.find((x) => x.id === id); l && mutate(() => { l.lock = !l.lock; }); };
        r.querySelector('[data-h]').onclick = (e) => { e.stopPropagation(); const l = layers.find((x) => x.id === id); l && mutate(() => { l.hid = !l.hid; }); };
        r.querySelector('[data-x]').onclick = (e) => { e.stopPropagation(); mutate(() => { layers = layers.filter((x) => x.id !== id); msel.delete(id); if (!cur()) sel = null; }); };
      });
      return;
    }
    const favs = H.favs ? H.favs() : {};
    const list = S.assets.filter((a) => (tab === 'fav' ? favs[a.id] : query ? true : a.kind === tab) && (!query || ((a.name || '') + ' ' + (a.tags || '') + ' ' + a.kind).toLowerCase().includes(query.toLowerCase())));
    p.innerHTML = `<input class="inp" id="aq" placeholder="🔍 নাম / tag দিয়ে সব ক্যাটাগরিতে খুঁজুন…" value="${esc(query)}" style="margin-bottom:10px">${list.length ? `<div class="agrid">${list.map((a) => `<div class="ai" draggable="true" data-id="${a.id}" title="${esc(a.name)}"><img loading="lazy" src="${esc(a.preview)}" alt=""><span class="an">${esc(a.name)}</span><span class="badge ${a.type}">${a.type === 'paid' ? '⚡' + a.price : 'FREE'}</span>${H.toggleFav ? `<button class="fv ${favs[a.id] ? 'on' : ''}" data-f="${a.id}" title="Favorite">★</button>` : ''}</div>`).join('')}</div>` : `<p class="mut small" style="padding:16px 4px">${tab === 'fav' ? 'যেকোনো ডিজাইনের ★ চাপলে এখানে জমা হবে।' : 'এই ক্যাটাগরিতে এখনো কিছু নেই।'}</p>`}`;
    const aq = q$('#aq'); aq.oninput = () => { query = aq.value; const pos = aq.selectionStart; panel(); const n = q$('#aq'); n.focus(); n.setSelectionRange(pos, pos); };
    qa('.ai', p).forEach((c) => {
      const a = assetOf(c.dataset.id);
      c.onclick = () => addAsset(a);
      c.ondragstart = (e) => e.dataTransfer.setData('text/plain', a.id);
    });
    qa('.fv', p).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); H.toggleFav(b.dataset.f); }));
  }
  qa('.st-tab').forEach((b) => (b.onclick = () => setTab(b.dataset.t)));
  qa('.rl[data-rt]').forEach((b) => (b.onclick = () => {
    if (stud.dataset.drawer === 'side' && tab === b.dataset.rt) return closeDrawer();
    setTab(b.dataset.rt); openDrawer('side');
  }));
  qa('.rl[data-ract]').forEach((b) => (b.onclick = () => {
    const a = b.dataset.ract;
    if (a === 'tools') return openDrawer(stud.dataset.drawer === 'tools' ? '' : 'tools');
    closeDrawer();
    if (a === 'export') { const x = q$('#exp') || q$('#tpSave'); x && x.click(); } else act(a);
  }));

  /* ---------- colors: recent palette, eyedropper, auto palette ---------- */
  let colors = [];
  try { colors = JSON.parse(localStorage.getItem('studio:colors') || '[]').filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 14); } catch (e) {}
  function renderPal() {
    const b = q$('#pal');
    b.innerHTML = colors.length ? colors.map((c) => `<i data-c="${c}" style="background:${c}" title="${c}"></i>`).join('') : '<span class="mut small">রং তুললে এখানে জমা হবে</span>';
    qa('i', b).forEach((i) => (i.onclick = () => useColor(i.dataset.c, true)));
  }
  function addRecent(hex) { colors = [hex, ...colors.filter((c) => c !== hex)].slice(0, 14); try { localStorage.setItem('studio:colors', JSON.stringify(colors)); } catch (e) {} renderPal(); }
  function applyColor(hex) {
    const l = cur(), to = q$('#pk').value;
    if (!l || (l.t !== 'shape' && l.t !== 'text')) return toast('রং বসাতে আগে একটি Shape বা Text সিলেক্ট করুন', 'err');
    mutate(() => {
      if (to === 'border') l.stroke = hex;
      else if (to === 'c2') { l.fill2 = hex; l.grad = true; }
      else if (l.t === 'text') l.color = hex; else l.fill = hex;
      if (to === 'border' && l.t === 'shape' && !(l.sw > 0)) l.sw = 0.01;
      if (to === 'border' && l.t === 'text' && !(l.strokeW > 0)) l.strokeW = 0.08;
    });
  }
  function useColor(hex, fromSwatch) { if (!fromSwatch) addRecent(hex); applyColor(hex); }
  const sCache = new Map();
  let baseCan = null;
  { const bi = new Image(); bi.crossOrigin = 'anonymous'; bi.onload = () => { try { const c = document.createElement('canvas'); c.width = bi.naturalWidth; c.height = bi.naturalHeight; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bi, 0, 0); x.getImageData(0, 0, 1, 1); baseCan = c; } catch (e) {} }; bi.src = skin.preview; }
  const hex2 = (d) => '#' + [d[0], d[1], d[2]].map((n) => n.toString(16).padStart(2, '0')).join('');
  function sampleAt(cx, cy) {
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i], el = l.local && !l.hid ? elOf(l.id) : null;
      if (!el) continue;
      const rc = el.getBoundingClientRect(), th = (-(l.rot || 0) * Math.PI) / 180, dx = cx - (rc.left + rc.width / 2), dy = cy - (rc.top + rc.height / 2);
      let u = (dx * Math.cos(th) - dy * Math.sin(th)) / (el.offsetWidth * Z.z) + 0.5, v = (dx * Math.sin(th) + dy * Math.cos(th)) / (el.offsetHeight * Z.z) + 0.5;
      if (l.flip) u = 1 - u; if (l.flv) v = 1 - v;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const im = el.querySelector('img'); if (!im || !im.naturalWidth) continue;
      let c = sCache.get(l.id);
      if (!c) { const k = Math.min(1, 600 / Math.max(im.naturalWidth, im.naturalHeight)); c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k)); c.getContext('2d', { willReadFrequently: true }).drawImage(im, 0, 0, c.width, c.height); sCache.set(l.id, c); }
      const d = c.getContext('2d').getImageData(Math.min(c.width - 1, (u * c.width) | 0), Math.min(c.height - 1, (v * c.height) | 0), 1, 1).data;
      if (d[3] >= 20) return hex2(d);
    }
    if (baseCan && !baseHid) {
      const r = stg.getBoundingClientRect(), u = (cx - r.left) / r.width, v = (cy - r.top) / r.height;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) { const d = baseCan.getContext('2d').getImageData(Math.min(baseCan.width - 1, (u * baseCan.width) | 0), Math.min(baseCan.height - 1, (v * baseCan.height) | 0), 1, 1).data; if (d[3] >= 20) return hex2(d); }
    }
    return null;
  }
  async function pickColor() {
    if (window.EyeDropper) { try { const r = await new window.EyeDropper().open(); useColor(r.sRGBHex); } catch (e) {} return; }
    pickMode = true; vp.classList.add('picking'); toast('এখন ছবির উপর ট্যাপ করুন 💧');
  }
  vp.addEventListener('pointerdown', (e) => {
    if (!pickMode) return;
    e.preventDefault(); e.stopPropagation(); pickMode = false; vp.classList.remove('picking');
    const c = sampleAt(e.clientX, e.clientY);
    c ? useColor(c) : toast('এখানে কোনো ছবি নেই — Reference বা নিজের ছবি যোগ করুন', 'err');
  }, true);
  q$('#pickB').onclick = () => { closeDrawer(); pickColor(); };
  async function autoPalette() {
    const l = [...layers].reverse().find((x) => x.local && locals.has(x.url));
    if (!l) return toast('আগে একটি Reference বা নিজের ছবি যোগ করুন', 'err');
    try {
      const bmp = await createImageBitmap(locals.get(l.url)), k = Math.min(1, 96 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height).data, bk = new Map();
      for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const key = (d[i] >> 5) * 64 + (d[i + 1] >> 5) * 8 + (d[i + 2] >> 5), b = bk.get(key) || [0, 0, 0, 0]; b[0] += d[i]; b[1] += d[i + 1]; b[2] += d[i + 2]; b[3]++; bk.set(key, b); }
      const cand = [...bk.values()].sort((a, b) => b[3] - a[3]).map((b) => [Math.round(b[0] / b[3]), Math.round(b[1] / b[3]), Math.round(b[2] / b[3])]), pick = [];
      for (const cc of cand) { if (pick.every((q) => Math.hypot(q[0] - cc[0], q[1] - cc[1], q[2] - cc[2]) > 60)) pick.push(cc); if (pick.length >= 8) break; }
      pick.reverse().forEach((q) => addRecent(hex2(q)));
      toast(pick.length + 'টি রং Palette এ যোগ হয়েছে 🎨');
    } catch (e) { toast('Palette বের করা যায়নি', 'err'); }
  }

  /* ---------- zones: নাম বসানোর জায়গা ---------- */
  function zonesOverlay() {
    qa('.zone', stg).forEach((z) => z.remove());
    if (!showZones || !hasZones) return;
    skin.zones.forEach((z, i) => {
      const d = document.createElement('div');
      d.className = 'zone';
      Object.assign(d.style, { left: z.x * 100 + '%', top: z.y * 100 + '%', width: z.w * 100 + '%', height: z.h * 100 + '%', transform: `rotate(${z.rot || 0}deg)` });
      d.innerHTML = `<span>${esc(z.label || 'Zone ' + (i + 1))}</span>`;
      stg.appendChild(d);
    });
  }
  function fitToZone(l, z) {
    const W = stg.clientWidth, R = stg.clientHeight / W;
    l.x = z.x + z.w / 2; l.y = z.y + z.h / 2; l.rot = z.rot || 0; if (z.mirror) l.flip = true;
    if (l.t === 'shape') { l.w = clamp(z.w, 0.03, 3); l.sy = clamp((z.h * R) / z.w, 0.05, 8); }
    else if (l.t === 'img') l.w = clamp(Math.min(z.w, (z.h * R) / ((l.nar || 1) * (l.sy || 1))), 0.03, 3);
    else {
      const cx = document.createElement('canvas').getContext('2d'); cx.font = `800 100px "${l.font}", sans-serif`;
      const tw = Math.max(1, cx.measureText(l.text).width) / 100, fp = Math.min((z.w * W * 0.95) / tw, (z.h * R * W) / (1.1 * (l.sy || 1)));
      l.fs = clamp(fp / W, 0.015, 0.6);
    }
  }
  function zoneShape(z) { mutate(() => { const l = { id: nid(), t: 'shape', k: 'rect', fill: '#00e5ff', fill2: '#8b5cf6', grad: false, ang: 45, stroke: '#000000', sw: 0, rad: 0, shadow: false, x: 0.5, y: 0.5, w: 0.25, sy: 1, rot: 0, flip: false, op: 1 }; fitToZone(l, z); layers.push(l); sel = l.id; }); afterAdd(true); }
  function zoneText(z) { mutate(() => { const l = { id: nid(), t: 'text', text: z.label || 'MY BUS', font: fonts()[0], color: '#ffffff', stroke: '#000000', strokeW: 0.08, fs: 0.08, x: 0.5, y: 0.5, sy: 1, rot: 0, flip: false, op: 1 }; fitToZone(l, z); layers.push(l); sel = l.id; }); afterAdd(true); }
  function zoneFit(z) { const l = cur(); if (!l) return toast('আগে একটি layer সিলেক্ট করুন', 'err'); mutate(() => fitToZone(l, z)); }

  /* ---------- cost ---------- */
  function calc() {
    const ids = [...new Set(layers.filter((l) => l.t === 'img' && !l.local && !l.hid).map((l) => l.aid))];
    const sp = !opts.own && skin.type === 'paid';
    let c = sp ? Number(skin.price) || 1 : 0, paidN = sp ? 1 : 0;
    ids.forEach((id) => { const a = assetOf(id); if (a && a.type === 'paid') { c += Number(a.price) || 1; paidN++; } });
    const tp = tplId ? Number(((S.templates || []).find((t) => t.id === tplId) || {}).price) || 0 : 0;
    if (tp) { c += tp; paidN++; }
    return { ids, cost: c, paidN };
  }
  function cost() {
    if (!q$('#costTx')) return;
    const { cost: c, paidN } = calc();
    const adOn = S.cfg.ads && S.cfg.ads.enabled !== false;
    q$('#costTx').innerHTML = c > 0 ? `<span style="color:var(--warn)">⚡ ${c} credits</span> <span class="mut small">(${paidN} paid item)</span>` : `<span style="color:var(--ok)">FREE</span> <span class="mut small">${adOn ? '· ১টি ad দেখতে হবে' : ''}</span>`;
  }

  /* ---------- export ---------- */
  const confirmCost = (c) => new Promise((resolve) => {
    const bal = (S.me && S.me.credits) || 0, ok = bal >= c;
    const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">Export</h3><p>এই ডিজাইনে মোট <b style="color:var(--warn)">${c} credit</b> কাটা হবে।</p><p class="mut" style="margin:8px 0 18px">আপনার balance: <b>${bal}</b></p>${ok ? '<button class="btn" id="yes" style="width:100%">Confirm &amp; Export</button>' : '<a class="btn" href="#/wallet" id="buy" style="width:100%">Credit কিনুন / আয় করুন</a>'}`);
    let done = false;
    ov.onClose = () => !done && resolve(false);
    const y = ov.querySelector('#yes'); if (y) y.onclick = () => { done = true; ov.close(); resolve(true); };
    const b = ov.querySelector('#buy'); if (b) b.onclick = () => ov.close();
  });
  async function getFile(token, id) {
    for (let i = 0; i < 2; i++) {
      const t = await H.auth.currentUser.getIdToken();
      const r = await fetch(H.API + '/api/export/file', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify({ token, id }) });
      if (r.ok) return createImageBitmap(await r.blob());
      if (i) throw new Error((await r.json().catch(() => ({}))).error || 'File আনা যায়নি');
    }
  }
  function drawShape(x, l, W) {
    const w = l.w * W, h = w * (l.sy || 1);
    x.translate(-w / 2, -h / 2);
    const p = new Path2D();
    p.addPath(new Path2D(shapeD(l)), new DOMMatrix().scale(w / 100, h / 100));
    const rule = l.k === 'ring' ? 'evenodd' : 'nonzero';
    if (patOn(l)) x.fillStyle = patCanvas(x, l, w, new DOMMatrix().scaleSelf(1, h / w));
    else if (l.grad) {
      const a = ((l.ang ?? 45) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      const g = x.createLinearGradient(w / 2 - (c * w) / 2, h / 2 - (s * h) / 2, w / 2 + (c * w) / 2, h / 2 + (s * h) / 2);
      gradStops(l).forEach((cl, i, arr) => g.addColorStop(i / (arr.length - 1), cl));
      x.fillStyle = g;
    } else x.fillStyle = l.fill;
    x.fill(p, rule);
    x.shadowColor = 'transparent'; x.shadowBlur = 0;
    if (l.sw > 0) { x.lineJoin = 'round'; x.lineWidth = l.sw * w; x.strokeStyle = l.stroke; x.stroke(p); }
  }
  if (q$('#exp')) q$('#exp').onclick = async (ev) => {
    const btn = ev.currentTarget;
    if (!S.user) return H.loginModal('Login করে Export করুন');
    const vis = layers.filter((l) => !l.hid && !l.ref);
    if (!vis.length && !confirm('কোনো ডিজাইন যোগ করা হয়নি। শুধু base skin Export করবেন?')) return;
    const { ids, cost: c } = calc();
    let sid = null;
    if (c > 0) { if (!(await confirmCost(c))) return; }
    else if (S.cfg.ads && S.cfg.ads.enabled !== false) { const r = await H.runAd('download', opts.own ? 'own' : skin.id); if (!r) return; sid = r.sid; }
    const old = btn.textContent; btn.disabled = true; btn.textContent = 'Preparing…';
    try {
      const pre = await H.api('/api/export/prepare', { skinId: opts.own ? 'own' : skin.id, assetIds: ids, sid, templateId: tplId });
      btn.textContent = 'Rendering…';
      const [baseBmp, ...bmps] = await Promise.all([opts.own ? createImageBitmap(opts.own) : getFile(pre.token, skin.id), ...ids.map((id) => getFile(pre.token, id))]);
      const map = Object.fromEntries(ids.map((id, i) => [id, bmps[i]]));
      const lbm = {};
      await Promise.all(vis.filter((l) => l.local).map(async (l) => { lbm[l.id] = await createImageBitmap(locals.get(l.url)); }));
      const W = baseBmp.width, Hh = baseBmp.height;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
      const x = cv.getContext('2d');
      await Promise.all(vis.filter((l) => l.t === 'text').map((l) => H.ensureFont(l.font)));
      for (let li = 0; li <= layers.length; li++) {
        if (li === bIdx() && !baseHid) x.drawImage(baseBmp, 0, 0);
        const l = layers[li];
        if (!l || l.hid || l.ref) continue;
        const sy = l.sy || 1;
        x.save();
        x.globalAlpha = l.op ?? 1;
        if (l.bm && l.bm !== 'normal') x.globalCompositeOperation = l.bm;
        x.translate(l.x * W, l.y * Hh);
        x.rotate(((l.rot || 0) * Math.PI) / 180);
        if (l.shadow) {
          const th = ((l.rot || 0) * Math.PI) / 180, ox = (l.shx || 0) * W * (l.flip ? -1 : 1), oy = (l.shy || 0) * W * (l.flv ? -1 : 1);
          x.shadowOffsetX = ox * Math.cos(th) - oy * Math.sin(th); x.shadowOffsetY = ox * Math.sin(th) + oy * Math.cos(th);
          x.shadowBlur = nnum(l.shb, 0.03) * W; x.shadowColor = rgbaOf(l.shc, 0.7);
        }
        if (l.t === 'img') {
          const b0 = l.local ? lbm[l.id] : map[l.aid]; if (!b0) { x.restore(); continue; }
          const pb = l.cr || l.bgt || l.mk ? procApply(b0, b0.width, b0.height, l, l.bgt ? 2400 : 0) : b0;
          const b1 = filt(l) ? recolor(pb, l) : pb, b = l.tint ? tintCv(b1, l) : b1, w = l.w * W, h = w * (pb.height / pb.width) * sy;
          x.scale(l.flip ? -1 : 1, l.flv ? -1 : 1);
          x.drawImage(b, -w / 2, -h / 2, w, h);
        } else if (l.t === 'shape') {
          x.scale(l.flip ? -1 : 1, l.flv ? -1 : 1);
          drawShape(x, l, W);
        } else {
          const fs = l.fs * W;
          x.scale(l.flip ? -1 : 1, sy * (l.flv ? -1 : 1));
          if (l.cv || patOn(l)) {
            const lay = curveLay(l.text, fs, l.font, l.cv || 0), a = ((l.ang ?? 45) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
            x.font = `800 ${fs}px "${l.font}", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
            lay.chars.forEach((o) => {
              if (!o.g.trim()) return;
              const r = (o.rot * Math.PI) / 180; x.save(); x.translate(o.x, o.y); x.rotate(r);
              if (l.strokeW > 0) { x.lineJoin = 'round'; x.lineWidth = fs * l.strokeW; x.strokeStyle = l.stroke; x.strokeText(o.g, 0, 0); }
              if (patOn(l)) x.fillStyle = patCanvas(x, l, fs, null);
              else if (l.grad) {
                const lp = (px, py) => { const dx = px - o.x, dy = py - o.y; return [dx * Math.cos(-r) - dy * Math.sin(-r), dx * Math.sin(-r) + dy * Math.cos(-r)]; };
                const p1 = lp((-ca * lay.w) / 2, (-sa * lay.h) / 2), p2 = lp((ca * lay.w) / 2, (sa * lay.h) / 2), g = x.createLinearGradient(p1[0], p1[1], p2[0], p2[1]);
                gradStops(l).forEach((cl, i, ar) => g.addColorStop(i / (ar.length - 1), cl)); x.fillStyle = g;
              } else x.fillStyle = l.color;
              x.fillText(o.g, 0, 0); x.restore();
            });
          } else {
          x.font = `800 ${fs}px "${l.font}", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
          if (l.strokeW > 0) { x.lineJoin = 'round'; x.lineWidth = fs * l.strokeW; x.strokeStyle = l.stroke; x.strokeText(l.text, 0, 0); x.shadowColor = 'transparent'; }
          if (l.grad) {
            const tw = x.measureText(l.text).width, th = fs * 1.1, a = ((l.ang ?? 45) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), g = x.createLinearGradient(-(c * tw) / 2, -(sn * th) / 2, (c * tw) / 2, (sn * th) / 2);
            gradStops(l).forEach((cl, i, arr) => g.addColorStop(i / (arr.length - 1), cl));
            x.fillStyle = g;
          } else x.fillStyle = l.color;
          x.fillText(l.text, 0, 0);
          }
        }
        x.restore();
      }
      const blob = await new Promise((res) => cv.toBlob(res, 'image/png'));
      const url = URL.createObjectURL(blob);
      const fname = (skin.name + '-studio').replace(/[^\w\-]+/g, '_') + '.png';
      const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">✅ Your skin is ready!</h3><img src="${url}" style="border-radius:10px;margin:10px 0;background:#0b0f20"><a class="btn" id="dl" href="${url}" download="${esc(fname)}" style="width:100%">⬇ Download PNG</a><p class="mut small c" style="margin-top:10px">ডাউনলোড না হলে উপরের বাটনে চাপুন${pre.credits !== null ? ' · Balance: ' + pre.credits : ''}</p>`, { wide: true });
      ov.querySelector('#dl').click();
    } catch (e) { toast(e.message, 'err'); }
    btn.disabled = false; btn.textContent = old;
  };

  /* ---------- design file (save / open) + hydrate ---------- */
  const num = (v, d, a, b) => (Number.isFinite(+v) ? clamp(+v, a, b) : d);
  const col = (v, d) => (/^#[0-9a-f]{3,8}$/i.test(String(v)) ? String(v) : d);
  // ফাইল/template/draft থেকে আসা layer নিরাপদ করে তোলে; asset না থাকলে বাদ
  const procFields = (l) => ({
    ...(Array.isArray(l.cr) && l.cr.length === 4 && l.cr.every((v) => Number.isFinite(+v)) ? { cr: l.cr.map((v) => num(v, 0, 0, 0.95)) } : {}),
    ...(l.bgt ? { bgt: num(l.bgt, 28, 5, 80), bgs: num(l.bgs, 1, 0, 4), bge: num(l.bge, 0, -5, 5) } : {}),
    ...(MASKS.some((m) => m[0] && m[0] === l.mk) ? { mk: l.mk } : {}),
  });
  function hydrate(list) {
    let missing = 0, localSkip = 0;
    const out = [];
    (Array.isArray(list) ? list : []).slice(0, 80).forEach((l) => {
      if (!l || typeof l !== 'object') return;
      if (l.local) { localSkip++; return; }
      const base = { id: nid(), x: num(l.x, 0.5, -0.5, 1.5), y: num(l.y, 0.5, -0.5, 1.5), rot: num(l.rot, 0, -3600, 3600), flip: !!l.flip, op: num(l.op, 1, 0.05, 1), sy: num(l.sy, 1, 0.05, 8) };
      if (l.lock) base.lock = true;
      if (l.nm) base.nm = String(l.nm).slice(0, 30);
      if (PATK.some((k) => k[0] && k[0] === l.pk)) Object.assign(base, { pk: l.pk, pc: col(l.pc, '#000000'), ps: num(l.ps, 0.12, 0.03, 0.6), pa: num(l.pa, 45, 0, 180) });
      if (l.shadow) Object.assign(base, { shadow: true, shc: col(l.shc, '#000000'), shb: num(l.shb, 0.03, 0, 0.1), shx: num(l.shx, 0, -0.1, 0.1), shy: num(l.shy, 0, -0.1, 0.1) });
      if (l.hid) base.hid = true;
      if (l.flv) base.flv = true;
      if (BLENDS.includes(l.bm) && l.bm !== 'normal') base.bm = l.bm;
      if (l.gid) base.gid = String(l.gid).replace(/[^\w-]/g, '').slice(0, 24);
      if (l.t === 'img') {
        const a = assetOf(String(l.aid));
        if (!a) { missing++; return; }
        out.push({ ...base, t: 'img', aid: a.id, url: a.preview, name: a.name, w: num(l.w, 0.3, 0.03, 3), hue: num(l.hue, 0, -180, 180), sat: num(l.sat, 1, 0, 2), bri: num(l.bri, 1, 0.3, 1.7), ...(l.tint ? { tint: true, tna: num(l.tna, 1, 0.1, 1), fill: col(l.fill, '#00e5ff') } : {}), ...(l.grad ? { grad: true, ang: num(l.ang, 45, 0, 360), fill2: col(l.fill2, '#8b5cf6'), g3: !!l.g3, fill3: col(l.fill3, '#ff2e93') } : {}), ...procFields(l) });
      } else if (l.t === 'text') {
        out.push({ ...base, t: 'text', text: String(l.text || '').slice(0, 60), font: String(l.font || fonts()[0]).slice(0, 60), color: col(l.color, '#ffffff'), stroke: col(l.stroke, '#000000'), strokeW: num(l.strokeW, 0.08, 0, 0.6), fs: num(l.fs, 0.08, 0.015, 0.6), ...(l.cv ? { cv: num(l.cv, 0, -100, 100) } : {}), ...(l.grad ? { grad: true, ang: num(l.ang, 45, 0, 360), fill2: col(l.fill2, '#8b5cf6'), g3: !!l.g3, fill3: col(l.fill3, '#ff2e93') } : {}) });
      } else if (l.t === 'shape') {
        out.push({ ...base, t: 'shape', k: SHAPES.some((s) => s[0] === l.k) || (l.k === 'custom' && Array.isArray(l.pts) && l.pts.length >= 3) ? l.k : 'rect',
          ...(l.k === 'custom' && Array.isArray(l.pts) && l.pts.length >= 3 ? { pts: l.pts.slice(0, 40).map((q) => [num(q && q[0], 50, -30, 130), num(q && q[1], 50, -30, 130)]), sm: !!l.sm } : {}), fill: col(l.fill, '#00e5ff'), fill2: col(l.fill2, '#8b5cf6'), fill3: col(l.fill3, '#ff2e93'), g3: !!l.g3, grad: !!l.grad, ang: num(l.ang, 45, 0, 360), stroke: col(l.stroke, '#000000'), sw: num(l.sw, 0, 0, 1), rad: num(l.rad, 0, 0, 0.5), shadow: !!l.shadow, w: num(l.w, 0.25, 0.03, 3) });
      }
    });
    if (missing) toast(`${missing}টি ডিজাইন আর নেই, সেগুলো বাদ দেওয়া হয়েছে`, 'err');
    if (localSkip) toast(`${localSkip}টি নিজের ছবি ফাইলে থাকে না, তাই বাদ গেছে`, 'err');
    return out;
  }
  const common = (l) => ({ x: l.x, y: l.y, rot: l.rot || 0, flip: !!l.flip, op: l.op ?? 1, sy: l.sy || 1, ...(l.hid ? { hid: true } : {}), ...(l.lock ? { lock: true } : {}), ...(l.nm ? { nm: l.nm } : {}), ...(patOn(l) ? { pk: l.pk, pc: l.pc, ps: l.ps, pa: l.pa } : {}), ...(l.flv ? { flv: true } : {}), ...(l.bm && l.bm !== 'normal' ? { bm: l.bm } : {}), ...(l.gid ? { gid: l.gid } : {}), ...(l.shadow ? { shadow: true, shc: l.shc || '#000000', shb: l.shb ?? 0.03, shx: l.shx || 0, shy: l.shy || 0 } : {}) });
  const clean = () => layers.filter((l) => !l.local).map((l) => (l.t === 'img'
    ? { t: 'img', aid: l.aid, w: l.w, hue: l.hue || 0, sat: l.sat ?? 1, bri: l.bri ?? 1, ...(l.tint ? { tint: true, tna: l.tna ?? 1, fill: l.fill || '#00e5ff' } : {}), ...(l.grad ? { grad: true, ang: l.ang ?? 45, fill2: l.fill2 || '#8b5cf6', g3: !!l.g3, fill3: l.fill3 || '#ff2e93' } : {}), ...procFields(l), ...common(l) }
    : l.t === 'shape'
      ? { t: 'shape', k: l.k, ...(l.k === 'custom' ? { pts: l.pts, sm: !!l.sm } : {}), fill: l.fill, fill2: l.fill2, fill3: l.fill3 || '#ff2e93', g3: !!l.g3, grad: !!l.grad, ang: l.ang ?? 45, stroke: l.stroke, sw: l.sw || 0, rad: l.rad || 0, shadow: !!l.shadow, w: l.w, ...common(l) }
      : { t: 'text', text: l.text, font: l.font, color: l.color, stroke: l.stroke, strokeW: l.strokeW, fs: l.fs, ...(l.cv ? { cv: l.cv } : {}), ...(l.grad ? { grad: true, ang: l.ang ?? 45, fill2: l.fill2 || '#8b5cf6', g3: !!l.g3, fill3: l.fill3 || '#ff2e93' } : {}), ...common(l) }));
  function saveFile() {
    if (layers.some((l) => l.local)) toast('নিজের ছবিগুলো ফাইলে সেভ হবে না (শুধু Export এ আসে)', 'err');
    const blob = new Blob([JSON.stringify({ app: 'bussid-studio', v: 2, skinId: skin.id, tpl: tplId, bi: bIdx(), layers: clean() })], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (skin.name + '-design').replace(/[^\w\-]+/g, '_') + '.json';
    a.click();
    toast('ডিজাইন ফাইল সেভ হয়েছে 💾');
  }
  q$('#openF').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      if (f.size > 1e6) throw new Error('ফাইল অনেক বড়');
      const d = JSON.parse(await f.text());
      if (d.app !== 'bussid-studio' || !Array.isArray(d.layers)) throw new Error('এটি Studio এর ডিজাইন ফাইল নয়');
      if (d.tpl && (S.templates || []).some((t) => t.id === d.tpl)) tplId = d.tpl;
      mutate(() => { layers = hydrate(d.layers); sel = null; msel.clear(); baseIdx = clamp(Math.floor(+d.bi || 0), 0, layers.length); });
      toast('ডিজাইন খোলা হয়েছে 📂');
    } catch (er) { toast(er.message || 'ফাইল পড়া যায়নি', 'err'); }
  };
  if (opts.admin && q$('#tpSave')) {
    q$('#tpSave').onclick = async (ev) => {
      const name = q$('#tpName').value.trim();
      if (!name) return toast('Template এর নাম দিন', 'err');
      if (!layers.length) return toast('কোনো ডিজাইন যোগ করা হয়নি', 'err');
      const b = ev.currentTarget; b.disabled = true;
      try { await opts.admin.onSave({ name, category: q$('#tpCat').value.trim(), price: Math.max(0, Math.floor(+q$('#tpPrice').value || 0)), layers: clean() }); } catch (e) { toast(e.message, 'err'); }
      b.disabled = false;
    };
  }

  /* ---------- init ---------- */
  if (opts.template) layers = hydrate(opts.template.layers);
  else if (!opts.admin) {
    try {
      const d = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(d) && d.length) { layers = hydrate(d); if (layers.length) toast('আগের ডিজাইন ফিরিয়ে আনা হয়েছে (Clear all চাপলে নতুন শুরু)'); }
    } catch (e) {}
  }
  renderStage(); tools(); cost(); panel(); applyZ(); renderPal(); zonesOverlay();
  H.onAssets(() => { if (['text', 'vshape', 'img', 'layers'].indexOf(tab) < 0) panel(); cost(); });
  return {
    destroy() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onRes);
      clearInterval(verTimer); verSnap();
      document.fonts && document.fonts.removeEventListener && document.fonts.removeEventListener('loadingdone', onFontsDone);
      layers.forEach((l) => l.local && l.url && URL.revokeObjectURL(l.url));
      locals.forEach((_, u) => URL.revokeObjectURL(u)); locals.clear();
      procCache.forEach((v) => URL.revokeObjectURL(v.url)); procCache.clear();
    },
  };
}
