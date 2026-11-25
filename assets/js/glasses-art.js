'use strict';

/*
 * Ilustrações vetoriais de óculos de sol.
 * Servem de imagem provisória enquanto você não tem fotos reais dos produtos:
 * basta preencher o campo "imagem" do produto em products.js para usar uma foto.
 */

(function (root) {

  // Contorno da lente ESQUERDA, centrada em (0,0). O lado "externo" é o x negativo.
  const LENS = {
    redondo:   'M 0,-44 A 44,44 0 1 1 0,44 A 44,44 0 1 1 0,-44 Z',
    aviador:   'M -50,-30 Q -4,-44 46,-30 Q 52,6 34,34 Q 6,56 -26,40 Q -54,18 -50,-30 Z',
    wayfarer:  'M -54,-34 L 48,-34 Q 54,-32 50,-4 Q 44,32 12,34 L -24,34 Q -46,32 -50,4 Z',
    gatinho:   'M -56,-42 Q -10,-34 46,-26 Q 52,10 28,30 Q 0,42 -26,32 Q -50,18 -56,-42 Z',
    quadrado:  'M -40,-36 L 40,-36 Q 48,-36 48,-28 L 48,26 Q 48,34 40,34 L -40,34 Q -48,34 -48,26 L -48,-28 Q -48,-36 -40,-36 Z',
    hexagonal: 'M -24,-40 L 24,-40 L 48,0 L 24,40 L -24,40 L -48,0 Z',
    oversized: 'M -58,-40 Q -6,-50 50,-38 Q 58,10 36,40 Q 6,58 -30,46 Q -62,26 -58,-40 Z'
  };

  // Formatos de armação metálica (fina) x acetato (grossa)
  const METAL = { aviador: true, hexagonal: true, redondo: true };

  function shade(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v + amt * 255))));
    return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Desenha um par de óculos (só o grupo <g>), centrado em (0,0) com ~300px de largura.
   * opts: { formato, armacao, lente, espelhado }
   */
  function glassesGroup(opts, uid) {
    const formato = opts.formato || 'wayfarer';
    const frame = opts.armacao || '#1d1d1f';
    const lens = opts.lente || '#2b2b2b';
    const thin = !!METAL[formato];
    const sw = thin ? 4 : 9;
    const g = 'g' + uid;

    const defs =
      `<defs>
        <linearGradient id="${g}l" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stop-color="${shade(lens, -0.12)}"/>
          <stop offset="0.55" stop-color="${lens}"/>
          <stop offset="1" stop-color="${shade(lens, opts.espelhado ? 0.35 : 0.18)}"/>
        </linearGradient>
        <linearGradient id="${g}f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${shade(frame, 0.12)}"/>
          <stop offset="1" stop-color="${shade(frame, -0.1)}"/>
        </linearGradient>
      </defs>`;

    if (formato === 'esportivo') {
      const shield = 'M -132,-30 Q 0,-52 132,-30 Q 140,8 112,34 Q 70,52 22,28 Q 0,18 -22,28 Q -70,52 -112,34 Q -140,8 -132,-30 Z';
      return defs +
        `<path d="M -134,-26 L -158,-34" stroke="${frame}" stroke-width="8" stroke-linecap="round"/>
         <path d="M 134,-26 L 158,-34" stroke="${frame}" stroke-width="8" stroke-linecap="round"/>
         <path d="${shield}" fill="url(#${g}l)" stroke="url(#${g}f)" stroke-width="7" stroke-linejoin="round"/>
         <path d="M -110,-24 Q -60,-38 -10,-36" stroke="#fff" stroke-opacity=".45" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    }

    const lensPath = LENS[formato] || LENS.wayfarer;
    const dx = formato === 'oversized' ? 70 : 64;

    // ponte
    const bridge = formato === 'aviador'
      ? `<path d="M ${-dx + 46},-30 Q 0,-40 ${dx - 46},-30" stroke="${frame}" stroke-width="4" fill="none"/>
         <path d="M ${-dx + 44},-16 Q 0,-28 ${dx - 44},-16" stroke="${frame}" stroke-width="4" fill="none"/>`
      : `<path d="M ${-dx + 44},-14 Q 0,-30 ${dx - 44},-14" stroke="url(#${g}f)" stroke-width="${thin ? 5 : 10}" fill="none" stroke-linecap="round"/>`;

    // hastes (vistas de frente, só o começo)
    const tx = dx + (formato === 'oversized' ? 58 : 52);
    const temples =
      `<path d="M ${-tx},-24 L ${-tx - 24},-32" stroke="${frame}" stroke-width="${thin ? 4 : 9}" stroke-linecap="round"/>
       <path d="M ${tx},-24 L ${tx + 24},-32" stroke="${frame}" stroke-width="${thin ? 4 : 9}" stroke-linecap="round"/>`;

    const one = (x, mirror) =>
      `<g transform="translate(${x},0)${mirror ? ' scale(-1,1)' : ''}">
         <path d="${lensPath}" fill="url(#${g}l)" stroke="url(#${g}f)" stroke-width="${sw}" stroke-linejoin="round"/>
         <path d="M -34,-22 Q -20,-32 4,-30" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>
       </g>`;

    const topBar = formato === 'wayfarer'
      ? `<path d="M ${-dx - 56},-34 L ${dx + 56},-34" stroke="url(#${g}f)" stroke-width="14" stroke-linecap="round"/>`
      : '';

    return defs + temples + bridge + one(-dx, false) + one(dx, true) + topBar;
  }

  let counter = 0;

  /** SVG completo de produto (quadrado), com fundo suave. */
  function productSVG(opts, variant) {
    const uid = ++counter;
    const bg = opts.fundo || '#f3efe9';
    const bg2 = shade(bg, -0.05);
    const angle = variant === 'hover' ? ' rotate(-8) scale(0.92)' : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
      <defs><radialGradient id="bg${uid}" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="${bg}"/><stop offset="1" stop-color="${bg2}"/></radialGradient></defs>
      <rect width="400" height="400" fill="url(#bg${uid})"/>
      <ellipse cx="200" cy="268" rx="130" ry="10" fill="#000" opacity=".07"/>
      <g transform="translate(200,200)${angle}">${glassesGroup(opts, uid)}</g>
    </svg>`;
  }

  function toDataURI(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\s{2,}/g, ' '));
  }

  root.GlassesArt = { glassesGroup, productSVG, toDataURI, shade };

})(typeof window !== 'undefined' ? window : globalThis);
