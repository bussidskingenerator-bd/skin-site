// Skin Studio — drag & drop design editor (কোনো বাইরের লাইব্রেরি ছাড়া)
// Layer এর মান সব অনুপাতে (0..1) রাখা হয়, তাই preview ও full-quality export একই জায়গায় মেলে।

export const KINDS = [
  ['banner', '🏷', 'Banner'],
  ['shape', '◆', 'Shape'],
  ['name', '✍', 'Name design'],
  ['accessory', '🚌', 'Front accessories'],
  ['sticker', '⭐', 'Sticker'],
  ['pattern', '🎨', 'Pattern / Texture'],
  ['logo', '🔰', 'Logo'],
];
const DEF_W = { banner: 0.6, shape: 0.25, name: 0.5, accessory: 0.3, sticker: 0.2, pattern: 1, logo: 0.2 };

export function mountStudio(root, skin, H, opts = {}) {
  const { S, esc, toast, modal } = H;
  const q$ = (s, r = root) => r.querySelector(s);
  const qa = (s, r = root) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const key = 'studio:' + skin.id + (opts.template ? ':' + opts.template.id : '');
  let layers = [], sel = null, hist = [], fut = [], tab = 'banner', query = '', liveSnap = null, drag = null, snap0 = null;
  const pts = new Map();
  let seq = 0;
  const nid = () => 'L' + ++seq + Date.now().toString(36);
  const fonts = () => [...S.fonts.map((f) => f.family), ...H.BASE_FONTS];
  const assetOf = (id) => S.assets.find((a) => a.id === id);
  const cur = () => layers.find((l) => l.id === sel);
  const snap = () => JSON.stringify(layers);

  /* ---------- layout ---------- */
  const tabs = [...KINDS, ['text', '✏', 'Text'], ['layers', '☰', 'Layers']];
  root.innerHTML = `<div class="wrap studio">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px"><a href="${opts.admin ? '#/templates' : '#/studio'}" class="mut small">← Back</a><h2 class="grad" style="font-size:20px">${esc(skin.name)}</h2>${opts.admin ? '<span class="badge new">TEMPLATE BUILDER</span>' : opts.own ? '<span class="badge free">MY PNG</span>' : `<span class="badge ${skin.type}">${skin.type === 'paid' ? '⚡ ' + skin.price + ' CR' : 'FREE'}</span>`}${opts.template ? `<span class="badge paid">TEMPLATE: ${esc(opts.template.name)}</span>` : ''}</div>
    <div class="st-grid">
      <aside class="card st-side"><div class="st-tabs" id="tabs">${tabs.map((t) => `<button class="st-tab" data-t="${t[0]}" title="${t[2]}"><span>${t[1]}</span><small>${t[2]}</small></button>`).join('')}</div><div class="st-body" id="panel"></div></aside>
      <section class="st-main">
        <div class="card st-tools" id="tools">
          <button class="tb" data-act="undo" title="Undo (Ctrl+Z)">↶</button><button class="tb" data-act="redo" title="Redo">↷</button><i class="vsep"></i>
          <button class="tb" data-act="dup" title="Duplicate">⧉</button><button class="tb" data-act="flip" title="Mirror / উল্টানো">⇋</button><button class="tb" data-act="up" title="Bring forward">⬆</button><button class="tb" data-act="down" title="Send back">⬇</button><button class="tb" data-act="del" title="Delete">🗑</button><i class="vsep"></i>
          <label class="mut small">Opacity</label><input type="range" id="op" min="0.1" max="1" step="0.05" value="1" style="width:110px"><i class="vsep"></i>
          <button class="tb wide" data-act="clear">Clear all</button><button class="tb wide" data-act="save" title="ডিজাইন ফাইল হিসেবে সেভ">💾 Save</button><button class="tb wide" data-act="open" title="সেভ করা ডিজাইন ফাইল খুলুন">📂 Open</button><input type="file" id="openF" accept=".json,application/json" class="hide">
          <div id="tctl" class="hide st-text">
            <input class="inp" id="tt" placeholder="লেখা…" maxlength="40">
            <select class="inp" id="tf"></select>
            <input class="inp" type="color" id="tc" title="Text color"><input class="inp" type="color" id="ts" title="Outline color">
            <input type="range" id="tw" min="0" max="0.25" step="0.01" title="Outline" style="width:90px">
          </div>
        </div>
        <div class="card" style="padding:12px"><div class="stage2" id="stg"><img id="base" alt=""></div><p class="c mut small" style="margin-top:8px">টেনে সরান · কোণার ডট দিয়ে বড়-ছোট · উপরের লাল ডট দিয়ে ঘোরান · দুই আঙুলে pinch</p></div>
        ${opts.admin ? `<div class="card st-export"><div style="flex:1;min-width:240px"><span class="mut small">TEMPLATE INFO</span><div class="row" style="margin-top:6px"><input class="inp" id="tpName" maxlength="40" placeholder="Template name" value="${esc((opts.template && opts.template.name) || '')}"><input class="inp" id="tpCat" maxlength="30" placeholder="Category (optional)" value="${esc((opts.template && opts.template.category) || '')}"></div></div><button class="btn big" id="tpSave">💾 Save template</button></div>` : `<div class="card st-export"><div><span class="mut small">EXPORT COST</span><div id="costTx" style="font-family:var(--hf);font-size:18px"></div></div><button class="btn big" id="exp">⬇ Export PNG</button></div>`}
      </section>
    </div></div>`;
  const stg = q$('#stg'), base = q$('#base');
  base.src = skin.preview;
  base.onload = () => { stg.style.aspectRatio = base.naturalWidth + ' / ' + base.naturalHeight; layers.forEach((l) => { const el = elOf(l.id); el && place(el, l); }); };
  q$('#tf').innerHTML = fonts().map((f) => `<option>${esc(f)}</option>`).join('');
  fonts().forEach(H.ensureFont);

  /* ---------- stage render ---------- */
  const elOf = (id) => stg.querySelector(`.ly[data-id="${id}"]`);
  function place(el, l) {
    const W = stg.clientWidth || 600;
    Object.assign(el.style, { left: l.x * 100 + '%', top: l.y * 100 + '%', transform: `translate(-50%,-50%) rotate(${l.rot || 0}deg)`, opacity: l.op ?? 1 });
    const inn = el.firstChild;
    inn.style.transform = l.flip ? 'scaleX(-1)' : '';
    if (l.t === 'img') el.style.width = l.w * 100 + '%';
    else {
      el.style.width = 'auto';
      const fs = l.fs * W;
      Object.assign(inn.style, { fontSize: fs + 'px', fontFamily: `"${l.font}",sans-serif`, color: l.color, fontWeight: 800, webkitTextStroke: l.strokeW > 0 ? l.strokeW * fs + 'px ' + l.stroke : '0', paintOrder: 'stroke fill' });
      inn.textContent = l.text;
    }
    el.classList.toggle('sel', l.id === sel);
  }
  function renderStage() {
    qa('.ly', stg).forEach((e) => e.remove());
    layers.forEach((l) => {
      const el = document.createElement('div');
      el.className = 'ly'; el.dataset.id = l.id;
      el.innerHTML = `<div class="in ${l.t === 'text' ? 'tx' : ''}">${l.t === 'img' ? '<img draggable="false" alt="">' : ''}</div><i class="hs"></i><i class="hr"></i>`;
      if (l.t === 'img') el.querySelector('img').src = l.url;
      el.onpointerdown = (e) => down(e, l.id, 'move');
      el.querySelector('.hs').onpointerdown = (e) => down(e, l.id, 'scale');
      el.querySelector('.hr').onpointerdown = (e) => down(e, l.id, 'rot');
      stg.appendChild(el);
      place(el, l);
    });
  }
  function refreshSel() { layers.forEach((l) => { const el = elOf(l.id); el && el.classList.toggle('sel', l.id === sel); }); tools(); if (tab === 'layers') panel(); }

  /* ---------- history ---------- */
  const save = () => { if (opts.admin) return; try { localStorage.setItem(key, snap()); } catch (e) {} };
  function push(before) { hist.push(before); if (hist.length > 60) hist.shift(); fut = []; }
  function full() { renderStage(); tools(); cost(); if (tab === 'layers') panel(); save(); }
  function mutate(fn) { const b = snap(); fn(); push(b); full(); }
  function live(fn) { if (liveSnap === null) liveSnap = snap(); fn(); const l = cur(); if (l) { const el = elOf(l.id); el && place(el, l); } }
  function endLive() { if (liveSnap !== null) { if (liveSnap !== snap()) push(liveSnap); liveSnap = null; save(); cost(); } }
  function undo() { if (!hist.length) return; fut.push(snap()); layers = JSON.parse(hist.pop()); if (!cur()) sel = null; full(); }
  function redo() { if (!fut.length) return; hist.push(snap()); layers = JSON.parse(fut.pop()); if (!cur()) sel = null; full(); }

  /* ---------- add / edit ---------- */
  function addAsset(a, at) {
    mutate(() => {
      const l = { id: nid(), t: 'img', aid: a.id, url: a.preview, name: a.name, ar: a.ar || 1, x: at ? clamp(at.x, 0, 1) : 0.5, y: at ? clamp(at.y, 0, 1) : 0.5, w: DEF_W[a.kind] || 0.3, rot: 0, flip: false, op: 1 };
      if (a.kind === 'pattern') { l.x = 0.5; l.y = 0.5; l.w = 1; }
      layers.push(l); sel = l.id;
    });
  }
  function addText() {
    mutate(() => { const l = { id: nid(), t: 'text', text: 'MY BUS', font: fonts()[0], color: '#ffffff', stroke: '#000000', strokeW: 0.08, fs: 0.08, x: 0.5, y: 0.5, rot: 0, flip: false, op: 1 }; layers.push(l); sel = l.id; });
    setTimeout(() => { const t = q$('#tt'); t && t.focus(); t && t.select(); }, 50);
  }
  function act(a) {
    const l = cur();
    if (a === 'undo') return undo();
    if (a === 'redo') return redo();
    if (a === 'clear') { if (layers.length && confirm('সব layer মুছে ফেলবেন?')) mutate(() => { layers = []; sel = null; }); return; }
    if (a === 'save') return saveFile();
    if (a === 'open') return q$('#openF').click();
    if (!l) return toast('আগে একটি layer সিলেক্ট করুন', 'err');
    if (a === 'del') mutate(() => { layers = layers.filter((x) => x.id !== l.id); sel = null; });
    if (a === 'dup') mutate(() => { const c = { ...l, id: nid(), x: clamp(l.x + 0.04, 0, 1), y: clamp(l.y + 0.04, 0, 1) }; layers.push(c); sel = c.id; });
    if (a === 'flip') mutate(() => { l.flip = !l.flip; });
    if (a === 'up') mutate(() => { const i = layers.indexOf(l); if (i < layers.length - 1) [layers[i], layers[i + 1]] = [layers[i + 1], layers[i]]; });
    if (a === 'down') mutate(() => { const i = layers.indexOf(l); if (i > 0) [layers[i], layers[i - 1]] = [layers[i - 1], layers[i]]; });
  }
  qa('[data-act]').forEach((b) => (b.onclick = () => act(b.dataset.act)));
  q$('#op').oninput = (e) => live(() => { const l = cur(); l && (l.op = +e.target.value); });
  q$('#op').onchange = endLive;
  [['#tt', 'text'], ['#tf', 'font'], ['#tc', 'color'], ['#ts', 'stroke'], ['#tw', 'strokeW']].forEach(([id, k]) => {
    const el = q$(id);
    el.oninput = () => live(() => { const l = cur(); if (l && l.t === 'text') l[k] = k === 'strokeW' ? +el.value : el.value; });
    el.onchange = () => { if (k === 'font') H.ensureFont(el.value); endLive(); };
  });
  function tools() {
    const l = cur();
    q$('#tctl').classList.toggle('hide', !(l && l.t === 'text'));
    q$('#op').value = l ? l.op ?? 1 : 1;
    if (l && l.t === 'text') { q$('#tt').value = l.text; q$('#tf').value = l.font; q$('#tc').value = l.color; q$('#ts').value = l.stroke; q$('#tw').value = l.strokeW; }
    qa('[data-act="undo"]')[0].disabled = !hist.length;
    qa('[data-act="redo"]')[0].disabled = !fut.length;
  }

  /* ---------- pointer: move / scale / rotate / pinch ---------- */
  function down(e, id, mode) {
    e.preventDefault(); e.stopPropagation();
    if (sel !== id) { sel = id; refreshSel(); }
    const l = cur(); if (!l) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = stg.getBoundingClientRect();
    if (pts.size === 2 && drag && drag.mode === 'move') {
      const [a, b] = [...pts.values()];
      drag = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, a0: Math.atan2(b.y - a.y, b.x - a.x), w0: l.w, fs0: l.fs, rot0: l.rot || 0 };
      return;
    }
    const cx = r.left + l.x * r.width, cy = r.top + l.y * r.height;
    snap0 = snap();
    drag = { mode, sx: e.clientX, sy: e.clientY, x0: l.x, y0: l.y, w0: l.w, fs0: l.fs, rot0: l.rot || 0, cx, cy, d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1 };
  }
  const setScale = (l, k) => { if (l.t === 'img') l.w = clamp(drag.w0 * k, 0.03, 3); else l.fs = clamp(drag.fs0 * k, 0.015, 0.6); };
  function onMove(e) {
    if (!drag) return;
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const l = cur(); if (!l) return;
    const r = stg.getBoundingClientRect();
    if (drag.mode === 'move') { l.x = clamp(drag.x0 + (e.clientX - drag.sx) / r.width, -0.2, 1.2); l.y = clamp(drag.y0 + (e.clientY - drag.sy) / r.height, -0.2, 1.2); }
    else if (drag.mode === 'scale') setScale(l, Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy) / drag.d0);
    else if (drag.mode === 'rot') l.rot = Math.round((Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) * 180) / Math.PI + 90);
    else if (drag.mode === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      setScale(l, (Math.hypot(a.x - b.x, a.y - b.y) || 1) / drag.d0);
      l.rot = Math.round(drag.rot0 + ((Math.atan2(b.y - a.y, b.x - a.x) - drag.a0) * 180) / Math.PI);
    }
    const el = elOf(l.id); el && place(el, l);
  }
  function onUp(e) {
    pts.delete(e.pointerId);
    if (!drag) return;
    if (drag.mode === 'pinch' ? pts.size < 2 : pts.size === 0) {
      if (snap0 !== null && snap0 !== snap()) { push(snap0); save(); cost(); tools(); }
      snap0 = null; drag = null; pts.clear();
    }
  }
  stg.onpointerdown = (e) => { if (e.target === stg) { sel = null; refreshSel(); } };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  const onKey = (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || '')) || document.querySelector('.ov')) return;
    const l = cur();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && l) { e.preventDefault(); act('del'); }
    else if (l && e.key.startsWith('Arrow')) { e.preventDefault(); const d = 0.004 * (e.shiftKey ? 5 : 1); const b = snap(); l.x += e.key === 'ArrowRight' ? d : e.key === 'ArrowLeft' ? -d : 0; l.y += e.key === 'ArrowDown' ? d : e.key === 'ArrowUp' ? -d : 0; push(b); full(); }
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

  /* ---------- side panel ---------- */
  function panel() {
    qa('.st-tab').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
    const p = q$('#panel');
    if (tab === 'text') {
      p.innerHTML = `<p class="mut small" style="margin-bottom:12px">নিজের নাম বা যেকোনো লেখা যোগ করুন। যোগ করার পর উপরের Tools বারে লেখা, ফন্ট ও রং বদলানো যাবে।</p><button class="btn" id="addTx" style="width:100%">＋ Add text</button>`;
      q$('#addTx').onclick = addText;
      return;
    }
    if (tab === 'layers') {
      p.innerHTML = layers.length ? [...layers].reverse().map((l) => `<div class="lrow ${l.id === sel ? 'on' : ''}" data-id="${l.id}"><span class="lth">${l.t === 'img' ? `<img src="${esc(l.url)}" alt="">` : 'T'}</span><span class="lnm">${esc(l.t === 'img' ? l.name : l.text)}</span></div>`).join('') : '<p class="mut small">কোনো layer নেই। ডিজাইন বা Text যোগ করুন।</p>';
      qa('.lrow', p).forEach((r) => (r.onclick = () => { sel = r.dataset.id; refreshSel(); }));
      return;
    }
    const list = S.assets.filter((a) => a.kind === tab && (!query || (a.name || '').toLowerCase().includes(query.toLowerCase())));
    p.innerHTML = `<input class="inp" id="aq" placeholder="🔍 Search…" value="${esc(query)}" style="margin-bottom:10px">${list.length ? `<div class="agrid">${list.map((a) => `<div class="ai" draggable="true" data-id="${a.id}" title="${esc(a.name)}"><img loading="lazy" src="${esc(a.thumb && a.type === 'free' ? a.preview : a.preview)}" alt=""><span class="badge ${a.type}">${a.type === 'paid' ? '⚡' + a.price : 'FREE'}</span></div>`).join('')}</div>` : '<p class="mut small" style="padding:16px 4px">এই ক্যাটাগরিতে এখনো কিছু নেই।</p>'}`;
    const aq = q$('#aq'); aq.oninput = () => { query = aq.value; const pos = aq.selectionStart; panel(); const n = q$('#aq'); n.focus(); n.setSelectionRange(pos, pos); };
    qa('.ai', p).forEach((c) => {
      const a = assetOf(c.dataset.id);
      c.onclick = () => addAsset(a);
      c.ondragstart = (e) => e.dataTransfer.setData('text/plain', a.id);
    });
  }
  qa('.st-tab').forEach((b) => (b.onclick = () => { tab = b.dataset.t; query = ''; panel(); }));

  /* ---------- cost ---------- */
  function calc() {
    const ids = [...new Set(layers.filter((l) => l.t === 'img').map((l) => l.aid))];
    const sp = !opts.own && skin.type === 'paid';
    let c = sp ? Number(skin.price) || 1 : 0, paidN = sp ? 1 : 0;
    ids.forEach((id) => { const a = assetOf(id); if (a && a.type === 'paid') { c += Number(a.price) || 1; paidN++; } });
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
  if (q$('#exp')) q$('#exp').onclick = async (ev) => {
    const btn = ev.currentTarget;
    if (!S.user) return H.loginModal('Login করে Export করুন');
    if (!layers.length && !confirm('কোনো ডিজাইন যোগ করা হয়নি। শুধু base skin Export করবেন?')) return;
    const { ids, cost: c } = calc();
    let sid = null;
    if (c > 0) { if (!(await confirmCost(c))) return; }
    else if (S.cfg.ads && S.cfg.ads.enabled !== false) { const r = await H.runAd('download', skin.id); if (!r) return; sid = r.sid; }
    const old = btn.textContent; btn.disabled = true; btn.textContent = 'Preparing…';
    try {
      const pre = await H.api('/api/export/prepare', { skinId: skin.id, assetIds: ids, sid });
      btn.textContent = 'Rendering…';
      const [baseBmp, ...bmps] = await Promise.all([opts.own ? createImageBitmap(opts.own) : getFile(pre.token, skin.id), ...ids.map((id) => getFile(pre.token, id))]);
      const map = Object.fromEntries(ids.map((id, i) => [id, bmps[i]]));
      const W = baseBmp.width, Hh = baseBmp.height;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
      const x = cv.getContext('2d');
      x.drawImage(baseBmp, 0, 0);
      await Promise.all(layers.filter((l) => l.t === 'text').map((l) => H.ensureFont(l.font)));
      for (const l of layers) {
        x.save();
        x.globalAlpha = l.op ?? 1;
        x.translate(l.x * W, l.y * Hh);
        x.rotate(((l.rot || 0) * Math.PI) / 180);
        if (l.flip) x.scale(-1, 1);
        if (l.t === 'img') { const b = map[l.aid]; const w = l.w * W, h = w * (b.height / b.width); x.drawImage(b, -w / 2, -h / 2, w, h); }
        else {
          const fs = l.fs * W;
          x.font = `800 ${fs}px "${l.font}", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
          if (l.strokeW > 0) { x.lineJoin = 'round'; x.lineWidth = fs * l.strokeW; x.strokeStyle = l.stroke; x.strokeText(l.text, 0, 0); }
          x.fillStyle = l.color; x.fillText(l.text, 0, 0);
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
  // ফাইল/template থেকে আসা layer নিরাপদ করে তোলে; asset না থাকলে বাদ
  function hydrate(list) {
    let missing = 0;
    const out = [];
    (Array.isArray(list) ? list : []).slice(0, 80).forEach((l) => {
      if (!l || typeof l !== 'object') return;
      const base = { id: nid(), x: num(l.x, 0.5, -0.5, 1.5), y: num(l.y, 0.5, -0.5, 1.5), rot: num(l.rot, 0, -3600, 3600), flip: !!l.flip, op: num(l.op, 1, 0.05, 1) };
      if (l.t === 'img') {
        const a = assetOf(String(l.aid));
        if (!a) { missing++; return; }
        out.push({ ...base, t: 'img', aid: a.id, url: a.preview, name: a.name, ar: a.ar || 1, w: num(l.w, 0.3, 0.03, 3) });
      } else if (l.t === 'text') {
        out.push({ ...base, t: 'text', text: String(l.text || '').slice(0, 60), font: String(l.font || fonts()[0]).slice(0, 60), color: col(l.color, '#ffffff'), stroke: col(l.stroke, '#000000'), strokeW: num(l.strokeW, 0.08, 0, 0.25), fs: num(l.fs, 0.08, 0.015, 0.6) });
      }
    });
    if (missing) toast(`${missing}টি ডিজাইন আর নেই, সেগুলো বাদ দেওয়া হয়েছে`, 'err');
    return out;
  }
  const clean = () => layers.map((l) => (l.t === 'img' ? { t: 'img', aid: l.aid, x: l.x, y: l.y, w: l.w, rot: l.rot || 0, flip: !!l.flip, op: l.op ?? 1 } : { t: 'text', text: l.text, font: l.font, color: l.color, stroke: l.stroke, strokeW: l.strokeW, fs: l.fs, x: l.x, y: l.y, rot: l.rot || 0, flip: !!l.flip, op: l.op ?? 1 }));
  function saveFile() {
    const blob = new Blob([JSON.stringify({ app: 'bussid-studio', v: 1, skinId: skin.id, layers: clean() })], { type: 'application/json' });
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
      mutate(() => { layers = hydrate(d.layers); sel = null; });
      toast('ডিজাইন খোলা হয়েছে 📂');
    } catch (er) { toast(er.message || 'ফাইল পড়া যায়নি', 'err'); }
  };
  if (opts.admin && q$('#tpSave')) {
    q$('#tpSave').onclick = async (ev) => {
      const name = q$('#tpName').value.trim();
      if (!name) return toast('Template এর নাম দিন', 'err');
      if (!layers.length) return toast('কোনো ডিজাইন যোগ করা হয়নি', 'err');
      const b = ev.currentTarget; b.disabled = true;
      try { await opts.admin.onSave({ name, category: q$('#tpCat').value.trim(), layers: clean() }); } catch (e) { toast(e.message, 'err'); }
      b.disabled = false;
    };
  }

  /* ---------- init ---------- */
  if (opts.template) layers = hydrate(opts.template.layers);
  else if (!opts.admin) {
    try {
      const d = JSON.parse(localStorage.getItem(key) || 'null');
      if (Array.isArray(d) && d.length) { layers = d; toast('আগের ডিজাইন ফিরিয়ে আনা হয়েছে (Clear all চাপলে নতুন শুরু)'); }
    } catch (e) {}
  }
  renderStage(); tools(); cost(); panel();
  H.onAssets(() => { if (tab !== 'text') panel(); cost(); });
  return {
    destroy() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKey);
    },
  };
}
