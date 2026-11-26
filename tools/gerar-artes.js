// Gera as artes provisórias (banners, logo, capas) em assets/images/art.
// Uso: node tools/gerar-artes.js
'use strict';

const fs = require('fs');
const path = require('path');
require('../assets/js/glasses-art.js');
const { glassesGroup } = globalThis.GlassesArt;

const out = path.join(__dirname, '..', 'assets', 'images', 'art');
fs.mkdirSync(out, { recursive: true });
const save = (name, svg) => fs.writeFileSync(path.join(out, name), svg.replace(/\n\s+/g, '\n'));

let uid = 1000;

// Cena de pôr do sol com óculos grande
function scene(w, h, { sky, sun, sea, glasses, gx, gy, scale, rotate = -6 }) {
  const id = ++uid;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="s${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/>
    </linearGradient>
    <linearGradient id="m${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sea[0]}"/><stop offset="1" stop-color="${sea[1]}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#s${id})"/>
  <circle cx="${gx}" cy="${h * 0.62}" r="${h * 0.3}" fill="${sun}" opacity=".9"/>
  <rect y="${h * 0.66}" width="${w}" height="${h * 0.34}" fill="url(#m${id})"/>
  ${[0.7, 0.75, 0.81, 0.88].map((y, i) => `<rect x="${gx - h * (0.24 - i * 0.04)}" y="${h * y}" width="${h * (0.48 - i * 0.08)}" height="${3 + i}" rx="2" fill="${sun}" opacity="${0.55 - i * 0.1}"/>`).join('')}
  <g transform="translate(${gx},${gy}) rotate(${rotate}) scale(${scale})">${glassesGroup(glasses, id)}</g>
</svg>`;
}

save('banner-1.svg', scene(1600, 600, {
  sky: ['#302c9b', '#302c9b'], sun: '#dbe6ff', sea: ['#231f78', '#231f78'],
  glasses: { formato: 'aviador', armacao: '#c9a24a', lente: '#3c4b3a' }, gx: 960, gy: 230, scale: 1.7
}));
save('banner-2.svg', scene(1600, 600, {
  sky: ['#302c9b', '#302c9b'], sun: '#eef3ff', sea: ['#231f78', '#231f78'],
  glasses: { formato: 'gatinho', armacao: '#7a2e3a', lente: '#4a2a2a' }, gx: 960, gy: 230, scale: 1.7, rotate: 4
}));
save('banner-3.svg', scene(1600, 600, {
  sky: ['#302c9b', '#302c9b'], sun: '#a9c3ff', sea: ['#231f78', '#231f78'],
  glasses: { formato: 'esportivo', armacao: '#111111', lente: '#2b6bd6', espelhado: true }, gx: 960, gy: 230, scale: 1.55
}));
save('cta.svg', scene(800, 800, {
  sky: ['#302c9b', '#302c9b'], sun: '#e3ecff', sea: ['#231f78', '#231f78'],
  glasses: { formato: 'redondo', armacao: '#3b2a1a', lente: '#6b4a2b' }, gx: 400, gy: 300, scale: 1.9
}));
save('newsletter.svg', scene(400, 400, {
  sky: ['#302c9b', '#302c9b'], sun: '#f3f7ff', sea: ['#231f78', '#231f78'],
  glasses: { formato: 'wayfarer', armacao: '#1d1d1f', lente: '#2b2b2b' }, gx: 200, gy: 170, scale: 1.05
}));

// Capas do blog/guia
const covers = [
  ['guia-1.svg', ['#e8efff', '#c7d8ff'], { formato: 'quadrado', armacao: '#1d1d1f', lente: '#3a3a3a' }],
  ['guia-2.svg', ['#dfe8ff', '#a9c3ff'], { formato: 'aviador', armacao: '#b8b8b8', lente: '#2a5a3a' }],
  ['guia-3.svg', ['#d3e0ff', '#8fb0fb'], { formato: 'esportivo', armacao: '#222', lente: '#c0392b', espelhado: true }],
  ['guia-4.svg', ['#eef3ff', '#b9cdff'], { formato: 'oversized', armacao: '#5a3825', lente: '#7a4a2b' }]
];
for (const [name, bg, g] of covers) {
  const id = ++uid;
  save(name, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <defs><linearGradient id="c${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs>
  <rect width="600" height="400" fill="url(#c${id})"/>
  <g transform="translate(300,200) rotate(-5) scale(1.3)">${glassesGroup(g, id)}</g>
</svg>`);
}

// Favicon

// Favicon provisório (letra A). No site, script.js redesenha com a fonte do logo.
save('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <text x="32" y="52" text-anchor="middle" font-family="Playfair Display, Georgia, 'Times New Roman', serif" font-size="56" font-weight="700" fill="#302c9b" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" paint-order="stroke">A</text>
</svg>`);

console.log('Artes geradas em', out);
