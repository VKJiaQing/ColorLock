function rand(n) { return Math.random() * n; }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function hslToRgb(h, s, l) {
  h = h % 360; if (h < 0) h += 360;
  s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) { r = c; g = x; b = 0; }
  else if (hp >= 1 && hp < 2) { r = x; g = c; b = 0; }
  else if (hp >= 2 && hp < 3) { r = 0; g = c; b = x; }
  else if (hp >= 3 && hp < 4) { r = 0; g = x; b = c; }
  else if (hp >= 4 && hp < 5) { r = x; g = 0; b = c; }
  else if (hp >= 5 && hp <= 6) { r = c; g = 0; b = x; }
  const m = l - c / 2;
  return [r + m, g + m, b + m].map(v => clamp(Math.round(v * 255), 0, 255));
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function hslToHex(h, s, l) { const [r, g, b] = hslToRgb(h, s, l); return rgbToHex(r, g, b); }
function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}
function srgbToLinear(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function relLuminance(hex) {
  const [r, g, b] = hexToRgb(hex);
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}
function contrastRatio(a, b) {
  const L1 = relLuminance(a), L2 = relLuminance(b);
  const maxL = Math.max(L1, L2), minL = Math.min(L1, L2);
  return (maxL + 0.05) / (minL + 0.05);
}
function genPoorContrast(count) {
  const baseH = Math.floor(rand(360));
  const baseS = 0.2 + rand(0.25);
  const baseL = 0.40 + rand(0.15);
  const colors = [];
  for (let i = 0; i < count; i++) {
    const h = baseH + rand(20) - 10;
    const s = clamp(baseS + rand(0.08) - 0.04, 0.1, 0.5);
    const l = clamp(baseL + rand(0.08) - 0.04, 0.30, 0.70);
    colors.push(hslToHex(h, s, l));
  }
  let tries = 0;
  while (tries < 200) {
    const worst = Math.max(...colors.map(c1 => Math.max(...colors.map(c2 => contrastRatio(c1, c2)))));
    if (worst <= 3.2) break;
    for (let i = 0; i < colors.length; i++) {
      const [r, g, b] = hexToRgb(colors[i]);
      const f = 0.98;
      colors[i] = rgbToHex(Math.round(r * f), Math.round(g * f), Math.round(b * f));
    }
    tries++;
  }
  return colors;
}
const countEl = document.getElementById('count');
const genBtn = document.getElementById('generate');
const paletteEl = document.getElementById('palette');
const colorAEl = document.getElementById('colorA');
const colorBEl = document.getElementById('colorB');
const checkBtn = document.getElementById('check');
const ratioEl = document.getElementById('ratio');
const wcagEl = document.getElementById('wcag');
const mapEls = {
  bg: document.getElementById('map-bg'),
  surface: document.getElementById('map-surface'),
  text: document.getElementById('map-text'),
  accent: document.getElementById('map-accent'),
  border: document.getElementById('map-border')
};
const applyBtn = document.getElementById('apply');
let currentPalette = [];
let selectStage = 'A';
function renderPalette(colors) {
  paletteEl.innerHTML = '';
  colors.forEach((hex, idx) => {
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.dataset.index = String(idx);
    const fill = document.createElement('div');
    fill.className = 'fill';
    fill.style.background = hex;
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = hex.toUpperCase();
    sw.appendChild(fill);
    sw.appendChild(label);
    sw.addEventListener('click', () => {
      if (selectStage === 'A') { colorAEl.value = hex; selectStage = 'B'; }
      else { colorBEl.value = hex; selectStage = 'A'; }
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
    paletteEl.appendChild(sw);
  });
}
function populateMapping(colors) {
  Object.values(mapEls).forEach(sel => { sel.innerHTML = ''; });
  colors.forEach((hex, i) => {
    Object.values(mapEls).forEach(sel => {
      const opt = document.createElement('option');
      opt.value = hex;
      opt.textContent = `${i + 1}: ${hex}`;
      sel.appendChild(opt);
    });
  });
  if (colors[0]) mapEls.bg.value = colors[0];
  if (colors[1]) mapEls.surface.value = colors[1];
  if (colors[2]) mapEls.text.value = colors[2];
  if (colors[3]) mapEls.accent.value = colors[3];
  mapEls.border.value = colors[0] || colors[1] || colors[2] || colors[3] || '#cccccc';
}
function applyMapping() {
  const r = document.documentElement;
  r.style.setProperty('--bg', mapEls.bg.value);
  r.style.setProperty('--surface', mapEls.surface.value);
  r.style.setProperty('--text', mapEls.text.value);
  r.style.setProperty('--accent', mapEls.accent.value);
  r.style.setProperty('--border', mapEls.border.value);
}
function updateChecker(a, b) {
  const ratio = contrastRatio(a, b);
  ratioEl.textContent = `Ratio: ${ratio.toFixed(2)}:1`;
  const aaNormal = ratio >= 4.5;
  const aaLarge = ratio >= 3.0;
  const aaaNormal = ratio >= 7.0;
  const aaaLarge = ratio >= 4.5;
  wcagEl.innerHTML = '';
  const mk = (label, pass) => {
    const div = document.createElement('div');
    div.className = pass ? 'pass' : 'fail';
    div.textContent = `${label}: ${pass ? 'Pass' : 'Fail'}`;
    return div;
  };
  wcagEl.appendChild(mk('WCAG AA Normal (4.5:1)', aaNormal));
  wcagEl.appendChild(mk('WCAG AA Large (3:1)', aaLarge));
  wcagEl.appendChild(mk('WCAG AAA Normal (7:1)', aaaNormal));
  wcagEl.appendChild(mk('WCAG AAA Large (4.5:1)', aaaLarge));
}
genBtn.addEventListener('click', () => {
  const count = parseInt(countEl.value, 10);
  currentPalette = genPoorContrast(count);
  renderPalette(currentPalette);
  populateMapping(currentPalette);
});
applyBtn.addEventListener('click', () => { applyMapping(); });
checkBtn.addEventListener('click', () => { updateChecker(colorAEl.value, colorBEl.value); });
document.addEventListener('DOMContentLoaded', () => {
  currentPalette = genPoorContrast(parseInt(countEl.value, 10));
  renderPalette(currentPalette);
  populateMapping(currentPalette);
  applyMapping();
  updateChecker(colorAEl.value, colorBEl.value);
});
