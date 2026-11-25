'use strict';

/* =========================================================
 * ANALYTICS + AVISO DE COOKIES (LGPD)
 * ---------------------------------------------------------
 * 1. Crie as contas e cole os IDs abaixo:
 *    - Google Analytics 4: "ID da métrica", começa com G-  (analytics.google.com)
 *    - Meta Pixel: número do pixel                          (business.facebook.com > Gerenciador de eventos)
 *    - Microsoft Clarity: ID do projeto                     (clarity.microsoft.com)
 * 2. Envie o site para o GitHub.
 *
 * Enquanto todos estiverem vazios, nenhum rastreador é carregado e o aviso de cookies nem aparece.
 * Com algum ID preenchido, o aviso aparece e as ferramentas só carregam se a pessoa ACEITAR.
 * ========================================================= */
const ANALYTICS = {
  ga4: '',        // ex.: 'G-ABC123XYZ9'
  metaPixel: '',  // ex.: '123456789012345'
  clarity: ''     // ex.: 'abcd1234ef'
};

(function () {
  const CHAVE = 'azzurra:cookies';          // 'aceito' | 'recusado'
  const configurado = Object.values(ANALYTICS).some(Boolean);
  let modoTeste = false;                    // AzzurraCookies.mostrar() exibe o aviso mesmo sem IDs
  const fila = [];                          // eventos que acontecem antes de as ferramentas carregarem
  let carregado = false;

  function ler() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }
  function salvar(v) { try { localStorage.setItem(CHAVE, v); } catch (e) { /* modo privado */ } }

  function script(src) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function carregarFerramentas() {
    if (carregado || !configurado) return;
    carregado = true;

    if (ANALYTICS.ga4) {
      script('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ANALYTICS.ga4));
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', ANALYTICS.ga4, { anonymize_ip: true });
    }

    if (ANALYTICS.metaPixel) {
      /* código padrão do Meta Pixel */
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', ANALYTICS.metaPixel);
      window.fbq('track', 'PageView');
    }

    if (ANALYTICS.clarity) {
      /* código padrão do Microsoft Clarity */
      (function (c, l, a, r, i, t, y) {
        c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
        t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
        y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
      })(window, document, 'clarity', 'script', ANALYTICS.clarity);
    }

    fila.splice(0).forEach(function (e) { enviar(e[0], e[1]); });
  }

  // nomes de evento do GA4 -> eventos padrão do Meta Pixel
  const META = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', sign_up: 'Lead', search: 'Search' };

  function enviar(nome, dados) {
    dados = dados || {};
    if (window.gtag) window.gtag('event', nome, dados);
    if (window.fbq && META[nome]) {
      window.fbq('track', META[nome], {
        value: dados.value, currency: dados.currency,
        content_ids: (dados.items || []).map(function (i) { return i.item_id; }),
        content_type: 'product'
      });
    }
  }

  /**
   * Use em qualquer página: azzurraEvento('add_to_cart', { currency: 'BRL', value: 189.9, items: [...] })
   * Se a pessoa não aceitou os cookies (ou nada está configurado), o evento é simplesmente ignorado.
   */
  window.azzurraEvento = function (nome, dados) {
    if (!configurado || ler() !== 'aceito') return;
    if (!carregado) { fila.push([nome, dados]); return; }
    enviar(nome, dados);
  };

  /* ---------- aviso de cookies ---------- */
  function mostrarAviso() {
    if ((!configurado && !modoTeste) || document.querySelector('.cookies')) return;
    const caixa = document.createElement('div');
    caixa.className = 'cookies';
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-label', 'Aviso de cookies');
    caixa.innerHTML =
      '<p class="cookies-texto">Usamos cookies para entender como o site é usado e melhorar nossos anúncios. ' +
      'Você escolhe: <a href="' + linkPrivacidade() + '">Política de Privacidade</a>.</p>' +
      '<div class="cookies-botoes">' +
      '<button class="cookies-btn cookies-btn--recusar" data-cookies="recusado">Recusar</button>' +
      '<button class="cookies-btn" data-cookies="aceito">Aceitar</button>' +
      '</div>';
    caixa.addEventListener('click', function (e) {
      const b = e.target.closest('[data-cookies]');
      if (!b) return;
      const escolha = b.getAttribute('data-cookies');
      const antes = ler();
      salvar(escolha);
      caixa.remove();
      if (escolha === 'aceito') carregarFerramentas();
      else if (antes === 'aceito') location.reload();   // desliga ferramentas já carregadas nesta página
    });
    document.body.appendChild(caixa);
  }

  // o link da política funciona em qualquer pasta (home, produto/, guia/, paginas/)
  function linkPrivacidade() {
    const pastaInterna = /\/(produto|guia|paginas)\/[^/]*$/.test(location.pathname);
    return (pastaInterna ? '../' : './') + 'paginas/politica-de-privacidade.html';
  }

  // links "Preferências de cookies" (rodapé) reabrem o aviso
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-preferencias-cookies]')) { e.preventDefault(); mostrarAviso(); }
  });

  function iniciar() {
    // sem nenhuma ferramenta configurada, o link de preferências não faz sentido
    if (!configurado) document.querySelectorAll('[data-preferencias-cookies]').forEach(function (el) { el.closest('li') ? el.closest('li').remove() : el.remove(); });
    const escolha = ler();
    if (escolha === 'aceito') carregarFerramentas();
    else if (escolha !== 'recusado') mostrarAviso();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  // para testar o aviso sem configurar IDs: AzzurraCookies.mostrar()
  window.AzzurraCookies = { mostrar: function () { modoTeste = true; mostrarAviso(); modoTeste = false; } };
})();
