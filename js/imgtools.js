// imgtools.js — Crop + Remove Background (সম্পূর্ণ ব্রাউজারেই চলে, কিছু আপলোড হয় না)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const toFile = (cv, name) => new Promise((ok) => cv.toBlob((b) => ok(new File([b], name, { type: 'image/png' })), 'image/png'));
const baseName = (f) => String((f && f.name) || 'image').replace(/\.[a-z0-9]+$/i, '').replace(/-(crop|nobg)$/i, '');
const attr = (s) => String(s).replace(/"/g, '%22');

// cr = [left, top, right, bottom] — প্রতি দিক থেকে কতটা ছাঁটা (০..১)
export async function cropToFile(file, cr) {
  const bmp = await createImageBitmap(file);
  const sx = cr[0] * bmp.width, sy = cr[1] * bmp.height, sw = Math.max(1, (1 - cr[0] - cr[2]) * bmp.width), sh = Math.max(1, (1 - cr[1] - cr[3]) * bmp.height);
  const c = document.createElement('canvas');
  c.width = Math.round(sw); c.height = Math.round(sh);
  c.getContext('2d').drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return toFile(c, baseName(file) + '-crop.png');
}

export function cropDialog(modal, src, init) {
  return new Promise((resolve) => {
    let fin = false;
    const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">✂ Crop</h3>
      <div class="crw"><div class="crp" id="crp"><img id="crimg" src="${attr(src)}" alt="" draggable="false"><div class="cdim" id="cdim"></div><div class="cbox" id="cbox">${['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map((h) => `<i class="ch ${h}" data-h="${h}"></i>`).join('')}</div></div></div>
      <div class="cra">${[['0', 'Free'], ['1', '1:1'], ['1.3333', '4:3'], ['1.7778', '16:9'], ['0.75', '3:4'], ['0.5625', '9:16']].map((a, i) => `<button class="tb wide ${i === 0 ? 'on' : ''}" data-r="${a[0]}">${a[1]}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px"><button class="btn" id="cok">✔ Apply</button><button class="btn ghost" id="crs">↺ Reset</button></div>`, { wide: true });
    const q = (s) => ov.querySelector(s), crp = q('#crp'), img = q('#crimg'), box = q('#cbox'), dim = q('#cdim');
    let b = init && init.length === 4 ? { x0: init[0], y0: init[1], x1: 1 - init[2], y1: 1 - init[3] } : { x0: 0, y0: 0, x1: 1, y1: 1 };
    let R = 0, ar = 1, drag = null;
    const draw = () => {
      box.style.left = b.x0 * 100 + '%'; box.style.top = b.y0 * 100 + '%'; box.style.width = (b.x1 - b.x0) * 100 + '%'; box.style.height = (b.y1 - b.y0) * 100 + '%';
      const p = (v) => v * 100 + '%';
      dim.style.clipPath = `polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,${p(b.x0)} ${p(b.y0)},${p(b.x0)} ${p(b.y1)},${p(b.x1)} ${p(b.y1)},${p(b.x1)} ${p(b.y0)},${p(b.x0)} ${p(b.y0)})`;
    };
    img.onload = () => { ar = img.naturalWidth / img.naturalHeight || 1; draw(); };
    draw();
    box.onpointerdown = (e) => { e.preventDefault(); drag = { h: e.target.dataset.h || 'move', sx: e.clientX, sy: e.clientY, o: { ...b } }; box.setPointerCapture(e.pointerId); };
    box.onpointermove = (e) => {
      if (!drag) return;
      const r = crp.getBoundingClientRect(), px = clamp((e.clientX - r.left) / r.width, 0, 1), py = clamp((e.clientY - r.top) / r.height, 0, 1), o = drag.o, min = 0.03;
      if (drag.h === 'move') {
        const w = o.x1 - o.x0, h = o.y1 - o.y0, x0 = clamp(o.x0 + (e.clientX - drag.sx) / r.width, 0, 1 - w), y0 = clamp(o.y0 + (e.clientY - drag.sy) / r.height, 0, 1 - h);
        b = { x0, y0, x1: x0 + w, y1: y0 + h };
      } else if (drag.h.length === 2) {
        const ax = drag.h.includes('w') ? o.x1 : o.x0, ay = drag.h.includes('n') ? o.y1 : o.y0;
        let w = Math.abs(px - ax), h = Math.abs(py - ay);
        if (R) { if ((w * ar) / Math.max(h, 1e-6) > R) w = (h * R) / ar; else h = (w * ar) / R; }
        w = Math.max(w, min); h = R ? (w * ar) / R : Math.max(h, min);
        const gx = drag.h.includes('w') ? -1 : 1, gy = drag.h.includes('n') ? -1 : 1;
        let nx = ax + gx * w, ny = ay + gy * h;
        if (nx < 0 || nx > 1 || ny < 0 || ny > 1) {
          const k = Math.min(nx < 0 ? ax / w : nx > 1 ? (1 - ax) / w : 1, ny < 0 ? ay / h : ny > 1 ? (1 - ay) / h : 1);
          w *= k; h *= k; nx = ax + gx * w; ny = ay + gy * h;
        }
        b = { x0: Math.min(ax, nx), x1: Math.max(ax, nx), y0: Math.min(ay, ny), y1: Math.max(ay, ny) };
      } else {
        b = { ...o };
        if (drag.h === 'w') b.x0 = clamp(px, 0, o.x1 - min);
        if (drag.h === 'e') b.x1 = clamp(px, o.x0 + min, 1);
        if (drag.h === 'n') b.y0 = clamp(py, 0, o.y1 - min);
        if (drag.h === 's') b.y1 = clamp(py, o.y0 + min, 1);
      }
      draw();
    };
    box.onpointerup = box.onpointercancel = () => { drag = null; };
    ov.querySelectorAll('[data-r]').forEach((bt) => (bt.onclick = () => {
      ov.querySelectorAll('[data-r]').forEach((x) => x.classList.toggle('on', x === bt));
      R = parseFloat(bt.dataset.r) || 0;
      crp.classList.toggle('lk', !!R);
      if (R) { let w = R / ar, h = 1; if (w > 1) { w = 1; h = ar / R; } b = { x0: (1 - w) / 2, x1: (1 + w) / 2, y0: (1 - h) / 2, y1: (1 + h) / 2 }; draw(); }
    }));
    const finish = (v) => { fin = true; ov.close(); resolve(v); };
    ov.onClose = () => !fin && resolve(null);
    q('#crs').onclick = () => { b = { x0: 0, y0: 0, x1: 1, y1: 1 }; draw(); };
    q('#cok').onclick = () => finish([b.x0, b.y0, 1 - b.x1, 1 - b.y1].map((v) => +Math.max(0, v).toFixed(4)));
  });
}

// রঙ ধরে / জাদুকাঠি / ইরেজার দিয়ে ব্যাকগ্রাউন্ড স্বচ্ছ করা
export async function removeBgDialog(modal, file) {
  const bmp = await createImageBitmap(file);
  const sc = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)), W = Math.max(1, Math.round(bmp.width * sc)), H = Math.max(1, Math.round(bmp.height * sc));
  return new Promise((resolve) => {
    let fin = false, mode = 'magic', stroking = false;
    const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">✨ Remove Background</h3>
      <div class="rbm"><button class="tb wide on" data-m="magic">🪄 Magic</button><button class="tb wide" data-m="color">🎯 Same color</button><button class="tb wide" data-m="brush">🧹 Eraser</button><button class="tb wide" id="rbA">✨ Auto (কোণার রং)</button><button class="tb wide" id="rbU">↶ Undo</button></div>
      <div class="rbs"><label class="mut small">Tolerance</label><input type="range" id="rbT" min="3" max="80" value="28"><span id="rbBw" class="hide"><label class="mut small">Brush</label><input type="range" id="rbB" min="4" max="120" value="30"></span></div>
      <p class="mut small" id="rbH">🪄 ব্যাকগ্রাউন্ডের উপর ট্যাপ করুন — লাগোয়া একই রঙের অংশ মুছে যাবে।</p>
      <div class="rbw"><canvas id="rbc"></canvas></div>
      <div class="row" style="margin-top:10px"><button class="btn" id="rbOk">✔ Done</button><button class="btn ghost" id="rbNo">Cancel</button></div>`, { wide: true });
    const q = (s) => ov.querySelector(s), cv = q('#rbc'), ctx = cv.getContext('2d', { willReadFrequently: true });
    cv.width = W; cv.height = H; ctx.drawImage(bmp, 0, 0, W, H);
    const undo = [];
    const snap = () => { undo.push(ctx.getImageData(0, 0, W, H)); if (undo.length > 8) undo.shift(); };
    const tol = () => +q('#rbT').value * 2.55;
    const near = (d, i, s, t) => d[i + 3] > 8 && Math.max(Math.abs(d[i] - s[0]), Math.abs(d[i + 1] - s[1]), Math.abs(d[i + 2] - s[2])) <= t;
    const flood = (d, sx, sy) => {
      const i0 = (sy * W + sx) * 4; if (d[i0 + 3] <= 8) return;
      const s = [d[i0], d[i0 + 1], d[i0 + 2]], t = tol(), seen = new Uint8Array(W * H), st = new Int32Array(W * H);
      let n = 0; st[n++] = sy * W + sx; seen[sy * W + sx] = 1;
      while (n) {
        const p = st[--n], x = p % W, y = (p / W) | 0, i = p * 4;
        if (!near(d, i, s, t)) continue;
        d[i + 3] = 0;
        if (x > 0 && !seen[p - 1]) { seen[p - 1] = 1; st[n++] = p - 1; }
        if (x < W - 1 && !seen[p + 1]) { seen[p + 1] = 1; st[n++] = p + 1; }
        if (y > 0 && !seen[p - W]) { seen[p - W] = 1; st[n++] = p - W; }
        if (y < H - 1 && !seen[p + W]) { seen[p + W] = 1; st[n++] = p + W; }
      }
    };
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [clamp(Math.floor(((e.clientX - r.left) / r.width) * W), 0, W - 1), clamp(Math.floor(((e.clientY - r.top) / r.height) * H), 0, H - 1), r.width]; };
    const erase = (e) => { const [x, y, rw] = pos(e), rad = (+q('#rbB').value * (W / rw)) / 2; ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fill(); ctx.restore(); };
    cv.onpointerdown = (e) => {
      e.preventDefault(); snap();
      const [x, y] = pos(e);
      if (mode === 'brush') { stroking = true; cv.setPointerCapture(e.pointerId); erase(e); return; }
      const im = ctx.getImageData(0, 0, W, H), d = im.data;
      if (mode === 'magic') flood(d, x, y);
      else { const i0 = (y * W + x) * 4, s = [d[i0], d[i0 + 1], d[i0 + 2]], t = tol(); for (let i = 0; i < d.length; i += 4) if (near(d, i, s, t)) d[i + 3] = 0; }
      ctx.putImageData(im, 0, 0);
    };
    cv.onpointermove = (e) => { if (stroking) erase(e); };
    cv.onpointerup = cv.onpointercancel = () => { stroking = false; };
    ov.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => {
      mode = b.dataset.m;
      ov.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b));
      q('#rbBw').classList.toggle('hide', mode !== 'brush');
      q('#rbH').textContent = mode === 'magic' ? '🪄 ব্যাকগ্রাউন্ডের উপর ট্যাপ করুন — লাগোয়া একই রঙের অংশ মুছে যাবে।' : mode === 'color' ? '🎯 একটি রঙে ট্যাপ করুন — ছবির সব জায়গা থেকে ওই রং মুছে যাবে।' : '🧹 আঙুল/মাউস টেনে বাকি অংশ মুছুন।';
    }));
    q('#rbA').onclick = () => {
      snap();
      const im = ctx.getImageData(0, 0, W, H), d = im.data;
      [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].forEach(([x, y]) => flood(d, x, y));
      ctx.putImageData(im, 0, 0);
    };
    q('#rbU').onclick = () => { const s = undo.pop(); s && ctx.putImageData(s, 0, 0); };
    const finish = (v) => { fin = true; ov.close(); resolve(v); };
    ov.onClose = () => !fin && resolve(null);
    q('#rbNo').onclick = () => finish(null);
    q('#rbOk').onclick = async () => finish(await toFile(cv, baseName(file) + '-nobg.png'));
  });
}
