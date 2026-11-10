import { FIREBASE, API } from '../config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, onValue, get, set, remove, query, limitToLast } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { drawZones, groupLabels } from './render.js';
import { mountStudio, miniLayersHtml } from './editor.js';

const app = initializeApp(FIREBASE);
const auth = getAuth(app);
const db = getDatabase(app);

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = { user: null, me: null, admin: false, cfg: {}, skins: [], fonts: [], assets: [], templates: [], favs: {}, coll: {}, cats: [], stats: {}, orders: [], tx: [], ready: {}, view: '', f: { q: '', cat: '', type: '', sort: 'new' }, unsubs: [] };
const BASE_FONTS = ['Arial', 'Impact', 'Verdana', 'Georgia', 'Courier New', 'Trebuchet MS'];
const fmtDate = (t) => new Date(t).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 4200);
}
function modal(html, { wide } = {}) {
  const ov = document.createElement('div');
  ov.className = 'ov';
  ov.innerHTML = `<div class="card modal glow ${wide ? 'wide' : ''}">${html}</div>`;
  ov.close = () => { ov.remove(); ov.onClose && ov.onClose(); };
  ov.addEventListener('mousedown', (e) => { if (e.target === ov) ov.close(); });
  document.body.appendChild(ov);
  $$('[data-close]', ov).forEach((b) => (b.onclick = ov.close));
  return ov;
}
async function api(path, body) {
  const t = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const r = await fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Error ' + r.status);
  return j;
}

/* ---------- countdown ---------- */
const timers = new Set();
const cdHtml = (sm) => `<div class="cd ${sm ? 'sm' : ''}"><div><b>00</b><span>Days</span></div><div><b>00</b><span>Hrs</span></div><div><b>00</b><span>Min</span></div><div><b>00</b><span>Sec</span></div></div>`;
function bindCd(el, endAt, onDone, keep) {
  if (!el) return;
  const b = $$('b', el);
  const tick = () => {
    const s = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
    [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].forEach((v, i) => (b[i].textContent = String(v).padStart(2, '0')));
    if (s <= 0) { clearInterval(id); timers.delete(id); onDone && onDone(); }
  };
  const id = setInterval(tick, 1000);
  tick();
  if (!keep) timers.add(id);
  return id;
}
const clearTimers = () => { timers.forEach(clearInterval); timers.clear(); };

/* ---------- ad slots ---------- */
const FRAME_SB = 'allow-scripts allow-popups allow-same-origin allow-popups-to-escape-sandbox';
const adSlot = (html, h = 120) => (html ? `<div class="c" style="margin:18px 0"><iframe sandbox="${FRAME_SB}" srcdoc="${esc('<body style="margin:0;display:flex;justify-content:center;background:transparent">' + html + '</body>')}" height="${h}" style="width:100%;border:0"></iframe></div>` : '');

/* ================= fonts ================= */
const loadedFonts = new Set();
function syncFonts() {
  for (const f of S.fonts) {
    if (loadedFonts.has(f.id)) continue;
    loadedFonts.add(f.id);
    if (f.kind === 'google') {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(f.family).replace(/%20/g, '+') + ':wght@400;700;800&display=swap';
      document.head.appendChild(l);
    } else {
      new FontFace(f.family, `url(${API}/api/font/${f.id})`).load().then((ff) => { document.fonts.add(ff); S.redraw && S.redraw(); }).catch(() => {});
    }
  }
}
const ensureFont = (fam) => document.fonts.load(`800 40px "${fam}"`).catch(() => {});

/* ================= maintenance / header ================= */
const maintActive = () => { const m = S.cfg.maintenance; return !!(m && m.on && (!m.endAt || m.endAt > Date.now())); };
function renderMaint() {
  let el = $('#mt');
  clearInterval(S.mtT);
  if (!maintActive() || S.admin) {
    if (el) el.remove();
    $('#abar').innerHTML = maintActive() && S.admin ? '<div class="adminbar">MAINTENANCE MODE IS ON — only you (admin) can see the site</div>' : '';
    return;
  }
  $('#abar').innerHTML = '';
  const m = S.cfg.maintenance;
  if (!el) { el = document.createElement('div'); el.id = 'mt'; el.className = 'mt'; document.body.appendChild(el); }
  el.innerHTML = `<div><div class="gear">⚙️</div><h1 class="grad">${esc(m.title || 'Upgrading the Studio')}</h1><p>${esc(m.message || 'আমরা সাইটে কাজ করছি। কিছুক্ষণ পর আবার আসুন।')}</p>${m.endAt ? cdHtml() : ''}<p class="small mut" style="margin-top:26px"><a href="#" id="mtA">Admin login</a></p></div>`;
  if (m.endAt) S.mtT = bindCd($('.cd', el), m.endAt, () => renderMaint(), true);
  $('#mtA').onclick = (e) => { e.preventDefault(); loginModal(); };
}

function renderHeader() {
  const name = (S.cfg.site && S.cfg.site.name) || 'BUSSID STUDIO';
  $('#logoTx').textContent = name;
  document.title = name + ' — BUSSID Skin Maker';
  const h = $('#hdr');
  if (!S.user) h.innerHTML = '<button class="btn sm" id="hLogin">Login</button>';
  else h.innerHTML = `<div style="display:flex;gap:10px;align-items:center"><a class="pill" href="#/wallet">⚡ <b>${S.me ? S.me.credits || 0 : '…'}</b></a><img class="ava" id="hAva" src="${esc(S.user.photoURL || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#8b5cf6"/></svg>'))}" alt=""></div>`;
  $('#hLogin') && ($('#hLogin').onclick = () => loginModal());
  $('#hAva') && ($('#hAva').onclick = accountModal);
  const foot = $('#foot');
  const tg = S.cfg.site && S.cfg.site.telegram;
  foot.innerHTML = `<p>© ${new Date().getFullYear()} ${esc(name)} · Not affiliated with Bus Simulator Indonesia / Maleo.</p>${tg ? `<p style="margin-top:6px"><a href="${esc(tg)}" target="_blank" rel="noopener">Join our Telegram</a></p>` : ''}`;
}
$('#tabAcc').onclick = (e) => { e.preventDefault(); S.user ? accountModal() : loginModal(); };

/* ================= auth ================= */
const authErr = (e) => ({ 'auth/invalid-credential': 'Email বা password ভুল', 'auth/email-already-in-use': 'এই email দিয়ে আগেই account আছে', 'auth/weak-password': 'Password কমপক্ষে ৬ অক্ষর দিন', 'auth/invalid-email': 'Email সঠিক নয়', 'auth/popup-closed-by-user': 'Login বাতিল হয়েছে', 'auth/too-many-requests': 'অনেকবার চেষ্টা হয়েছে, পরে আবার চেষ্টা করুন' }[e.code] || e.message);
function loginModal(msg) {
  let mode = 'in';
  const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">${esc(msg || 'Player Login')}</h3>
    <button class="btn google" id="gBtn" style="width:100%;margin:6px 0 14px"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-7.9-6.2C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z"/></svg> Continue with Google</button>
    <p class="c mut small" style="margin-bottom:12px">— or use email —</p>
    <div class="field"><input class="inp" id="lE" type="email" placeholder="Email" autocomplete="email"></div>
    <div class="field hide" id="lNw"><input class="inp" id="lN" placeholder="Player name"></div>
    <div class="field"><input class="inp" id="lP" type="password" placeholder="Password" autocomplete="current-password"></div>
    <button class="btn" id="lGo" style="width:100%">Sign in</button>
    <p class="c small" style="margin-top:14px"><a href="#" id="lSw">নতুন account খুলুন</a> · <a href="#" id="lFg">Password ভুলে গেছেন?</a></p>`);
  const done = () => ov.close();
  $('#gBtn', ov).onclick = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); done(); } catch (e) { toast(authErr(e), 'err'); } };
  $('#lSw', ov).onclick = (e) => { e.preventDefault(); mode = mode === 'in' ? 'up' : 'in'; $('#lNw', ov).classList.toggle('hide', mode === 'in'); $('#lGo', ov).textContent = mode === 'in' ? 'Sign in' : 'Create account'; e.target.textContent = mode === 'in' ? 'নতুন account খুলুন' : 'আগে থেকে account আছে? Sign in'; };
  $('#lFg', ov).onclick = async (e) => { e.preventDefault(); const em = $('#lE', ov).value.trim(); if (!em) return toast('আগে Email লিখুন', 'err'); try { await sendPasswordResetEmail(auth, em); toast('Reset link পাঠানো হয়েছে'); } catch (er) { toast(authErr(er), 'err'); } };
  $('#lGo', ov).onclick = async () => {
    const em = $('#lE', ov).value.trim(), pw = $('#lP', ov).value;
    try {
      if (mode === 'in') await signInWithEmailAndPassword(auth, em, pw);
      else { const c = await createUserWithEmailAndPassword(auth, em, pw); const nm = $('#lN', ov).value.trim(); if (nm) await updateProfile(c.user, { displayName: nm }); }
      done();
    } catch (er) { toast(authErr(er), 'err'); }
  };
}
function accountModal() {
  const u = S.user;
  const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">Account</h3><p><b>${esc((S.me && S.me.name) || u.displayName || '')}</b></p><p class="mut small">${esc(u.email || '')}</p><p style="margin:12px 0">⚡ Credits: <b>${S.me ? S.me.credits || 0 : 0}</b> · ⬇ Downloads: <b>${S.me ? S.me.downloads || 0 : 0}</b></p><button class="btn danger sm" id="lo">Logout</button>`);
  $('#lo', ov).onclick = async () => { await signOut(auth); ov.close(); };
}

/* ================= data ================= */
const refresh = () => { if (!((S.view === 'make' || S.view === 'studio') && S.made)) route(); };
const arr = (o) => Object.entries(o || {}).map(([id, v]) => ({ id, ...v }));
onValue(ref(db, 'config'), (s) => { S.cfg = s.val() || {}; S.ready.cfg = true; applyCfg(); });
onValue(ref(db, 'skins'), (s) => { S.skins = arr(s.val()).filter((x) => x.active !== false).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); S.ready.skins = true; refresh(); });
onValue(ref(db, 'fonts'), (s) => { S.fonts = arr(s.val()); syncFonts(); });
onValue(ref(db, 'assets'), (s) => { S.assets = arr(s.val()).filter((x) => x.active !== false).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); S.ready.assets = true; S.editorRefresh ? S.editorRefresh() : !S.made && route(); });
onValue(ref(db, 'templates'), (s) => { S.templates = arr(s.val()).filter((x) => x.active !== false).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); S.ready.templates = true; S.editorRefresh ? null : !S.made && route(); });
onValue(ref(db, 'categories'), (s) => { S.cats = arr(s.val()).sort((a, b) => (a.order || 0) - (b.order || 0)); });
onValue(ref(db, 'stats'), (s) => { S.stats = s.val() || {}; const el = $('#stDl'); if (el) el.textContent = S.stats.downloads || 0; });

let injectedHead = '';
function applyCfg() {
  renderMaint();
  renderHeader();
  const h = S.cfg.ads && S.cfg.ads.enabled !== false && S.cfg.ads.headHtml;
  if (h && h !== injectedHead) { injectedHead = h; try { document.body.appendChild(document.createRange().createContextualFragment(h)); } catch (e) {} }
  refresh();
}

onAuthStateChanged(auth, async (u) => {
  S.unsubs.forEach((f) => f());
  S.unsubs = [];
  S.user = u;
  S.me = null; S.admin = false; S.orders = []; S.tx = []; S.favs = {}; S.coll = {};
  if (u) {
    try { await api('/api/me/init'); } catch (e) { toast(e.message, 'err'); }
    S.unsubs.push(onValue(ref(db, 'users/' + u.uid), (s) => { S.me = s.val(); renderHeader(); if (S.view === 'wallet') route(); }));
    S.unsubs.push(onValue(ref(db, 'collected/' + u.uid), (s) => { S.coll = s.val() || {}; if (S.view === 'studio' && !S.made) route(); }));
    S.unsubs.push(onValue(ref(db, 'favorites/' + u.uid), (s) => { S.favs = s.val() || {}; S.editorRefresh && S.editorRefresh(); }));
    S.unsubs.push(onValue(ref(db, 'userOrders/' + u.uid), (s) => { S.orders = arr(s.val()).sort((a, b) => b.createdAt - a.createdAt); if (S.view === 'wallet') route(); }));
    S.unsubs.push(onValue(query(ref(db, 'transactions/' + u.uid), limitToLast(15)), (s) => { S.tx = arr(s.val()).sort((a, b) => b.at - a.at); if (S.view === 'wallet') route(); }));
    try { S.admin = (await get(ref(db, 'admins/' + u.uid))).val() === true; } catch (e) {}
  }
  renderHeader(); renderMaint();
  refresh();
});

/* ================= router ================= */
window.addEventListener('hashchange', route);
function route() {
  clearTimers();
  S.made = false;
  S.studioDestroy && S.studioDestroy();
  S.studioDestroy = null; S.editorRefresh = null;
  const [p, arg, arg2] = (location.hash.replace(/^#\/?/, '') || 'home').split('/');
  S.view = ['home', 'skins', 'make', 'studio', 'wallet'].includes(p) ? p : 'home';
  $$('#nav a,#tabbar a[data-p]').forEach((a) => a.classList.toggle('on', a.dataset.p === (S.view === 'make' ? 'skins' : S.view)));
  const v = $('#view');
  if (!S.ready.cfg || !S.ready.skins || !S.ready.assets || !S.ready.templates) { v.innerHTML = '<div class="spin"></div>'; return; }
  S.redraw = null;
  ({ home: viewHome, skins: viewSkins, make: () => viewMake(arg), studio: () => viewStudio(arg, arg2), wallet: viewWallet })[S.view]();
}

/* ================= views ================= */
function skinCard(s) {
  const soon = s.releaseAt && s.releaseAt > Date.now();
  const isNew = Date.now() - (s.createdAt || 0) < 7 * 864e5;
  return `<div class="card glow skin" data-id="${s.id}"><div class="im"><img loading="lazy" src="${esc(s.preview)}" alt="${esc(s.name)}"><div class="tags"><span class="badge ${s.type}">${s.type === 'paid' ? '⚡ ' + s.price + ' CR' : 'FREE'}</span>${isNew ? '<span class="badge new">NEW</span>' : ''}</div>${soon ? `<div class="soon" data-end="${s.releaseAt}"><small>COMING SOON</small>${cdHtml(true)}</div>` : ''}</div><div class="meta"><h4>${esc(s.name)}</h4><div><span>${esc(s.category || '—')}</span><span>⬇ ${s.downloads || 0}</span></div></div></div>`;
}
function bindSkinCards(root, to = 'make') {
  $$('.skin', root).forEach((c) => (c.onclick = () => {
    const s = S.skins.find((x) => x.id === c.dataset.id);
    if (s.releaseAt && s.releaseAt > Date.now()) return toast('এই skin টি শীঘ্রই আসছে ⏳', 'err');
    location.hash = '#/' + to + '/' + s.id;
  }));
  $$('.soon', root).forEach((el) => bindCd($('.cd', el), +el.dataset.end, () => route()));
}

function earnCard() {
  const a = S.cfg.ads || {};
  if (!a.earnEnabled) return '';
  return `<div class="card glow event"><div><h3 class="grad">⚡ Free Credits</h3><p class="mut">একটি ad দেখুন, পান <b style="color:var(--warn)">+${a.earnCredits || 1} credit</b> (দৈনিক সর্বোচ্চ ${a.earnDailyLimit || 10}টি)</p></div><button class="btn" id="earnBtn">▶ Watch Ad</button></div>`;
}
function bindEarn() {
  const b = $('#earnBtn');
  if (!b) return;
  b.onclick = async () => {
    if (!S.user) return loginModal('Login করে credit নিন');
    const r = await runAd('earn');
    if (r && r.res) toast(`+${r.res.amount} credit পেয়েছেন! 🎉`);
  };
}

function viewHome() {
  const cfg = S.cfg, c = cfg.countdown, ads = cfg.ads || {};
  const showCd = c && c.on && c.endAt > Date.now();
  const latest = S.skins.slice(0, 8);
  const tot = S.skins.length;
  $('#view').innerHTML = `<div class="wrap">
    <section class="hero"><span class="chip-ai">✦ AI-Powered Skin Generator</span>
      <h1 class="grad">${esc((cfg.site && cfg.site.headline) || 'Create Your Bus Skin in Seconds')}</h1>
      <p>${esc((cfg.site && cfg.site.tagline) || 'পছন্দের skin বাছুন, বাসের নাম লিখুন, Generate চাপুন — আপনার নাম বসে যাবে নিজে থেকেই। ডাউনলোড করে সোজা BUSSID এ।')}</p>
      <div class="cta"><a class="btn big" href="#/skins">Browse Skins</a><a class="btn ghost big" href="#/studio">🎨 Studio</a><a class="btn ghost big" href="#/wallet">Get Credits</a></div>
      <div class="stats"><div class="card stat"><b class="grad">${tot}</b><span>Skins</span></div><div class="card stat"><b class="grad" id="stDl">${S.stats.downloads || 0}</b><span>Downloads</span></div><div class="card stat"><b class="grad">${S.skins.filter((x) => x.type === 'free').length}</b><span>Free</span></div></div>
    </section>
    ${showCd ? `<div class="card glow event"><div><h3 class="grad">${esc(c.title || 'Special Event')}</h3><p class="mut">${esc(c.text || '')}</p></div>${cdHtml()}${c.link ? `<a class="btn" href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.btn || 'Join')}</a>` : ''}</div>` : ''}
    ${adSlot(ads.bannerHtml, ads.bannerHeight || 100)}
    <section class="sec"><div class="sec-h"><h2>Latest <span class="grad">Drops</span></h2><a href="#/skins">View all →</a></div>
      ${latest.length ? `<div class="grid" id="hg">${latest.map(skinCard).join('')}</div>` : '<div class="empty card">এখনো কোনো skin নেই</div>'}</section>
    ${earnCard() ? `<section class="sec">${earnCard()}</section>` : ''}
    <section class="sec"><div class="sec-h"><h2>How it <span class="grad">works</span></h2></div>
      <div class="steps"><div class="card"><b class="grad">01</b>পছন্দের skin বাছুন</div><div class="card"><b class="grad">02</b>সামনে, পেছনে ও দুই পাশের নাম লিখুন</div><div class="card"><b class="grad">03</b>Generate চাপুন, লেখা বসে যাবে</div><div class="card"><b class="grad">04</b>PNG ডাউনলোড করে গেমে ব্যবহার করুন</div></div></section>
  </div>`;
  const hg = $('#hg');
  hg && bindSkinCards(hg);
  if (showCd) bindCd($('.event .cd'), c.endAt, () => route());
  bindEarn();
}

function viewSkins() {
  const ads = S.cfg.ads || {};
  $('#view').innerHTML = `<div class="wrap sec"><div class="sec-h"><h2>All <span class="grad">Skins</span></h2></div>
    <div class="bar"><input class="inp" id="fq" placeholder="🔍 Search skin..." value="${esc(S.f.q)}">
      <select class="inp" id="ft" style="max-width:150px"><option value="">All types</option><option value="free">Free</option><option value="paid">Paid</option></select>
      <select class="inp" id="fs" style="max-width:170px"><option value="new">Newest</option><option value="hot">Most downloaded</option><option value="cheap">Price: low → high</option></select></div>
    <div class="chips" id="fc" style="margin-bottom:20px"></div>
    ${adSlot(ads.bannerHtml, ads.bannerHeight || 100)}
    <div class="grid" id="sg"></div></div>`;
  $('#ft').value = S.f.type; $('#fs').value = S.f.sort;
  const chips = () => { $('#fc').innerHTML = [{ name: 'All', v: '' }, ...S.cats.map((c) => ({ name: c.name, v: c.name }))].map((c) => `<span class="chip ${S.f.cat === c.v ? 'on' : ''}" data-v="${esc(c.v)}">${esc(c.name)}</span>`).join(''); $$('#fc .chip').forEach((el) => (el.onclick = () => { S.f.cat = el.dataset.v; chips(); grid(); })); };
  const grid = () => {
    let l = S.skins.filter((s) => (!S.f.q || (s.name + ' ' + (s.category || '')).toLowerCase().includes(S.f.q.toLowerCase())) && (!S.f.cat || s.category === S.f.cat) && (!S.f.type || s.type === S.f.type));
    if (S.f.sort === 'hot') l.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    if (S.f.sort === 'cheap') l.sort((a, b) => (a.type === 'free' ? 0 : a.price) - (b.type === 'free' ? 0 : b.price));
    const g = $('#sg');
    clearTimers();
    g.innerHTML = l.length ? l.map(skinCard).join('') : '<div class="empty" style="grid-column:1/-1">কিছু পাওয়া যায়নি</div>';
    bindSkinCards(g);
  };
  $('#fq').oninput = (e) => { S.f.q = e.target.value; grid(); };
  $('#ft').onchange = (e) => { S.f.type = e.target.value; grid(); };
  $('#fs').onchange = (e) => { S.f.sort = e.target.value; grid(); };
  chips(); grid();
}

/* ---------- generator ---------- */
function viewMake(id) {
  const skin = S.skins.find((s) => s.id === id);
  const v = $('#view');
  if (!skin) { v.innerHTML = '<div class="wrap empty">Skin পাওয়া যায়নি। <a href="#/skins">← Skins</a></div>'; return; }
  S.made = true;
  const groups = groupLabels(skin.zones);
  const fontNames = [...S.fonts.map((f) => f.family), ...BASE_FONTS];
  const vals = {};
  groups.forEach((z) => (vals[z.label] = { text: '', font: z.font || fontNames[0], color: z.color || '#ffffff' }));
  v.innerHTML = `<div class="wrap"><div class="gen">
    <div class="card glow stage"><canvas id="cv" width="1024" height="1024"></canvas><p class="c mut small" style="margin-top:8px">Live preview — final PNG পাবেন full quality তে</p></div>
    <div><a href="#/skins" class="mut small">← সব skin</a>
      <h2 style="margin:8px 0 6px" class="grad">${esc(skin.name)}</h2>
      <p style="margin-bottom:18px"><span class="badge ${skin.type}">${skin.type === 'paid' ? '⚡ ' + skin.price + ' CREDITS' : 'FREE · WATCH AD'}</span> <span class="mut small">&nbsp;${esc(skin.category || '')}</span></p>
      <div class="card">
        ${groups.length ? groups.map((z, i) => `<div class="field"><label>${esc(z.label)} text</label>
          <input class="inp" data-i="${i}" data-k="text" maxlength="40" placeholder="${esc(z.label)} এ কী লিখবেন…">
          <div class="row" style="margin-top:8px"><select class="inp" data-i="${i}" data-k="font">${fontNames.map((f) => `<option ${f === vals[z.label].font ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select><input class="inp" type="color" data-i="${i}" data-k="color" value="${esc(vals[z.label].color)}"></div></div>`).join('') : '<p class="mut">এই skin এ লেখার জায়গা সেট করা নেই।</p>'}
        <button class="btn big" id="genBtn" style="width:100%">⚡ Generate &amp; Download</button>
        <a class="btn" href="#/studio/${skin.id}" style="width:100%;margin-top:10px">🎨 Full Edit Mode — Studio তে সাজান</a>
      </div></div></div></div>`;
  const cv = $('#cv'), ctx = cv.getContext('2d');
  const img = new Image();
  const redraw = () => {
    if (!img.naturalWidth) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    drawZones(ctx, cv.width, cv.height, skin.zones, vals);
  };
  S.redraw = redraw;
  img.onload = () => { cv.width = img.naturalWidth; cv.height = img.naturalHeight; redraw(); };
  img.src = skin.preview;
  $$('[data-i]').forEach((el) => {
    const upd = async () => {
      const z = groups[el.dataset.i];
      vals[z.label][el.dataset.k] = el.value;
      if (el.dataset.k === 'font') await ensureFont(el.value);
      redraw();
    };
    el.oninput = upd; el.onchange = upd;
  });
  fontNames.forEach(ensureFont);
  $('#genBtn').onclick = () => generate(skin, groups, vals, $('#genBtn'));
}

async function generate(skin, groups, vals, btn) {
  if (!S.user) return loginModal('Login করে Generate করুন');
  if (!groups.some((g) => vals[g.label].text.trim())) return toast('কমপক্ষে একটি জায়গায় লেখা দিন', 'err');
  let sid = null;
  if (skin.type === 'paid') { if (!(await confirmPaid(skin))) return; }
  else if (S.cfg.ads && S.cfg.ads.enabled !== false) { const r = await runAd('download', skin.id); if (!r) return; sid = r.sid; }
  btn.disabled = true; const old = btn.textContent; btn.textContent = 'Generating…';
  try {
    const t = await auth.currentUser.getIdToken();
    const r = await fetch(API + '/api/skin/get', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: JSON.stringify({ skinId: skin.id, sid }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed');
    const bmp = await createImageBitmap(await r.blob());
    const c = document.createElement('canvas');
    c.width = bmp.width; c.height = bmp.height;
    const x = c.getContext('2d');
    x.drawImage(bmp, 0, 0);
    await Promise.all(groups.map((g) => ensureFont(vals[g.label].font)));
    drawZones(x, c.width, c.height, skin.zones, vals);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    const url = URL.createObjectURL(blob);
    const first = groups.map((g) => vals[g.label].text.trim()).find(Boolean) || 'skin';
    const fname = (skin.name + '-' + first).replace(/[^\w\-]+/g, '_') + '.png';
    const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">✅ Your skin is ready!</h3><img src="${url}" style="border-radius:10px;margin:10px 0;background:#0b0f20"><a class="btn" id="dl" href="${url}" download="${esc(fname)}" style="width:100%">⬇ Download PNG</a><p class="mut small c" style="margin-top:10px">ডাউনলোড না হলে উপরের বাটনে চাপুন</p>`, { wide: true });
    ov.querySelector('#dl').click();
  } catch (e) { toast(e.message, 'err'); }
  btn.disabled = false; btn.textContent = old;
}

function confirmPaid(skin) {
  return new Promise((resolve) => {
    const bal = (S.me && S.me.credits) || 0, ok = bal >= skin.price;
    const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">Premium Skin</h3><p>এই skin এর জন্য <b style="color:var(--warn)">${skin.price} credit</b> কাটা হবে।</p><p class="mut" style="margin:8px 0 18px">আপনার balance: <b>${bal}</b> credit</p>${ok ? '<button class="btn" id="yes" style="width:100%">Confirm &amp; Generate</button>' : '<a class="btn" href="#/wallet" id="buy" style="width:100%">Credit কিনুন / আয় করুন</a>'}`);
    let done = false;
    ov.onClose = () => !done && resolve(false);
    const y = $('#yes', ov); if (y) y.onclick = () => { done = true; ov.close(); resolve(true); };
    const b = $('#buy', ov); if (b) b.onclick = () => ov.close();
  });
}

/* ---------- ad runner ---------- */
function runAd(purpose, skinId) {
  return new Promise(async (resolve) => {
    let st;
    try { st = await api('/api/ad/start', { purpose, skinId }); } catch (e) { toast(e.message, 'err'); return resolve(null); }
    const ads = S.cfg.ads || {};
    const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">Sponsor Break</h3><p class="mut small" style="margin-bottom:10px">Ad শেষ হলে Continue চালু হবে — একটু অপেক্ষা করুন</p><div class="adbox" id="adbox"></div>${ads.smartlink ? `<p class="c" style="margin-top:10px"><a class="btn ghost sm" href="${esc(ads.smartlink)}" target="_blank" rel="noopener">Visit sponsor ↗</a></p>` : ''}<div class="prog"><i id="pg"></i></div><button class="btn big" id="adGo" disabled style="width:100%">Wait <span id="adT">${st.wait}</span>s</button>`);
    const box = $('#adbox', ov);
    if (ads.modalHtml) { const f = document.createElement('iframe'); f.setAttribute('sandbox', FRAME_SB); f.srcdoc = `<body style="margin:0;display:flex;justify-content:center;background:#000">${ads.modalHtml}</body>`; box.appendChild(f); }
    else box.innerHTML = '<span class="mut">Ad space</span>';
    let done = false, result = null;
    ov.onClose = () => { clearInterval(iv); resolve(done ? result : null); };
    const t0 = Date.now(), go = $('#adGo', ov);
    let completing = false;
    const iv = setInterval(async () => {
      const left = st.wait - (Date.now() - t0) / 1000;
      $('#pg', ov).style.width = Math.min(100, ((st.wait - left) / st.wait) * 100) + '%';
      if (left > 0) { $('#adT', ov).textContent = Math.ceil(left); return; }
      if (completing) return;
      completing = true;
      try {
        const res = await api('/api/ad/complete', { sid: st.sid, purpose });
        clearInterval(iv); done = true; result = { sid: st.sid, res };
        go.disabled = false; go.textContent = purpose === 'earn' ? `🎉 +${res.amount} credit` : 'Continue ▶';
      } catch (e) {
        if (/অপেক্ষা/.test(e.message)) completing = false;
        else { clearInterval(iv); toast(e.message, 'err'); ov.onClose = null; ov.remove(); resolve(null); }
      }
    }, 400);
    go.onclick = () => ov.close();
  });
}

/* ---------- studio ---------- */
function tplMini(t) {
  const sk = S.skins.find((x) => x.id === t.skinId) || S.skins[0];
  if (!sk) return '';
  const L = miniLayersHtml(t.layers, (id) => S.assets.find((x) => x.id === id), esc);
  return `<div class="card glow skin tpl" data-id="${t.id}"><div class="im mm"><div class="mini" style="aspect-ratio:${sk.w || 1}/${sk.h || 1}"><img class="bs" src="${esc(sk.preview)}" alt="">${L}</div><div class="tags"><span class="badge new">TEMPLATE</span>${t.price > 0 ? `<span class="badge paid">⚡ +${t.price}</span>` : ''}</div></div><div class="meta"><h4>${esc(t.name)}</h4><div><span>${esc(t.category || '—')}</span>${S.coll[t.id] ? '<span>✅ Collected</span>' : '<span>📥 Collect</span>'}</div></div></div>`;
}
function tplModal(t) {
  const sk = S.skins.find((x) => x.id === t.skinId) || S.skins[0];
  const L = miniLayersHtml(t.layers, (id) => S.assets.find((x) => x.id === id), esc);
  const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">${esc(t.name)}</h3>
    <div class="mini" style="aspect-ratio:${sk.w || 1}/${sk.h || 1};max-width:420px;margin:10px auto;border-radius:12px"><img class="bs" src="${esc(sk.preview)}" alt="">${L}</div>
    <p class="mut small c">${esc(t.category || '')} ${t.price > 0 ? ' · ⚡ ' + t.price + ' credit (Export এর সময়)' : ' · Free'}<br>এই ডিজাইন যেকোনো skin বা নিজের PNG এর উপর বসানো যায়।</p>
    <div class="lact" style="margin-top:12px;justify-content:center"><button class="btn ghost" id="tcol">${S.coll[t.id] ? '✅ Collected — সরান' : '📥 Collect'}</button><button class="btn" id="tuse">🎨 Studio তে ব্যবহার করুন</button></div>`);
  $('#tcol', ov).onclick = async () => {
    if (!S.user) return loginModal('Login করে Collect করুন');
    const r = ref(db, 'collected/' + S.user.uid + '/' + t.id);
    try { S.coll[t.id] ? await remove(r) : await set(r, true); toast(S.coll[t.id] ? 'Collection থেকে সরানো হয়েছে' : 'Collection এ যোগ হয়েছে ✅'); ov.close(); } catch (e) { toast(e.message, 'err'); }
  };
  $('#tuse', ov).onclick = () => { ov.close(); baseModal(t); };
}
function baseModal(t) {
  const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">কোন skin এর উপর বসাবেন?</h3>
    <p class="mut small" style="margin-bottom:10px">Template: <b>${esc(t.name)}</b> — একটি skin বেছে নিন, বা নিজের PNG দিন।</p>
    <label class="btn ghost" style="width:100%;cursor:pointer;margin-bottom:12px">📤 নিজের Skin PNG দিয়ে<input type="file" id="bown" accept="image/png,image/jpeg" class="hide"></label>
    <div class="grid" id="bsg" style="grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;max-height:52vh;overflow:auto">${S.skins.map((s) => `<div class="card skin" data-s="${s.id}" style="padding:6px;cursor:pointer"><img src="${esc(s.preview)}" alt="" style="width:100%;border-radius:8px"><p class="small c" style="margin-top:4px">${esc(s.name)}</p></div>`).join('')}</div>`, { wide: true });
  $$('[data-s]', ov).forEach((c) => (c.onclick = () => { ov.close(); location.hash = '#/studio/' + c.dataset.s + '/' + t.id; }));
  $('#bown', ov).onchange = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (!/^image\/(png|jpeg)$/.test(f.type)) return toast('শুধু PNG বা JPG দিন', 'err');
    if (S.ownUrl) URL.revokeObjectURL(S.ownUrl);
    S.ownFile = f; S.ownUrl = URL.createObjectURL(f); S.ownTpl = t.id; ov.close(); location.hash = '#/studio/own';
  };
}

function viewStudio(id, tid) {
  const v = $('#view');
  if (id === 'own') {
    if (!S.ownFile) { location.hash = '#/studio'; return; }
    S.made = true;
    const skin = { id: 'own', name: 'My skin', type: 'free', preview: S.ownUrl, own: true };
    const ot = S.ownTpl ? S.templates.find((x) => x.id === S.ownTpl) : null; S.ownTpl = null;
    const ctl = mountStudio(v, skin, studioCtx(), { own: S.ownFile, template: ot });
    S.studioDestroy = ctl.destroy;
    return;
  }
  if (!id) {
    const tab = S.stTab || 'tpl';
    v.innerHTML = `<div class="wrap sec"><div class="sec-h"><h2>Skin <span class="grad">Studio</span></h2></div>
      <div class="chips" style="margin-bottom:20px"><span class="chip ${tab === 'tpl' ? 'on' : ''}" data-t="tpl">🎯 Templates</span><span class="chip ${tab === 'coll' ? 'on' : ''}" data-t="coll">📚 My Collection${Object.keys(S.coll).length ? ' (' + Object.keys(S.coll).length + ')' : ''}</span><span class="chip ${tab === 'skin' ? 'on' : ''}" data-t="skin">🚌 Base skins</span><span class="chip ${tab === 'own' ? 'on' : ''}" data-t="own">📤 My own PNG</span></div><div id="stc"></div></div>`;
    $$('.chips .chip', v).forEach((c) => (c.onclick = () => { S.stTab = c.dataset.t; clearTimers(); viewStudio(); }));
    const box = $('#stc');
    if (tab === 'tpl' || tab === 'coll') {
      const l = S.skins.length ? S.templates.filter((t) => tab === 'tpl' || S.coll[t.id]) : [];
      const msg = tab === 'tpl' ? 'Template বেছে 📥 Collect করুন, তারপর যেকোনো skin বা নিজের PNG এর উপর বসিয়ে বদলান।' : S.user ? 'আপনার Collect করা template এখানে থাকবে।' : 'Collection দেখতে Login করুন।';
      box.innerHTML = `<p class="mut" style="margin-bottom:16px">${msg}</p><div class="grid">${l.length ? l.map(tplMini).join('') : '<div class="empty" style="grid-column:1/-1">' + (tab === 'tpl' ? 'এখনো কোনো template নেই' : 'এখনো কিছু Collect করা হয়নি') + '</div>'}</div>`;
      $$('.tpl', box).forEach((c) => (c.onclick = () => tplModal(S.templates.find((x) => x.id === c.dataset.id))));
    } else if (tab === 'skin') {
      const l = S.skins;
      box.innerHTML = `<p class="mut" style="margin-bottom:16px">একটি base skin বেছে নিন — তারপর Banner, Shape, Sticker, Name design ইত্যাদি টেনে এনে নিজের মতো সাজান।</p><div class="grid" id="sg">${l.length ? l.map(skinCard).join('') : '<div class="empty" style="grid-column:1/-1">এখনো কোনো skin নেই</div>'}</div>`;
      bindSkinCards($('#sg'), 'studio');
    } else {
      box.innerHTML = `<div class="card glow" style="max-width:560px"><h3 class="grad" style="margin-bottom:8px">নিজের Skin PNG দিয়ে শুরু করুন</h3><p class="mut" style="margin-bottom:14px">আপনার নিজের বানানো BUSSID skin/template (PNG বা JPG) সিলেক্ট করুন, তারপর আমাদের সব ডিজাইন দিয়ে সাজান।</p><input class="inp" type="file" id="ownF" accept="image/png,image/jpeg"><p class="mut small" style="margin-top:10px">🔒 আপনার ফাইল আপলোড হয় না — শুধু আপনার ব্রাউজারেই থাকে। শুধু ব্যবহার করা Paid ডিজাইনের দাম লাগে; সব Free হলে ১টি ad।</p></div>`;
      $('#ownF').onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        if (!/^image\/(png|jpeg)$/.test(f.type)) return toast('শুধু PNG বা JPG দিন', 'err');
        if (f.size > 30 * 1024 * 1024) return toast('ফাইল ৩০MB এর বেশি', 'err');
        if (S.ownUrl) URL.revokeObjectURL(S.ownUrl);
        S.ownFile = f; S.ownUrl = URL.createObjectURL(f);
        location.hash = '#/studio/own';
      };
    }
    return;
  }
  const skin = S.skins.find((s) => s.id === id);
  if (!skin) { v.innerHTML = '<div class="wrap empty">Skin পাওয়া যায়নি। <a href="#/studio">← Studio</a></div>'; return; }
  if (skin.releaseAt && skin.releaseAt > Date.now()) { v.innerHTML = '<div class="wrap empty">এই skin শীঘ্রই আসছে ⏳ <a href="#/studio">← Studio</a></div>'; return; }
  const tpl = tid ? S.templates.find((t) => t.id === tid) : null;
  if (tid && !tpl) toast('Template পাওয়া যায়নি', 'err');
  S.made = true;
  const ctl = mountStudio(v, skin, studioCtx(), { template: tpl });
  S.studioDestroy = ctl.destroy;
}
async function toggleFav(id) {
  if (!S.user) return loginModal('Login করে Favorite করুন');
  const r = ref(db, 'favorites/' + S.user.uid + '/' + id);
  try { S.favs[id] ? await remove(r) : await set(r, true); } catch (e) { toast(e.message, 'err'); }
}
const studioCtx = () => ({ S, esc, toast, modal, api, runAd, auth, API, loginModal, BASE_FONTS, ensureFont, favs: () => S.favs, toggleFav, onAssets: (f) => (S.editorRefresh = f) });

/* ---------- wallet ---------- */
function viewWallet() {
  const v = $('#view');
  if (!S.user) { v.innerHTML = '<div class="wrap empty card" style="margin-top:30px"><h3 class="grad" style="margin-bottom:12px">Wallet</h3><p style="margin-bottom:18px">Credit দেখতে ও কিনতে Login করুন</p><button class="btn" id="wl">Login</button></div>'; $('#wl').onclick = () => loginModal(); return; }
  const pk = arr(S.cfg.packages).sort((a, b) => (a.credits || 0) - (b.credits || 0));
  const daily = Number(S.cfg.credits && S.cfg.credits.daily) || 0;
  v.innerHTML = `<div class="wrap sec">
    <div class="card glow" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap"><div><span class="mut small">YOUR BALANCE</span><h1 class="grad" style="font-size:46px">⚡ ${S.me ? S.me.credits || 0 : 0}</h1></div>${daily ? `<button class="btn" id="dailyBtn">🎁 Daily bonus +${daily}</button>` : ''}</div>
    <div style="margin-top:18px">${earnCard()}</div>
    <div class="sec-h" style="margin-top:34px"><h2>Buy <span class="grad">Credits</span></h2></div>
    ${pk.length ? `<div class="pk">${pk.map((p) => `<div class="card glow"><h4>${esc(p.name)}</h4><div class="cr grad">${p.credits}</div><span class="mut small">CREDITS</span><div class="pr">৳${esc(p.price)}</div><button class="btn sm" data-buy="${p.id}">Buy now</button></div>`).join('')}</div>` : '<div class="card empty">এখনো কোনো package নেই</div>'}
    <div class="sec-h" style="margin-top:34px"><h2>My <span class="grad">Orders</span></h2></div>
    <div class="card" style="overflow:auto">${S.orders.length ? `<table><tr><th>Date</th><th>Package</th><th>TrxID</th><th>Status</th></tr>${S.orders.map((o) => `<tr><td>${fmtDate(o.createdAt)}</td><td>${esc(o.packageName)} (${o.credits})</td><td>${esc(o.trx)}</td><td><span class="st ${o.status}">${o.status}</span></td></tr>`).join('')}</table>` : '<p class="mut">কোনো order নেই</p>'}</div>
    <div class="sec-h" style="margin-top:34px"><h2>Credit <span class="grad">History</span></h2></div>
    <div class="card" style="overflow:auto">${S.tx.length ? `<table><tr><th>Date</th><th>Note</th><th>Amount</th><th>Balance</th></tr>${S.tx.map((t) => `<tr><td>${fmtDate(t.at)}</td><td>${esc(t.note || t.type)}</td><td style="color:${t.amount > 0 ? 'var(--ok)' : 'var(--bad)'}">${t.amount > 0 ? '+' : ''}${t.amount}</td><td>${t.balance}</td></tr>`).join('')}</table>` : '<p class="mut">কোনো লেনদেন নেই</p>'}</div></div>`;
  bindEarn();
  const d = $('#dailyBtn');
  d && (d.onclick = async () => { try { const r = await api('/api/daily'); toast(`+${r.amount} credit পেয়েছেন 🎁`); } catch (e) { toast(e.message, 'err'); } });
  $$('[data-buy]').forEach((b) => (b.onclick = () => buyModal(pk.find((p) => p.id === b.dataset.buy))));
}
function buyModal(p) {
  const pay = S.cfg.payment || {};
  const ov = modal(`<button class="x" data-close>×</button><h3 class="grad">${esc(p.name)} — ৳${esc(p.price)}</h3>
    <div class="card" style="margin-bottom:14px;background:rgba(0,229,255,.06)"><p>নিচের নম্বরে <b>Send Money</b> করুন:</p>${pay.bkash ? `<p>bKash: <b>${esc(pay.bkash)}</b></p>` : ''}${pay.nagad ? `<p>Nagad: <b>${esc(pay.nagad)}</b></p>` : ''}${pay.note ? `<p class="mut small" style="margin-top:6px">${esc(pay.note)}</p>` : ''}</div>
    <div class="field"><label>Method</label><select class="inp" id="bm"><option>bKash</option><option>Nagad</option></select></div>
    <div class="field"><label>Your number (sender)</label><input class="inp" id="bs" placeholder="01XXXXXXXXX"></div>
    <div class="field"><label>Transaction ID</label><input class="inp" id="bt" placeholder="8N7A6D5E4C"></div>
    <button class="btn" id="bgo" style="width:100%">Submit order</button><p class="mut small c" style="margin-top:10px">Admin verify করলে credit যোগ হবে</p>`);
  $('#bgo', ov).onclick = async () => {
    try { await api('/api/order', { packageId: p.id, method: $('#bm', ov).value, sender: $('#bs', ov).value.trim(), trx: $('#bt', ov).value.trim() }); toast('Order জমা হয়েছে ✅ Verify এর অপেক্ষায়'); ov.close(); } catch (e) { toast(e.message, 'err'); }
  };
}
