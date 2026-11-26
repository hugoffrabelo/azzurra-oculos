'use strict';

/* =========================================================
 * Azzurra: lógica da loja (vitrine, filtros, favoritos, sacola)
 * Os dados vêm de products.js (window.LOJA e window.PRODUTOS).
 * ========================================================= */

const LOJA = window.LOJA;
const PRODUTOS = window.PRODUTOS;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const FORMATOS = {
  aviador: 'Aviador', wayfarer: 'Wayfarer', redondo: 'Redondo', gatinho: 'Gatinho',
  quadrado: 'Quadrado', hexagonal: 'Hexagonal', oversized: 'Oversized', esportivo: 'Esportivo'
};
const PUBLICOS = { masculino: 'Masculino', feminino: 'Feminino', unissex: 'Unissex' };

const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byId = id => PRODUTOS.find(p => p.id === id);
const desconto = p => p.precoAntigo ? Math.round((1 - p.preco / p.precoAntigo) * 100) : 0;
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* modo privado */ } }
};

/* ---------- analytics (só envia se a pessoa aceitou os cookies; ver consentimento.js) ---------- */
const evento = (nome, dados) => { if (window.azzurraEvento) window.azzurraEvento(nome, dados); };
const itemGA = (p, qtd = 1) => ({ item_id: p.id, item_name: p.nome, item_brand: 'Azzurra', item_category: FORMATOS[p.formato], price: p.preco, quantity: qtd });

/* ---------- imagens ---------- */
const imgCache = {};
/*
 * Fotos: o site procura automaticamente
 *   assets/images/products/<id>-1.jpg
 * (ou o caminho definido em "imagem" no products.js).
 * Ao passar o mouse, a mesma foto é mostrada, a menos que "imagem2" seja definida.
 * Enquanto a foto não existir, mostra a ilustração.
 */
const FOTOS = './assets/images/products/';
const fotoOk = {};   // url -> true quando a foto carregou

function caminhoFoto(p, variant) {
  // a foto do hover só é usada se "imagem2" for definida no products.js
  return variant === 'hover' ? (p.imagem2 || null) : (p.imagem || `${FOTOS}${p.id}-1.jpg`);
}

function ilustracao(p, variant) {
  const key = p.id + variant;
  if (!imgCache[key]) {
    imgCache[key] = GlassesArt.toDataURI(GlassesArt.productSVG(
      { formato: p.formato, armacao: p.armacao, lente: p.corLente, espelhado: p.espelhado }, variant));
  }
  return imgCache[key];
}

function imagem(p, variant = 'default') {
  const foto = caminhoFoto(p, variant);
  if (foto && fotoOk[foto]) return foto;
  // sem foto do hover: repete a principal (se existir) para não misturar foto com ilustração
  if (variant === 'hover' && fotoOk[caminhoFoto(p, 'default')]) return caminhoFoto(p, 'default');
  return ilustracao(p, variant);
}

/* Testa as fotos em segundo plano e troca as ilustrações já na tela pelas que existirem */
function carregarFotos() {
  PRODUTOS.forEach(p => ['default', 'hover'].forEach(variant => {
    const url = caminhoFoto(p, variant);
    if (!url) return;
    const teste = new Image();
    teste.onload = () => {
      const antes = { default: imagem(p, 'default'), hover: imagem(p, 'hover') };
      fotoOk[url] = true;
      const depois = { default: imagem(p, 'default'), hover: imagem(p, 'hover') };
      for (const img of document.images) {
        const src = img.getAttribute('src');
        if (src === antes.default && depois.default !== antes.default) img.setAttribute('src', depois.default);
        else if (src === antes.hover && depois.hover !== antes.hover) img.setAttribute('src', depois.hover);
      }
    };
    teste.src = url;
  }));
}

function estrelas(nota) {
  if (!LOJA.mostrarAvaliacoes) return '';
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const name = nota >= i ? 'star' : nota >= i - 0.5 ? 'star-half' : 'star-outline';
    html += `<ion-icon name="${name}"></ion-icon>`;
  }
  return `<div class="showcase-rating" title="${nota.toFixed(1)} de 5">${html}</div>`;
}

function precoBox(p, delFirst) {
  const del = p.precoAntigo ? `<del>${brl(p.precoAntigo)}</del>` : '';
  const price = `<p class="price">${brl(p.preco)}</p>`;
  return `<div class="price-box">${delFirst ? del + price : price + del}</div>`;
}

/* ---------- estado ---------- */
// O que vem do armazenamento do navegador não é confiável: só aceita produtos que existem
// no catálogo e quantidades inteiras entre 1 e o estoque.
function sacolaSalva() {
  const salva = store.get('azzurra:sacola', []);
  if (!Array.isArray(salva)) return [];
  return salva
    .filter(i => i && typeof i.id === 'string' && byId(i.id))
    .map(i => ({ id: i.id, qtd: Math.min(byId(i.id).estoque, Math.max(1, Math.floor(Number(i.qtd)) || 1)) }));
}
function favoritosSalvos() {
  const salvos = store.get('azzurra:favoritos', []);
  return Array.isArray(salvos) ? salvos.filter(id => typeof id === 'string' && byId(id)) : [];
}

const state = {
  filtro: null,          // { chave, valor }
  busca: '',
  ordem: 'relevancia',
  sacola: sacolaSalva(),          // [{ id, qtd }]
  favoritos: favoritosSalvos()
};

/* =========================================================
 * RENDERIZAÇÃO
 * ========================================================= */

function renderMenus() {
  const contagem = {};
  PRODUTOS.forEach(p => { contagem[p.formato] = (contagem[p.formato] || 0) + 1; });
  const formatos = Object.keys(FORMATOS).filter(f => contagem[f]);

  $('[data-format-menu]').innerHTML = formatos.map(f =>
    `<li class="dropdown-item"><a href="#produtos" data-filter="formato:${f}">${FORMATOS[f]}</a></li>`).join('');

  $('[data-format-menu-mobile]').innerHTML = formatos.map(f =>
    `<li class="submenu-category"><a href="#produtos" class="submenu-title" data-filter="formato:${f}">${FORMATOS[f]}</a></li>`).join('');

  $('[data-format-footer]').outerHTML = formatos.map(f =>
    `<li class="footer-nav-item"><a href="#produtos" class="footer-nav-link" data-filter="formato:${f}">${FORMATOS[f]}</a></li>`).join('');

  // faixa de formatos (carrossel infinito): o grupo de nomes é repetido para
  // preencher qualquer largura de tela; a animação anda exatamente 1/2 da faixa
  const nomes = formatos.map(f =>
    `<a href="#produtos" class="marquee-item" data-filter="formato:${f}">${FORMATOS[f]}</a><span class="marquee-sep" aria-hidden="true">✦</span>`).join('');
  const metade = nomes.repeat(2);
  $('[data-category-bar]').innerHTML =
    `<div class="marquee-group">${metade}</div><div class="marquee-group" aria-hidden="true">${metade.replace(/<a /g, '<a tabindex="-1" ')}</div>`;

  // filtros da sidebar
  const grupo = (titulo, icone, chave, opcoes) => `
    <li class="sidebar-menu-category">
      <button class="sidebar-accordion-menu sidebar-filtro-titulo active" data-filtro-toggle aria-expanded="true">
        <div class="menu-title-flex">
          <ion-icon name="${icone}" class="menu-title-img"></ion-icon>
          <p class="menu-title">${titulo}</p>
        </div>
        <div>
          <ion-icon name="add-outline" class="add-icon"></ion-icon>
          <ion-icon name="remove-outline" class="remove-icon"></ion-icon>
        </div>
      </button>
      <ul class="sidebar-submenu-category-list active sidebar-filtro-lista">
        ${opcoes.map(([valor, rotulo]) => {
          const n = PRODUTOS.filter(p => p[chave] === valor).length;
          return `<li class="sidebar-submenu-category">
            <a href="#produtos" class="sidebar-submenu-title" data-filter="${chave}:${valor}">
              <p class="product-name">${rotulo}</p>
              <data value="${n}" class="stock" title="Modelos">${n}</data>
            </a></li>`;
        }).join('')}
      </ul>
    </li>`;

  const lentes = [...new Set(PRODUTOS.map(p => p.lente))].sort();
  $('[data-sidebar-filters]').innerHTML =
    grupo('Formato', 'glasses-outline', 'formato', formatos.map(f => [f, FORMATOS[f]])) +
    grupo('Para quem', 'people-outline', 'publico', Object.entries(PUBLICOS)) +
    grupo('Lente', 'sunny-outline', 'lente', lentes.map(l => [l, l]));
}

function renderVitrines() {
  const maisVendidos = [...PRODUTOS].sort((a, b) => b.vendidos - a.vendidos);

  $('[data-best-sellers]').innerHTML = maisVendidos.slice(0, 4).map(p => `
    <div class="showcase">
      <a href="#" class="showcase-img-box" data-quickview-open="${p.id}">
        <img loading="lazy" decoding="async" src="${imagem(p)}" alt="${esc(p.nome)}" width="75" height="75" class="showcase-img">
      </a>
      <div class="showcase-content">
        <a href="./produto/${p.id}.html"><h4 class="showcase-title">${esc(p.nome)}</h4></a>
        ${estrelas(p.avaliacao)}
        ${precoBox(p, true)}
      </div>
    </div>`).join('');

}

function produtosFiltrados() {
  let lista = PRODUTOS.slice();
  const f = state.filtro;
  if (f) {
    if (f.chave === 'oferta') lista = lista.filter(p => p.precoAntigo);
    else if (f.chave === 'novo') lista = lista.filter(p => p.novo);
    else if (f.chave === 'favoritos') lista = lista.filter(p => state.favoritos.includes(p.id));
    else lista = lista.filter(p => p[f.chave] === f.valor);
  }
  if (state.busca) {
    const termos = norm(state.busca).split(/\s+/).filter(Boolean);
    lista = lista.filter(p => {
      const texto = norm([p.nome, FORMATOS[p.formato], p.publico, p.lente, p.descricao].join(' '));
      return termos.every(t => texto.includes(t));
    });
  }
  const ordem = {
    relevancia: (a, b) => b.vendidos - a.vendidos,
    menor: (a, b) => a.preco - b.preco,
    maior: (a, b) => b.preco - a.preco,
    avaliacao: (a, b) => b.avaliacao - a.avaliacao
  }[state.ordem];
  return lista.sort(ordem);
}

function rotuloFiltro() {
  const f = state.filtro;
  const partes = [];
  if (f) {
    partes.push({
      formato: () => FORMATOS[f.valor], publico: () => PUBLICOS[f.valor], lente: () => f.valor,
      oferta: () => 'Ofertas', novo: () => 'Lançamentos', favoritos: () => 'Favoritos'
    }[f.chave]());
  }
  if (state.busca) partes.push(`"${state.busca}"`);
  return partes.join(' · ');
}

function renderGrade() {
  const lista = produtosFiltrados();
  const rotulo = rotuloFiltro();

  $('[data-grid-title]').textContent = rotulo ? `${lista.length} resultado${lista.length === 1 ? '' : 's'}` : 'Todos os óculos';
  $('[data-clear-filter]').hidden = !rotulo;
  $('[data-filter-label]').textContent = rotulo;
  $('[data-grid-empty]').hidden = lista.length > 0;

  $('[data-grid]').innerHTML = lista.map(p => {
    const fav = state.favoritos.includes(p.id);
    const pct = desconto(p);
    const selo = pct ? `<p class="showcase-badge">-${pct}%</p>`
      : p.selo === 'novo' ? '<p class="showcase-badge angle pink">novo</p>' : '';
    return `
      <div class="showcase">
        <div class="showcase-banner">
          <img loading="lazy" decoding="async" src="${imagem(p)}" alt="${esc(p.nome)}" width="300" class="product-img default">
          <img loading="lazy" decoding="async" src="${imagem(p, 'hover')}" alt="" width="300" class="product-img hover">
          ${selo}
          <div class="showcase-actions">
            <button class="btn-action ${fav ? 'is-fav' : ''}" data-fav="${p.id}" aria-label="Favoritar">
              <ion-icon name="${fav ? 'heart' : 'heart-outline'}"></ion-icon>
            </button>
            <button class="btn-action" data-quickview-open="${p.id}" aria-label="Ver detalhes">
              <ion-icon name="eye-outline"></ion-icon>
            </button>
            <button class="btn-action" data-add="${p.id}" aria-label="Adicionar à sacola">
              <ion-icon name="bag-add-outline"></ion-icon>
            </button>
          </div>
        </div>
        <div class="showcase-content">
          <a href="#produtos" class="showcase-category" data-filter="formato:${p.formato}">${FORMATOS[p.formato]} · ${esc(p.lente)}</a>
          <a href="./produto/${p.id}.html"><h3 class="showcase-title">${esc(p.nome)}</h3></a>
          ${estrelas(p.avaliacao)}
          ${precoBox(p)}
          <p class="pix-price">${brl(p.preco * (1 - LOJA.descontoPix))} no Pix</p>
        </div>
      </div>`;
  }).join('');
}

/* =========================================================
 * FAVORITOS
 * ========================================================= */
function toggleFav(id) {
  const i = state.favoritos.indexOf(id);
  if (i >= 0) state.favoritos.splice(i, 1); else state.favoritos.push(id);
  store.set('azzurra:favoritos', state.favoritos);
  updateCounts();
  renderGrade();
}

/* =========================================================
 * SACOLA
 * ========================================================= */
const cartEl = $('[data-cart]');
const overlay = $('[data-overlay]');

function saveCart() {
  store.set('azzurra:sacola', state.sacola);
  updateCounts();
  renderCart();
}

function addToCart(id, qtd = 1) {
  const p = byId(id);
  if (!p) return;
  const item = state.sacola.find(i => i.id === id);
  const atual = item ? item.qtd : 0;
  const nova = Math.min(p.estoque, atual + qtd);
  if (item) item.qtd = nova; else state.sacola.push({ id, qtd: nova });
  saveCart();
  showToast(p);
  evento('add_to_cart', { currency: 'BRL', value: p.preco * qtd, items: [itemGA(p, qtd)] });
}

function setQty(id, qtd) {
  const p = byId(id);
  const antes = state.sacola.find(i => i.id === id)?.qtd || 0;
  if (qtd <= 0) state.sacola = state.sacola.filter(i => i.id !== id);
  else state.sacola.find(i => i.id === id).qtd = Math.min(p.estoque, qtd);
  const depois = state.sacola.find(i => i.id === id)?.qtd || 0;
  const dif = depois - antes;
  if (dif < 0) evento('remove_from_cart', { currency: 'BRL', value: p.preco * -dif, items: [itemGA(p, -dif)] });
  else if (dif > 0) evento('add_to_cart', { currency: 'BRL', value: p.preco * dif, items: [itemGA(p, dif)] });
  saveCart();
}

// cliques nos banners (carrossel e banner do cupom) viram "select_promotion" no analytics
document.addEventListener('click', e => {
  const b = e.target.closest('.slider-item .banner-btn, [data-abrir-newsletter]');
  if (!b) return;
  const slide = b.closest('.slider-item');
  const slides = $$('.slider-item');
  const titulo = (b.closest('.slider-item, .banner-inferior')?.querySelector('.banner-title, .banner-inferior-titulo')?.textContent || b.textContent)
    .replace(/\s+/g, ' ').trim();
  evento('select_promotion', {
    promotion_id: slide ? `banner-${slides.indexOf(slide) + 1}` : 'banner-cupom',
    promotion_name: titulo,
    creative_slot: slide ? `carrossel-${slides.indexOf(slide) + 1}` : 'rodape'
  });
});

function cartTotal() {
  return state.sacola.reduce((s, i) => s + (byId(i.id)?.preco || 0) * i.qtd, 0);
}

function renderCart() {
  // remove itens que não existem mais no catálogo
  state.sacola = state.sacola.filter(i => byId(i.id));
  const total = cartTotal();
  const falta = LOJA.freteGratisAcima - total;

  $('[data-cart-shipping]').innerHTML = state.sacola.length === 0 ? '' : `
    <p>${falta > 0 ? `Faltam <b>${brl(falta)}</b> para o <b>frete grátis</b>` : '<b>Você ganhou frete grátis!</b>'}</p>
    <div class="ship-bar"><span style="width:${Math.min(100, total / LOJA.freteGratisAcima * 100)}%"></span></div>`;

  $('[data-cart-items]').innerHTML = state.sacola.length === 0
    ? `<li class="cart-empty"><ion-icon name="bag-handle-outline"></ion-icon><p>Sua sacola está vazia.</p></li>`
    : state.sacola.map(i => {
      const p = byId(i.id);
      return `
        <li class="cart-item">
          <img src="${imagem(p)}" alt="" width="72" height="72">
          <div class="cart-item-info">
            <p class="cart-item-name">${esc(p.nome)}</p>
            <p class="cart-item-price">${brl(p.preco)}</p>
            <div class="qty">
              <button data-qty="${p.id}" data-delta="-1" aria-label="Diminuir">−</button>
              <span>${i.qtd}</span>
              <button data-qty="${p.id}" data-delta="1" aria-label="Aumentar" ${i.qtd >= p.estoque ? 'disabled' : ''}>+</button>
            </div>
          </div>
          <button class="cart-remove" data-remove="${p.id}" aria-label="Remover"><ion-icon name="trash-outline"></ion-icon></button>
        </li>`;
    }).join('');

  $('[data-cart-subtotal]').textContent = brl(total);
  $('[data-cart-pix]').textContent = brl(total * (1 - LOJA.descontoPix));
  $('[data-checkout]').disabled = state.sacola.length === 0;
}

function openCart() {
  renderCart();
  cartEl.classList.add('active');
  overlay.classList.add('active');
}
function closeCart() {
  cartEl.classList.remove('active');
  overlay.classList.remove('active');
}

function checkout() {
  if (!state.sacola.length) return;
  const total = cartTotal();
  const linhas = state.sacola.map(i => {
    const p = byId(i.id);
    return `• ${i.qtd}x ${p.nome}: ${brl(p.preco * i.qtd)}`;
  });
  const msg = [
    `Olá! Quero fazer este pedido na ${LOJA.nome}:`,
    '',
    ...linhas,
    '',
    `Subtotal: ${brl(total)}`,
    `No Pix: ${brl(total * (1 - LOJA.descontoPix))}`,
    total >= LOJA.freteGratisAcima ? 'Frete grátis ✔' : '',
    '',
    'Meu CEP: '
  ].join('\n');
  evento('begin_checkout', { currency: 'BRL', value: total, items: state.sacola.map(i => itemGA(byId(i.id), i.qtd)) });
  window.open(`https://wa.me/${LOJA.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}

/* =========================================================
 * VISUALIZAÇÃO RÁPIDA
 * ========================================================= */
const qv = $('[data-quickview]');
function openQuickview(id) {
  const p = byId(id);
  if (!p) return;
  const pct = desconto(p);
  $('[data-quickview-body]').innerHTML = `
    <div class="qv-grid">
      <img src="${imagem(p)}" alt="${esc(p.nome)}" class="qv-img">
      <div class="qv-info">
        <p class="showcase-category">${FORMATOS[p.formato]} · ${PUBLICOS[p.publico]}</p>
        <h3>${esc(p.nome)}</h3>
        ${estrelas(p.avaliacao)}
        <div class="qv-price">
          ${p.precoAntigo ? `<del>${brl(p.precoAntigo)}</del>` : ''}
          <b>${brl(p.preco)}</b>${pct ? `<span class="qv-off">-${pct}%</span>` : ''}
        </div>
        <p class="pix-price">${brl(p.preco * (1 - LOJA.descontoPix))} no Pix</p>
        <p class="qv-desc">${esc(p.descricao)}</p>
        <ul class="qv-specs">
          <li><ion-icon name="sunny-outline"></ion-icon> Lente ${esc(p.lente)} · UV400</li>
          <li><ion-icon name="cube-outline"></ion-icon> ${p.estoque > 0 ? `${p.estoque} em estoque` : 'Esgotado'}</li>
          <li><ion-icon name="shield-checkmark-outline"></ion-icon> Acompanha estojo e flanela</li>
        </ul>
        <button class="add-cart-btn" data-add="${p.id}" data-close-qv ${p.estoque ? '' : 'disabled'}>adicionar à sacola</button>
      </div>
    </div>`;
  qv.hidden = false;
  evento('view_item', { currency: 'BRL', value: p.preco, items: [itemGA(p)] });
  document.body.classList.add('no-scroll');
}
function closeQuickview() {
  qv.hidden = true;
  document.body.classList.remove('no-scroll');
}

/* =========================================================
 * TOAST, CONTADORES, NEWSLETTER
 * ========================================================= */
const toast = $('[data-toast]');
let toastTimer;
function showToast(p) {
  $('[data-toast-img]').src = imagem(p);
  $('[data-toast-title]').textContent = p.nome;
  toast.classList.remove('closed');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('closed'), 3500);
}

function updateCounts() {
  const n = state.sacola.reduce((s, i) => s + i.qtd, 0);
  $$('[data-cart-count]').forEach(el => { el.textContent = n; });
  $$('[data-wish-count]').forEach(el => { el.textContent = state.favoritos.length; });
}

const modal = $('[data-modal]');
const closeModal = () => { modal.classList.add('closed'); store.set('azzurra:newsletter-visto', true); };
$('[data-modal-close]').addEventListener('click', closeModal);
$('[data-modal-overlay]').addEventListener('click', closeModal);
$('[data-newsletter-form]').addEventListener('submit', e => {
  e.preventDefault();
  // TODO: enviar o e-mail para sua ferramenta de e-mail marketing (ex.: Mailchimp, RD Station, Brevo).
  evento('sign_up', { method: 'newsletter' });
  e.target.innerHTML = '<div class="newsletter-header"><h3 class="newsletter-title">Obrigado!</h3><p class="newsletter-desc">Em breve você recebe seu cupom por e-mail.</p></div>';
  setTimeout(closeModal, 2200);
});
if (!store.get('azzurra:newsletter-visto', false)) {
  setTimeout(() => modal.classList.remove('closed'), 6000);
}

$('[data-toast-close]').addEventListener('click', () => toast.classList.add('closed'));

// filtros da coluna lateral: começam abertos e cada grupo abre/fecha sozinho (sem fechar os outros)
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-filtro-toggle]');
  if (!btn) return;
  const aberto = btn.classList.toggle('active');
  btn.nextElementSibling.classList.toggle('active', aberto);
  btn.setAttribute('aria-expanded', String(aberto));
});

// botão "Quero meu cupom" do banner inferior abre a janela da newsletter
$$('[data-abrir-newsletter]').forEach(b => b.addEventListener('click', () => modal.classList.remove('closed')));

/* =========================================================
 * MENU MOBILE E ACORDEÕES (comportamento do template original)
 * ========================================================= */
const mobileMenuOpenBtn = $$('[data-mobile-menu-open-btn]');
const mobileMenu = $$('[data-mobile-menu]');
const mobileMenuCloseBtn = $$('[data-mobile-menu-close-btn]');

function closeMobileMenus() {
  mobileMenu.forEach(m => m.classList.remove('active'));
  if (!cartEl.classList.contains('active')) overlay.classList.remove('active');
}
mobileMenuOpenBtn.forEach((btn, i) => btn.addEventListener('click', () => {
  mobileMenu[i].classList.add('active');
  overlay.classList.add('active');
}));
mobileMenuCloseBtn.forEach(btn => btn.addEventListener('click', closeMobileMenus));
overlay.addEventListener('click', () => { closeMobileMenus(); closeCart(); });

function bindAccordions() {
  const accordionBtn = $$('[data-accordion-btn]');
  const accordion = $$('[data-accordion]');
  accordionBtn.forEach(btn => btn.addEventListener('click', function () {
    const isOpen = this.nextElementSibling.classList.contains('active');
    if (!isOpen) {
      accordion.forEach((acc, i) => {
        if (acc.classList.contains('active')) {
          acc.classList.remove('active');
          accordionBtn[i].classList.remove('active');
        }
      });
    }
    this.nextElementSibling.classList.toggle('active');
    this.classList.toggle('active');
  }));
}

/* =========================================================
 * EVENTOS GERAIS (delegação)
 * ========================================================= */
function aplicarFiltro(str) {
  if (!str) { state.filtro = null; state.busca = ''; $('[data-search]').value = ''; }
  else {
    const [chave, ...resto] = str.split(':');
    state.filtro = { chave, valor: resto.join(':') };
  }
  renderGrade();
  closeMobileMenus();
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-filter],[data-add],[data-fav],[data-quickview-open],[data-quickview-close],[data-cart-open],[data-cart-close],[data-qty],[data-remove],[data-checkout],[data-clear-filter],[data-wish-show]');
  if (!t) return;

  if (t.matches('[data-filter]')) {
    aplicarFiltro(t.dataset.filter);
    if (!t.dataset.filter) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else { e.preventDefault(); $('#produtos').scrollIntoView({ behavior: 'smooth' }); }
  }
  else if (t.matches('[data-add]')) {
    addToCart(t.dataset.add);
    if (t.hasAttribute('data-close-qv')) closeQuickview();
  }
  else if (t.matches('[data-fav]')) toggleFav(t.dataset.fav);
  else if (t.matches('[data-quickview-open]')) { e.preventDefault(); openQuickview(t.dataset.quickviewOpen); }
  else if (t.matches('[data-quickview-close]')) closeQuickview();
  else if (t.matches('[data-cart-open]')) { e.preventDefault(); toast.classList.add('closed'); closeMobileMenus(); openCart(); }
  else if (t.matches('[data-cart-close]')) closeCart();
  else if (t.matches('[data-qty]')) {
    const item = state.sacola.find(i => i.id === t.dataset.qty);
    setQty(t.dataset.qty, item.qtd + Number(t.dataset.delta));
  }
  else if (t.matches('[data-remove]')) setQty(t.dataset.remove, 0);
  else if (t.matches('[data-checkout]')) checkout();
  else if (t.matches('[data-clear-filter]')) aplicarFiltro('');
  else if (t.matches('[data-wish-show]')) {
    aplicarFiltro('favoritos:sim');
    $('#produtos').scrollIntoView({ behavior: 'smooth' });
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeQuickview(); closeCart(); closeMobileMenus(); }
});

$('[data-search-form]').addEventListener('submit', e => {
  e.preventDefault();
  $('#produtos').scrollIntoView({ behavior: 'smooth' });
});
$('[data-search]').addEventListener('input', e => {
  state.busca = e.target.value.trim();
  renderGrade();
});
// sem avaliações reais, a ordenação "Melhor avaliados" não faz sentido
if (!LOJA.mostrarAvaliacoes) { const opc = $('[data-sort] option[value="avaliacao"]'); if (opc) opc.remove(); }

$('[data-sort]').addEventListener('change', e => {
  state.ordem = e.target.value;
  renderGrade();
});

/* =========================================================
 * INICIALIZAÇÃO
 * ========================================================= */
$$('[data-frete-gratis]').forEach(el => { el.textContent = brl(LOJA.freteGratisAcima).replace(',00', ''); });
$$('[data-pix-pct]').forEach(el => { el.textContent = Math.round(LOJA.descontoPix * 100) + '%'; });
$$('[data-link-instagram]').forEach(a => { a.href = LOJA.instagram; a.target = '_blank'; a.rel = 'noopener'; });
$$('[data-link-whatsapp]').forEach(a => { a.href = `https://wa.me/${LOJA.whatsapp}`; a.target = '_blank'; a.rel = 'noopener'; });
$('[data-year]').textContent = new Date().getFullYear();

renderMenus();
renderVitrines();
renderGrade();
renderCart();
updateCounts();
bindAccordions();
carregarFotos();

// Links vindos de fora (ex.: matérias do Guia) podem abrir a loja já filtrada:
// index.html?formato=aviador  |  ?lente=Polarizada  |  ?publico=feminino
(function filtroPelaUrl() {
  const params = new URLSearchParams(location.search);
  for (const chave of ['formato', 'lente', 'publico']) {
    const valor = params.get(chave);
    // só aceita valores que existem no catálogo (ignora qualquer outra coisa vinda do link)
    if (valor && PRODUTOS.some(p => p[chave] === valor)) {
      aplicarFiltro(`${chave}:${valor}`);
      setTimeout(() => $('#produtos').scrollIntoView({ behavior: 'smooth' }), 300);
      break;
    }
  }
  // ?sacola=1 abre a sacola (usado pelo botão "Adicionar à sacola" das páginas de produto)
  if (params.get('sacola') === '1') openCart();
})();

/* =========================================================
 * FAVICON: letra "A" desenhada com a mesma fonte e cor do logo
 * (o arquivo favicon.svg é só a versão provisória)
 * ========================================================= */
(function faviconDoLogo() {
  const logo = $('.brand-logo');
  const link = $('link[rel="icon"]');
  if (!logo || !link || !document.fonts) return;
  const css = getComputedStyle(logo);
  const familia = css.fontFamily;
  const peso = css.fontWeight;
  const cor = css.color;

  const desenhar = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = cor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    let tam = 124;
    ctx.font = `${peso} ${tam}px ${familia}`;
    // ajusta o tamanho para a letra ocupar o ícone sem cortar
    const m = ctx.measureText('A');
    const alt = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const larg = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    tam = tam * Math.min(108 / alt, 108 / larg);   // folga para o contorno caber
    ctx.font = `${peso} ${tam}px ${familia}`;
    const m2 = ctx.measureText('A');
    const y = 64 + (m2.actualBoundingBoxAscent - m2.actualBoundingBoxDescent) / 2;
    const x = 64 + (m2.actualBoundingBoxLeft - m2.actualBoundingBoxRight) / 2;
    // contorno branco por fora da letra
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.lineJoin = 'round';
    ctx.strokeText('A', x, y);
    ctx.fillText('A', x, y);
    link.type = 'image/png';
    link.href = c.toDataURL('image/png');
  };

  document.fonts.load(`${peso} 64px ${familia}`, 'A').then(desenhar, desenhar);
})();
