// "Get the App" পেজ — config/app (admin এর App Update পেজ থেকে) পড়ে
export function viewAppDl(v, { S, esc, toast, fmtDate }) {
  const ap = (S.cfg && S.cfg.app) || {};
  const MB = (b) => (b ? (b / 1048576).toFixed(1) + ' MB' : '');
  const notes = String(ap.notes || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const has = !!ap.url;
  v.innerHTML = `<section class="wrap" style="max-width:860px;padding:28px 0">
    <div class="card glow" style="padding:34px 26px;text-align:center;overflow:hidden;position:relative">
      <div style="position:absolute;inset:-40% -20% auto -20%;height:70%;background:radial-gradient(closest-side,rgba(139,92,246,.35),transparent);pointer-events:none"></div>
      <div style="position:relative">
        <div style="font-size:64px;line-height:1;filter:drop-shadow(0 0 22px rgba(0,229,255,.6))">🚌</div>
        <h1 class="grad" style="margin:10px 0 4px">LiveryLab for Android</h1>
        <p class="mut">Bus skin ডিজাইন করুন সরাসরি ফোনেই — Studio, Templates, Export সব এক অ্যাপে</p>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:16px 0">
          ${has ? `<span class="badge free">v${esc(ap.versionName || '')}</span>${ap.size ? `<span class="badge">${MB(ap.size)}</span>` : ''}${ap.updatedAt ? `<span class="badge">${fmtDate(ap.updatedAt)}</span>` : ''}<span class="badge">Android 5.0+</span>` : '<span class="badge">Coming soon</span>'}
        </div>
        ${has ? `<a class="btn" id="dl" href="${esc(ap.url)}" rel="noopener" style="font-size:15px;padding:16px 34px">⬇ Download APK</a>
        <div style="margin-top:12px"><button class="btn ghost sm" id="cp">🔗 লিংক কপি</button></div>` : '<p class="mut">APK শীঘ্রই আসছে — একটু অপেক্ষা করুন।</p>'}
        ${ap.sha ? `<p class="small mut" style="margin-top:14px;word-break:break-all">SHA-256: <code>${esc(ap.sha)}</code></p>` : ''}
      </div>
    </div>
    ${notes.length ? `<div class="card" style="margin-top:18px"><h3 class="grad" style="margin-bottom:10px">✨ এই ভার্সনে নতুন</h3><ul style="padding-left:20px;line-height:1.9">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : ''}
    <div class="card" style="margin-top:18px"><h3 class="grad" style="margin-bottom:10px">📲 Install করার নিয়ম</h3>
      <ol style="padding-left:20px;line-height:1.9"><li>উপরের <b>Download APK</b> চাপুন, ফাইল নামলে ট্যাপ করুন।</li><li>“Install unknown apps” চাইলে <b>Allow</b> করুন (Chrome / Files অ্যাপের জন্য)।</li><li><b>Install</b> চাপুন — হয়ে গেলে LiveryLab খুলুন।</li><li>আগে থেকে অ্যাপ থাকলে অ্যাপ নিজেই নতুন update দেখাবে ও install করে দেবে।</li></ol></div>
  </section>`;
  const cp = v.querySelector('#cp');
  if (cp) cp.onclick = () => { (navigator.clipboard ? navigator.clipboard.writeText(ap.url) : Promise.reject()).then(() => toast('লিংক কপি হয়েছে'), () => toast('কপি হয়নি', 'err')); };
}
