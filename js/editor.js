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
const SHORT = { banner: 'Banner', shape: 'Pack', name: 'Name', accessory: 'Parts', sticker: 'Sticker', pattern: 'Pattern', logo: 'Logo', fav: 'Fav', vshape: 'Shapes', text: 'Text', img: 'Image', layers: 'Layers' };
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
export function shapeD(l) {
  if (l.k === 'rect' || !PATHS[l.k]) {
    const r = Math.min(0.5, Math.max(0, +l.rad || 0)) * 100;
    return r < 0.1 ? 'M0,0H100V100H0Z' : `M${r},0H${100 - r}A${r},${r} 0 0 1 100,${r}V${100 - r}A${r},${r} 0 0 1 ${100 - r},100H${r}A${r},${r} 0 0 1 0,${100 - r}V${r}A${r},${r} 0 0 1 ${r},0Z`;
  }
  return PATHS[l.k];
}
const hexc = (v, d) => (/^#[0-9a-f]{3,8}$/i.test(String(v)) ? String(v) : d);
export const BLENDS = ['normal', 'multiply', 'darken', 'lighten', 'overlay', 'screen', 'soft-light', 'hard-light', 'color-dodge', 'color-burn', 'difference', 'exclusion'];
export const gradStops = (l) => [hexc(l.t === 'text' ? l.color : l.fill, '#00e5ff'), hexc(l.fill2, '#8b5cf6'), ...(l.g3 ? [hexc(l.fill3, '#ff2e93')] : [])];
export function shapeSvg(l, swCss, gid = 'g') {
  const a = ((Number.isFinite(+l.ang) ? +l.ang : 45) * Math.PI) / 180, c = Math.cos(a) * 50, s = Math.sin(a) * 50;
  const f1 = hexc(l.fill, '#00e5ff'), st = gradStops(l);
  const grad = l.grad ? `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${(50 - c).toFixed(2)}" y1="${(50 - s).toFixed(2)}" x2="${(50 + c).toFixed(2)}" y2="${(50 + s).toFixed(2)}">${st.map((cl, i) => `<stop offset="${i / (st.length - 1)}" stop-color="${cl}"/>`).join('')}</linearGradient></defs>` : '';
  const sk = +l.sw > 0 ? ` stroke="${hexc(l.stroke, '#000000')}" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke-width:${swCss}"` : '';
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;display:block;overflow:visible">${grad}<path d="${shapeD(l)}" fill="${l.grad ? `url(#${gid})` : f1}" fill-rule="${l.k === 'ring' ? 'evenodd' : 'nonzero'}"${sk}/></svg>`;
}

/* ---------- Template / design mini preview (user + admin দুই জায়গাতেই) ---------- */
let miniSeq = 0;
export function miniLayersHtml(list, assetOf, esc) {
  const n = (v, d) => (Number.isFinite(+v) ? +v : d);
  return (list || []).map((l) => {
    if (!l || l.hid) return '';
    const sy = n(l.sy, 1), fl = l.flip ? -1 : 1, fv = l.flv ? -1 : 1, bmx = l.bm && BLENDS.includes(l.bm) && l.bm !== 'normal' ? `;mix-blend-mode:${l.bm}` : '';
    const pos = `left:${(n(l.x, 0.5) * 100).toFixed(2)}%;top:${(n(l.y, 0.5) * 100).toFixed(2)}%;opacity:${n(l.op, 1)}${bmx}`;
    const tr = `translate(-50%,-50%) rotate(${n(l.rot, 0)}deg)`;
    if (l.t === 'img') {
      const a = assetOf(l.aid);
      return a ? `<div class="ml" style="${pos};transform:${tr};width:${(n(l.w, 0.3) * 100).toFixed(2)}%"><img src="${esc(a.preview)}" alt="" style="transform:scale(${fl},${sy * fv});filter:${filt(l) || 'none'}"></div>` : '';
    }
    if (l.t === 'shape') {
      const w = n(l.w, 0.25);
      return `<div class="ml" style="${pos};transform:${tr};width:${(w * 100).toFixed(2)}%;aspect-ratio:1/${sy}${l.shadow ? ';filter:drop-shadow(0 0 1.5cqw rgba(0,0,0,.7))' : ''}"><div style="width:100%;height:100%${fl < 0 || fv < 0 ? `;transform:scale(${fl},${fv})` : ''}">${shapeSvg(l, (n(l.sw, 0) * w * 100).toFixed(2) + 'cqw', 'mg' + ++miniSeq)}</div></div>`;
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
const DEF = { op: 1, sy: 1, hue: 0, sat: 1, bri: 1, ang: 45, sw: 0, rad: 0, grad: false, shadow: false, fill: '#00e5ff', fill2: '#8b5cf6', fill3: '#ff2e93', g3: false, stroke: '#000000', bm: 'normal' };
// [selector, layer key, allowed types (null = সব), kind: n=number s=string b=bool]
const BIND = [
  ['#op', 'op', null, 'n'], ['#sy', 'sy', null, 'n'], ['#bm', 'bm', null, 's'],
  ['#tt', 'text', ['text'], 's'], ['#tf', 'font', ['text'], 's'], ['#tc', 'color', ['text'], 's'], ['#ts', 'stroke', ['text'], 's'], 
  ['#rh', 'hue', ['img'], 'n'], ['#rs', 'sat', ['img'], 'n'], ['#rb', 'bri', ['img'], 'n'],
  ['#sf', 'fill', ['shape'], 's'], ['#sg', 'grad', ['shape', 'text'], 'b'], ['#sf2', 'fill2', ['shape', 'text'], 's'], ['#sg3', 'g3', ['shape', 'text'], 'b'], ['#sf3', 'fill3', ['shape', 'text'], 's'], ['#sa', 'ang', ['shape', 'text'], 'n'],
  ['#ss', 'stroke', ['shape'], 's'], ['#sh', 'shadow', ['shape'], 'b'],
];

const stepper = (id, label) => `<span class="inl stp" id="${id}"><label class="mut small">${label}</label><button class="tb" data-s="-1">−</button><b class="sv">0</b><button class="tb" data-s="1">＋</button>${[0, 2, 4, 6, 8, 10, 15, 20].map((v) => `<button class="tb wide" data-v="${v}">${v}</button>`).join('')}</span>`;

export function mountStudio(root, skin, H, opts = {}) {
  const { S, esc, toast, modal } = H;
  const q$ = (s, r = root) => r.querySelector(s);
  const qa = (s, r = root) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mob = () => window.matchMedia('(max-width:860px)').matches;
  const key = 'studio:' + skin.id + (opts.template ? ':' + opts.template.id : '');
  let layers = [], sel = null, hist = [], fut = [], tab = 'banner', query = '', liveSnap = null, drag = null, snap0 = null;
  const pts = new Map(), vpts = new Map(), msel = new Set(), locals = new Map();
  let vz = null, baseHid = false;
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
  const tabs = [['vshape', '▲', 'Shapes'], ['text', '✏', 'Text'], ...(opts.admin ? [] : [['img', '🖼', 'My image']]), ...KINDS, ...(H.toggleFav ? [['fav', '⭐', 'Favorites']] : []), ['layers', '☰', 'Layers']];
  root.innerHTML = `<div class="wrap studio" data-drawer="">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px"><a href="${opts.admin ? '#/templates' : '#/studio'}" class="mut small">← Back</a><h2 class="grad" style="font-size:20px">${esc(skin.name)}</h2>${opts.admin ? '<span class="badge new">TEMPLATE BUILDER</span>' : opts.own ? '<span class="badge free">MY PNG</span>' : `<span class="badge ${skin.type}">${skin.type === 'paid' ? '⚡ ' + skin.price + ' CR' : 'FREE'}</span>`}${opts.template ? `<span class="badge paid">TEMPLATE: ${esc(opts.template.name)}</span>` : ''}</div>
    <nav class="rail" id="rail">${tabs.map((t) => `<button class="rl" data-rt="${t[0]}" title="${t[2]}"><span>${t[1]}</span><small>${SHORT[t[0]] || t[2]}</small></button>`).join('')}<i class="rsep"></i><button class="rl" data-ract="tools" title="Tools"><span>🛠</span><small>Tools</small></button><button class="rl" data-ract="undo"><span>↶</span><small>Undo</small></button><button class="rl" data-ract="redo"><span>↷</span><small>Redo</small></button><button class="rl go" data-ract="export"><span>⬇</span><small>${opts.admin ? 'Save' : 'Export'}</small></button></nav>
    <div class="st-grid">
      <aside class="card st-side"><button class="dclose" data-dc>✕</button><div class="st-tabs" id="tabs">${tabs.map((t) => `<button class="st-tab" data-t="${t[0]}" title="${t[2]}"><span>${t[1]}</span><small>${t[2]}</small></button>`).join('')}</div><div class="st-body" id="panel"></div></aside>
      <section class="st-main">
        <div class="card st-tools" id="tools"><button class="dclose" data-dc>✕</button>
          <button class="tb" data-act="undo" title="Undo (Ctrl+Z)">↶</button><button class="tb" data-act="redo" title="Redo">↷</button><i class="vsep"></i>
          <button class="tb" data-act="dup" title="Duplicate">⧉</button><button class="tb" data-act="flip" title="বাম↔ডান উল্টানো (Mirror)">⇋</button><button class="tb" data-act="flipv" title="উপর↕নিচ উল্টানো">⇅</button><button class="tb" data-act="up" title="Bring forward">⬆</button><button class="tb" data-act="down" title="Send back">⬇</button><button class="tb" data-act="del" title="Delete">🗑</button><i class="vsep"></i>
          <label class="mut small">Opacity</label><input type="range" id="op" min="0.1" max="1" step="0.05" value="1" style="width:100px">
          <label class="mut small">Blend</label><select class="inp" id="bm" style="width:auto;padding:6px 8px">${BLENDS.map((b) => `<option>${b}</option>`).join('')}</select>
          <label class="mut small" title="উপর-নিচে টানা / চাপা">↕ Stretch</label><input type="range" id="sy" min="0.2" max="4" step="0.05" value="1" style="width:100px"><button class="tb wide" id="syr" title="Stretch রিসেট">1×</button><i class="vsep"></i>
          <button class="tb wide on" data-act="snap" title="Snap / Guide লাইন">🧲 Snap</button><button class="tb wide" data-act="clear">Clear all</button><button class="tb wide" data-act="save" title="ডিজাইন ফাইল হিসেবে সেভ">💾 Save</button><button class="tb wide" data-act="open" title="সেভ করা ডিজাইন ফাইল খুলুন">📂 Open</button><input type="file" id="openF" accept=".json,application/json" class="hide">
          <div id="tctl" class="hide st-text">
            <input class="inp" id="tt" placeholder="লেখা…" maxlength="40">
            <select class="inp" id="tf"></select>
            <input class="inp" type="color" id="tc" title="Text color"><input class="inp" type="color" id="ts" title="Outline color">
          </div>
          <div id="rctl" class="hide st-text"><b class="mut small">🎨 COLOR</b><label class="mut small">Hue</label><input type="range" id="rh" min="-180" max="180" step="1"><label class="mut small">Saturation</label><input type="range" id="rs" min="0" max="2" step="0.05"><label class="mut small">Brightness</label><input type="range" id="rb" min="0.3" max="1.7" step="0.05"><button class="tb wide" id="rr">Reset</button></div>
          <div id="bctl" class="hide st-text">${stepper('bdc', 'Border')}</div>
          <div id="gctl" class="hide st-text"><b class="mut small">🌈 GRADIENT</b>
            <label class="chk mut small"><input type="checkbox" id="sg"> On</label>
            <span id="sgw" class="inl hide"><input class="inp" type="color" id="sf2" title="Color 2"><label class="chk mut small"><input type="checkbox" id="sg3"> +Color</label><input class="inp hide" type="color" id="sf3" title="Color 3"><label class="mut small">Angle</label><input type="range" id="sa" min="0" max="360" step="5"></span>
          </div>
          <div id="shctl" class="hide st-text"><b class="mut small">◆ SHAPE</b>
            <span class="inl"><label class="mut small">Color</label><input class="inp" type="color" id="sf"></span>
            <span class="inl"><label class="mut small">Border color</label><input class="inp" type="color" id="ss"></span>
            <span id="srw" class="inl hide">${stepper('rdc', 'Corner')}</span>
            <label class="chk mut small"><input type="checkbox" id="sh"> Shadow</label>
          </div>
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
    Object.assign(el.style, { mixBlendMode: l.bm && l.bm !== 'normal' ? l.bm : '', display: l.hid ? 'none' : '', left: l.x * 100 + '%', top: l.y * 100 + '%', transform: `translate(-50%,-50%) rotate(${l.rot || 0}deg)`, opacity: l.op ?? 1 });
    const inn = el.firstChild;
    el.classList.toggle('tl', l.t === 'text');
    if (l.t === 'text') {
      el.classList.remove('fx'); el.style.width = 'auto'; el.style.aspectRatio = '';
      const fs = l.fs * W;
      el.style.height = fs * 1.1 * sy + 'px';
      Object.assign(inn.style, { fontSize: fs + 'px', fontFamily: `"${l.font}",sans-serif`, color: l.color, fontWeight: 800, webkitTextStroke: l.strokeW > 0 ? l.strokeW * fs + 'px ' + l.stroke : '0', paintOrder: 'stroke fill', transform: `scale(${fl},${sy * fv})` });
      if (l.grad) Object.assign(inn.style, { background: `linear-gradient(${(l.ang ?? 45) + 90}deg,${gradStops(l).join(',')})`, webkitBackgroundClip: 'text', backgroundClip: 'text', webkitTextFillColor: 'transparent' });
      else Object.assign(inn.style, { background: '', webkitBackgroundClip: '', backgroundClip: '', webkitTextFillColor: '' });
      inn.textContent = l.text;
    } else if (l.t === 'shape') {
      el.classList.add('fx'); el.style.width = l.w * 100 + '%'; el.style.height = ''; el.style.aspectRatio = '1 / ' + sy;
      inn.style.transform = fl < 0 || fv < 0 ? `scale(${fl},${fv})` : '';
      inn.style.filter = l.shadow ? `drop-shadow(0 0 ${0.03 * W}px rgba(0,0,0,.7))` : '';
      inn.innerHTML = shapeSvg(l, (l.sw || 0) * l.w * W + 'px', 'g' + l.id);
    } else {
      el.style.width = l.w * 100 + '%'; el.style.height = '';
      if (l.nar) { el.classList.add('fx'); el.style.aspectRatio = '1 / ' + l.nar * sy; } else { el.classList.remove('fx'); el.style.aspectRatio = ''; }
      inn.style.transform = fl < 0 || fv < 0 ? `scale(${fl},${fv})` : ''; inn.style.filter = filt(l);
    }
    el.classList.toggle('sel', l.id === sel);
    el.classList.toggle('gm', !!l.gid && !!c && c.gid === l.gid && l.id !== sel);
    el.style.setProperty('--gc', l.gid ? gcol(l.gid) : 'transparent');
  }
  function renderStage() {
    qa('.ly', stg).forEach((e) => e.remove());
    layers.forEach((l) => {
      const el = document.createElement('div');
      el.className = 'ly'; el.dataset.id = l.id;
      el.innerHTML = `<div class="in ${l.t === 'text' ? 'tx' : ''}">${l.t === 'img' ? '<img draggable="false" alt="">' : ''}</div><i class="hs"></i><i class="hr"></i>`;
      if (l.t === 'img') {
        const im = el.querySelector('img'), id = l.id;
        im.onload = () => { const L = layers.find((x) => x.id === id); if (L && im.naturalWidth && !L.nar) { L.nar = im.naturalHeight / im.naturalWidth; const e2 = elOf(id); e2 && place(e2, L); } };
        im.src = l.url;
      }
      el.onpointerdown = (e) => down(e, l.id, 'move');
      el.querySelector('.hs').onpointerdown = (e) => down(e, l.id, 'scale');
      el.querySelector('.hr').onpointerdown = (e) => down(e, l.id, 'rot');
      stg.appendChild(el);
      place(el, l);
    });
  }
  function refreshSel() { layers.forEach((l) => { const el = elOf(l.id); el && place(el, l); }); tools(); if (tab === 'layers') panel(); }

  /* ---------- history ---------- */
  const save = () => { if (opts.admin) return; try { localStorage.setItem(key, JSON.stringify(layers.filter((l) => !l.local))); } catch (e) {} };
  function push(before) { hist.push(before); if (hist.length > 60) hist.shift(); fut = []; }
  function full() { renderStage(); tools(); cost(); if (tab === 'layers') panel(); save(); }
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
    mutate(() => { const l = { id: nid(), t: 'shape', k, fill: '#00e5ff', fill2: '#8b5cf6', grad: false, ang: 45, stroke: '#000000', sw: 0, rad: 0, shadow: false, x: 0.5, y: 0.5, w: 0.25, sy: 1, rot: 0, flip: false, op: 1 }; layers.push(l); sel = l.id; });
    afterAdd(true);
  }
  function addLocal(f) {
    const url = URL.createObjectURL(f);
    mutate(() => { const l = { id: nid(), t: 'img', local: true, aid: '', url, name: f.name || 'My image', x: 0.5, y: 0.5, w: 0.4, sy: 1, rot: 0, flip: false, op: 1 }; locals.set(l.id, f); layers.push(l); sel = l.id; });
    afterAdd(false);
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
      if (m.local && locals.has(m.id)) locals.set(c.id, locals.get(m.id));
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
    rdc: { get: (l) => Math.round((l.rad || 0) * 100), set: (l, v) => { l.rad = clamp(v, 0, 50) / 100; } },
  };
  Object.entries(STEP).forEach(([id, st]) => {
    qa('#' + id + ' button').forEach((b) => (b.onclick = () => {
      const l = cur(); if (!l) return;
      mutate(() => st.set(l, b.dataset.v !== undefined ? +b.dataset.v : st.get(l) + +b.dataset.s));
    }));
  });
  q$('#syr').onclick = () => { const l = cur(); if (l) mutate(() => { l.sy = 1; }); };
  q$('#rr').onclick = () => { const l = cur(); if (l && l.t === 'img') mutate(() => { l.hue = 0; l.sat = 1; l.bri = 1; }); };
  function tools() {
    const l = cur(), t = l && l.t;
    q$('#tctl').classList.toggle('hide', t !== 'text');
    q$('#rctl').classList.toggle('hide', t !== 'img');
    q$('#shctl').classList.toggle('hide', t !== 'shape');
    q$('#gctl').classList.toggle('hide', !(t === 'shape' || t === 'text'));
    q$('#bctl').classList.toggle('hide', !(t === 'shape' || t === 'text'));
    if (l) {
      BIND.forEach(([id, k, types, kind]) => {
        if (types && !types.includes(l.t)) return;
        const el = q$(id), v = l[k] ?? DEF[k] ?? '';
        if (kind === 'b') el.checked = !!v; else if (document.activeElement !== el) el.value = v;
      });
      q$('#sgw').classList.toggle('hide', !((t === 'shape' || t === 'text') && l.grad));
      q$('#sf3').classList.toggle('hide', !l.g3);
      if (t === 'shape' || t === 'text') q$('#bdc .sv').textContent = STEP.bdc.get(l);
      if (t === 'shape' && l.k === 'rect') q$('#rdc .sv').textContent = STEP.rdc.get(l);
      q$('#srw').classList.toggle('hide', !(t === 'shape' && l.k === 'rect'));
    } else { q$('#op').value = 1; q$('#sy').value = 1; }
    qa('[data-act="undo"]')[0].disabled = !hist.length;
    qa('[data-act="redo"]')[0].disabled = !fut.length;
  }

  /* ---------- pointer: move / scale / rotate / pinch (group সহ) ---------- */
  const itemsOf = (l) => members(l).map((o) => ({ o, x0: o.x, y0: o.y, w0: o.w, fs0: o.fs, rot0: o.rot || 0 }));
  const centroid = (items) => ({ x: items.reduce((s, i) => s + i.x0, 0) / items.length, y: items.reduce((s, i) => s + i.y0, 0) / items.length });
  function down(e, id, mode) {
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
    drag = { mode, px0: e.clientX, py0: e.clientY, items, cx: c.x, cy: c.y, pcx, pcy, d0: Math.hypot(e.clientX - pcx, e.clientY - pcy) || 1, a0: Math.atan2(e.clientY - pcy, e.clientX - pcx) };
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
      p.innerHTML = `<p class="mut small" style="margin-bottom:10px">যেকোনো shape ট্যাপ করুন। তারপর Tools থেকে রং, gradient, outline, ↕ Stretch (চ্যাপ্টা/লম্বা) বদলান।</p><div class="vgrid">${SHAPES.map(([k, n]) => `<button class="vs" data-k="${k}" title="${n}">${shapeSvg({ k, fill: '#00e5ff', fill2: '#8b5cf6', grad: true, ang: 45, sw: 0, rad: 0.12 }, '0', 'vp' + k)}<small>${n}</small></button>`).join('')}</div>`;
      qa('.vs', p).forEach((b) => (b.onclick = () => addShape(b.dataset.k)));
      return;
    }
    if (tab === 'text') {
      p.innerHTML = `<p class="mut small" style="margin-bottom:12px">নিজের নাম বা যেকোনো লেখা যোগ করুন। যোগ করার পর Tools এ লেখা, ফন্ট, রং ও ↕ Stretch বদলানো যাবে।</p><button class="btn" id="addTx" style="width:100%">＋ Add text</button>`;
      q$('#addTx').onclick = addText;
      return;
    }
    if (tab === 'img') {
      p.innerHTML = `<p class="mut small" style="margin-bottom:12px">নিজের ছবি/লোগো (PNG, JPG, WEBP) যোগ করুন। 🔒 ফাইল আপলোড হয় না — শুধু আপনার ব্রাউজারে থাকে। ফাইলের ডিজাইন Save-এ ছবি থাকবে না, শুধু Export এ আসবে।</p><label class="btn" style="width:100%;cursor:pointer">🖼 ছবি বেছে নিন<input type="file" id="locF" accept="image/png,image/jpeg,image/webp" class="hide" multiple></label>`;
      q$('#locF').onchange = (e) => {
        [...e.target.files].slice(0, 10).forEach((f) => {
          if (!/^image\/(png|jpeg|webp)$/.test(f.type)) return toast('শুধু PNG/JPG/WEBP', 'err');
          if (f.size > 15 * 1024 * 1024) return toast(f.name + ' — ১৫MB এর বেশি', 'err');
          addLocal(f);
        });
        e.target.value = '';
      };
      return;
    }
    if (tab === 'layers') {
      const act2 = `<div class="lact"><button class="btn sm" id="gM">🔗 Merge</button><button class="btn ghost sm" id="gS">Ungroup</button><button class="btn ghost sm" id="gC">⧉ Copy</button><button class="btn danger sm" id="gD">🗑 Delete</button></div><p class="mut small" style="margin:6px 0 10px">২+ layer টিক দিয়ে <b>Merge</b> চাপলে সেগুলো একসাথে সরবে, বড়-ছোট হবে ও ঘুরবে। 👁 দিয়ে hide/show।</p>`;
      p.innerHTML = act2 + (layers.length ? [...layers].reverse().map((l) => `<div class="lrow ${l.id === sel ? 'on' : ''} ${l.hid ? 'hid' : ''}" data-id="${l.id}"><input type="checkbox" class="chk" data-m ${msel.has(l.id) ? 'checked' : ''}><span class="lth">${l.t === 'img' ? `<img src="${esc(l.url)}" alt="">` : l.t === 'shape' ? shapeSvg({ ...l, sw: 0 }, '0', 'lt' + l.id) : 'T'}</span><span class="lnm">${esc(l.t === 'text' ? l.text : l.t === 'shape' ? (SHAPES.find((s) => s[0] === l.k) || [0, 'Shape'])[1] : l.name)}</span>${l.gid ? `<i class="gtag" style="background:${gcol(l.gid)}" title="Group"></i>` : ''}<button class="lck" data-u title="উপরে আনুন">▲</button><button class="lck" data-dn title="নিচে নামান">▼</button><button class="lck" data-h title="Hide / Show">${l.hid ? '🚫' : '👁'}</button><button class="lck" data-x title="Delete">🗑</button></div>`).join('') : '<p class="mut small">কোনো layer নেই। ডিজাইন, Shape বা Text যোগ করুন।</p>') + `<div class="lrow base ${baseHid ? 'hid' : ''}"><span class="lth"><img src="${esc(skin.preview)}" alt=""></span><span class="lnm">${opts.own ? 'Imported skin (base)' : 'Base skin'}</span><button class="lck" data-bh title="Hide / Show">${baseHid ? '🚫' : '👁'}</button></div>`;
      q$('#gM', p).onclick = mergeSel; q$('#gS', p).onclick = splitSel; q$('#gD', p).onclick = delSel; q$('#gC', p).onclick = copyTicked;
      q$('[data-bh]', p).onclick = () => { baseHid = !baseHid; base.style.visibility = baseHid ? 'hidden' : ''; panel(); };
      qa('.lrow[data-id]', p).forEach((r) => {
        const mv = (d) => mutate(() => { const i = layers.findIndex((x) => x.id === r.dataset.id), j = i + d; if (i >= 0 && j >= 0 && j < layers.length) [layers[i], layers[j]] = [layers[j], layers[i]]; });
        r.querySelector('[data-u]').onclick = (e) => { e.stopPropagation(); mv(1); };
        r.querySelector('[data-dn]').onclick = (e) => { e.stopPropagation(); mv(-1); };
      });
      qa('.lrow[data-id]', p).forEach((r) => {
        const id = r.dataset.id;
        r.onclick = () => { sel = id; refreshSel(); };
        r.querySelector('[data-m]').onclick = (e) => { e.stopPropagation(); e.target.checked ? msel.add(id) : msel.delete(id); };
        r.querySelector('[data-h]').onclick = (e) => { e.stopPropagation(); const l = layers.find((x) => x.id === id); l && mutate(() => { l.hid = !l.hid; }); };
        r.querySelector('[data-x]').onclick = (e) => { e.stopPropagation(); mutate(() => { layers = layers.filter((x) => x.id !== id); msel.delete(id); if (!cur()) sel = null; }); };
      });
      return;
    }
    const favs = H.favs ? H.favs() : {};
    const list = S.assets.filter((a) => (tab === 'fav' ? favs[a.id] : a.kind === tab) && (!query || (a.name || '').toLowerCase().includes(query.toLowerCase())));
    p.innerHTML = `<input class="inp" id="aq" placeholder="🔍 Search…" value="${esc(query)}" style="margin-bottom:10px">${list.length ? `<div class="agrid">${list.map((a) => `<div class="ai" draggable="true" data-id="${a.id}" title="${esc(a.name)}"><img loading="lazy" src="${esc(a.preview)}" alt=""><span class="badge ${a.type}">${a.type === 'paid' ? '⚡' + a.price : 'FREE'}</span>${H.toggleFav ? `<button class="fv ${favs[a.id] ? 'on' : ''}" data-f="${a.id}" title="Favorite">★</button>` : ''}</div>`).join('')}</div>` : `<p class="mut small" style="padding:16px 4px">${tab === 'fav' ? 'যেকোনো ডিজাইনের ★ চাপলে এখানে জমা হবে।' : 'এই ক্যাটাগরিতে এখনো কিছু নেই।'}</p>`}`;
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
    if (l.grad) {
      const a = ((l.ang ?? 45) * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
      const g = x.createLinearGradient(w / 2 - (c * w) / 2, h / 2 - (s * h) / 2, w / 2 + (c * w) / 2, h / 2 + (s * h) / 2);
      gradStops(l).forEach((cl, i, arr) => g.addColorStop(i / (arr.length - 1), cl));
      x.fillStyle = g;
    } else x.fillStyle = l.fill;
    if (l.shadow) { x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 0.03 * W; }
    x.fill(p, rule);
    x.shadowColor = 'transparent'; x.shadowBlur = 0;
    if (l.sw > 0) { x.lineJoin = 'round'; x.lineWidth = l.sw * w; x.strokeStyle = l.stroke; x.stroke(p); }
  }
  if (q$('#exp')) q$('#exp').onclick = async (ev) => {
    const btn = ev.currentTarget;
    if (!S.user) return H.loginModal('Login করে Export করুন');
    const vis = layers.filter((l) => !l.hid);
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
      await Promise.all(vis.filter((l) => l.local).map(async (l) => { lbm[l.id] = await createImageBitmap(locals.get(l.id)); }));
      const W = baseBmp.width, Hh = baseBmp.height;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
      const x = cv.getContext('2d');
      if (!baseHid) x.drawImage(baseBmp, 0, 0);
      await Promise.all(vis.filter((l) => l.t === 'text').map((l) => H.ensureFont(l.font)));
      for (const l of vis) {
        const sy = l.sy || 1;
        x.save();
        x.globalAlpha = l.op ?? 1;
        if (l.bm && l.bm !== 'normal') x.globalCompositeOperation = l.bm;
        x.translate(l.x * W, l.y * Hh);
        x.rotate(((l.rot || 0) * Math.PI) / 180);
        if (l.t === 'img') {
          const b0 = l.local ? lbm[l.id] : map[l.aid]; if (!b0) { x.restore(); continue; }
          const b = filt(l) ? recolor(b0, l) : b0, w = l.w * W, h = w * (b0.height / b0.width) * sy;
          x.scale(l.flip ? -1 : 1, l.flv ? -1 : 1);
          x.drawImage(b, -w / 2, -h / 2, w, h);
        } else if (l.t === 'shape') {
          x.scale(l.flip ? -1 : 1, l.flv ? -1 : 1);
          drawShape(x, l, W);
        } else {
          const fs = l.fs * W;
          x.scale(l.flip ? -1 : 1, sy * (l.flv ? -1 : 1));
          x.font = `800 ${fs}px "${l.font}", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
          if (l.strokeW > 0) { x.lineJoin = 'round'; x.lineWidth = fs * l.strokeW; x.strokeStyle = l.stroke; x.strokeText(l.text, 0, 0); }
          if (l.grad) {
            const tw = x.measureText(l.text).width, th = fs * 1.1, a = ((l.ang ?? 45) * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), g = x.createLinearGradient(-(c * tw) / 2, -(sn * th) / 2, (c * tw) / 2, (sn * th) / 2);
            gradStops(l).forEach((cl, i, arr) => g.addColorStop(i / (arr.length - 1), cl));
            x.fillStyle = g;
          } else x.fillStyle = l.color;
          x.fillText(l.text, 0, 0);
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
  function hydrate(list) {
    let missing = 0, localSkip = 0;
    const out = [];
    (Array.isArray(list) ? list : []).slice(0, 80).forEach((l) => {
      if (!l || typeof l !== 'object') return;
      if (l.local) { localSkip++; return; }
      const base = { id: nid(), x: num(l.x, 0.5, -0.5, 1.5), y: num(l.y, 0.5, -0.5, 1.5), rot: num(l.rot, 0, -3600, 3600), flip: !!l.flip, op: num(l.op, 1, 0.05, 1), sy: num(l.sy, 1, 0.2, 4) };
      if (l.hid) base.hid = true;
      if (l.flv) base.flv = true;
      if (BLENDS.includes(l.bm) && l.bm !== 'normal') base.bm = l.bm;
      if (l.gid) base.gid = String(l.gid).replace(/[^\w-]/g, '').slice(0, 24);
      if (l.t === 'img') {
        const a = assetOf(String(l.aid));
        if (!a) { missing++; return; }
        out.push({ ...base, t: 'img', aid: a.id, url: a.preview, name: a.name, w: num(l.w, 0.3, 0.03, 3), hue: num(l.hue, 0, -180, 180), sat: num(l.sat, 1, 0, 2), bri: num(l.bri, 1, 0.3, 1.7) });
      } else if (l.t === 'text') {
        out.push({ ...base, t: 'text', text: String(l.text || '').slice(0, 60), font: String(l.font || fonts()[0]).slice(0, 60), color: col(l.color, '#ffffff'), stroke: col(l.stroke, '#000000'), strokeW: num(l.strokeW, 0.08, 0, 0.6), fs: num(l.fs, 0.08, 0.015, 0.6), ...(l.grad ? { grad: true, ang: num(l.ang, 45, 0, 360), fill2: col(l.fill2, '#8b5cf6'), g3: !!l.g3, fill3: col(l.fill3, '#ff2e93') } : {}) });
      } else if (l.t === 'shape') {
        out.push({ ...base, t: 'shape', k: SHAPES.some((s) => s[0] === l.k) ? l.k : 'rect', fill: col(l.fill, '#00e5ff'), fill2: col(l.fill2, '#8b5cf6'), fill3: col(l.fill3, '#ff2e93'), g3: !!l.g3, grad: !!l.grad, ang: num(l.ang, 45, 0, 360), stroke: col(l.stroke, '#000000'), sw: num(l.sw, 0, 0, 1), rad: num(l.rad, 0, 0, 0.5), shadow: !!l.shadow, w: num(l.w, 0.25, 0.03, 3) });
      }
    });
    if (missing) toast(`${missing}টি ডিজাইন আর নেই, সেগুলো বাদ দেওয়া হয়েছে`, 'err');
    if (localSkip) toast(`${localSkip}টি নিজের ছবি ফাইলে থাকে না, তাই বাদ গেছে`, 'err');
    return out;
  }
  const common = (l) => ({ x: l.x, y: l.y, rot: l.rot || 0, flip: !!l.flip, op: l.op ?? 1, sy: l.sy || 1, ...(l.hid ? { hid: true } : {}), ...(l.flv ? { flv: true } : {}), ...(l.bm && l.bm !== 'normal' ? { bm: l.bm } : {}), ...(l.gid ? { gid: l.gid } : {}) });
  const clean = () => layers.filter((l) => !l.local).map((l) => (l.t === 'img'
    ? { t: 'img', aid: l.aid, w: l.w, hue: l.hue || 0, sat: l.sat ?? 1, bri: l.bri ?? 1, ...common(l) }
    : l.t === 'shape'
      ? { t: 'shape', k: l.k, fill: l.fill, fill2: l.fill2, fill3: l.fill3 || '#ff2e93', g3: !!l.g3, grad: !!l.grad, ang: l.ang ?? 45, stroke: l.stroke, sw: l.sw || 0, rad: l.rad || 0, shadow: !!l.shadow, w: l.w, ...common(l) }
      : { t: 'text', text: l.text, font: l.font, color: l.color, stroke: l.stroke, strokeW: l.strokeW, fs: l.fs, ...(l.grad ? { grad: true, ang: l.ang ?? 45, fill2: l.fill2 || '#8b5cf6', g3: !!l.g3, fill3: l.fill3 || '#ff2e93' } : {}), ...common(l) }));
  function saveFile() {
    if (layers.some((l) => l.local)) toast('নিজের ছবিগুলো ফাইলে সেভ হবে না (শুধু Export এ আসে)', 'err');
    const blob = new Blob([JSON.stringify({ app: 'bussid-studio', v: 2, skinId: skin.id, tpl: tplId, layers: clean() })], { type: 'application/json' });
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
      mutate(() => { layers = hydrate(d.layers); sel = null; msel.clear(); });
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
  renderStage(); tools(); cost(); panel(); applyZ();
  H.onAssets(() => { if (['text', 'vshape', 'img', 'layers'].indexOf(tab) < 0) panel(); cost(); });
  return {
    destroy() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onRes);
      layers.forEach((l) => l.local && l.url && URL.revokeObjectURL(l.url));
    },
  };
}
