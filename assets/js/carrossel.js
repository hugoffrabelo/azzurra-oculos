'use strict';

/* =========================================================
 * BANNERS: foto com ilustração de reserva + carrossel automático
 * ========================================================= */
(function () {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Se a foto do banner ainda não existir, mostra a ilustração no lugar
  function usarReserva(img) {
    if (!img.dataset.fallback || img.dataset.usandoReserva) return;
    img.dataset.usandoReserva = '1';
    img.src = img.dataset.fallback;
    img.classList.remove('banner-img--foto');
    // a ilustração tem os óculos à direita: o texto volta para a esquerda
    const conteudo = img.parentElement.querySelector('.banner-content');
    if (conteudo) conteudo.classList.remove('banner-content--direita');
  }
  $$('img[data-fallback]').forEach(img => {
    img.addEventListener('error', () => usarReserva(img));
    if (img.complete && img.naturalWidth === 0) usarReserva(img);
  });

  const slider = $('[data-slider]');
  const dotsEl = $('[data-slider-dots]');
  if (!slider || !dotsEl) return;
  const slides = $$('.slider-item', slider);
  if (slides.length < 2) return;

  const INTERVALO = 6000; // ms entre um banner e outro
  let atual = 0;
  let timer = null;

  dotsEl.innerHTML = slides.map((_, i) =>
    `<button class="slider-dot" data-slide="${i}" aria-label="Banner ${i + 1}"></button>`).join('');
  const dots = $$('.slider-dot', dotsEl);

  const marcar = () => dots.forEach((d, i) => d.classList.toggle('active', i === atual));
  const ir = i => {
    atual = (i + slides.length) % slides.length;
    slider.scrollTo({ left: slides[atual].offsetLeft - slides[0].offsetLeft, behavior: 'smooth' });
    marcar();
  };

  // acompanha o banner visível (também quando o cliente arrasta com o dedo)
  slider.addEventListener('scroll', () => {
    atual = Math.round(slider.scrollLeft / slider.clientWidth);
    marcar();
  }, { passive: true });

  const parar = () => clearInterval(timer);
  const tocar = () => { parar(); timer = setInterval(() => ir(atual + 1), INTERVALO); };

  dotsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-slide]');
    if (b) { ir(Number(b.dataset.slide)); tocar(); }
  });
  ['mouseenter', 'touchstart', 'focusin'].forEach(ev => slider.addEventListener(ev, parar, { passive: true }));
  ['mouseleave', 'touchend', 'focusout'].forEach(ev => slider.addEventListener(ev, tocar, { passive: true }));
  document.addEventListener('visibilitychange', () => (document.hidden ? parar() : tocar()));

  marcar();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) tocar();
})();
