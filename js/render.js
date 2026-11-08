// Canvas এ skin এর ফাঁকা জায়গায় লেখা বসানোর ইঞ্জিন
// zone = { label, x,y,w,h (0..1 অনুপাত), rot, font, color, size, weight, align, stroke, strokeW, shadow, upper, mirror }
export function drawZones(ctx, W, H, zones, vals) {
  for (const z of zones || []) {
    const v = (vals && vals[z.label]) || {};
    let text = String(v.text || '').trim();
    if (!text) continue;
    if (z.upper) text = text.toUpperCase();
    const font = v.font || z.font || 'Arial';
    const color = v.color || z.color || '#ffffff';
    const bw = z.w * W, bh = z.h * H;
    const cx = (z.x + z.w / 2) * W, cy = (z.y + z.h / 2) * H;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((z.rot || 0) * Math.PI) / 180);
    if (z.mirror) ctx.scale(-1, 1);
    let size = bh * (z.size || 0.85);
    const setF = () => (ctx.font = `${z.weight || 800} ${size}px "${font}", sans-serif`);
    setF();
    while (ctx.measureText(text).width > bw && size > 6) { size *= 0.95; setF(); }
    ctx.textBaseline = 'middle';
    const al = z.align || 'center';
    ctx.textAlign = al;
    const ax = al === 'left' ? -bw / 2 : al === 'right' ? bw / 2 : 0;
    if (z.shadow) { ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = size * 0.12; ctx.shadowOffsetY = size * 0.05; }
    if (z.stroke && z.strokeW > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * z.strokeW;
      ctx.strokeStyle = z.stroke;
      ctx.strokeText(text, ax, 0);
      ctx.shadowColor = 'transparent';
    }
    ctx.fillStyle = color;
    ctx.fillText(text, ax, 0);
    ctx.restore();
  }
}

export function groupLabels(zones) {
  const map = new Map();
  for (const z of zones || []) if (z.label && !map.has(z.label)) map.set(z.label, z);
  return [...map.values()];
}
