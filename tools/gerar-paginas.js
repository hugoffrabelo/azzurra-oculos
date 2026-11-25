// Gera uma página para cada produto (produto/<id>.html) e o sitemap.xml,
// a partir do catálogo em assets/js/products.js.
// Rode de novo sempre que mudar produtos ou preços:  node tools/gerar-paginas.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..');
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(raiz, 'assets/js/products.js'), 'utf8'), ctx);
const LOJA = ctx.window.LOJA;
const PRODUTOS = ctx.window.PRODUTOS;
const SITE = LOJA.siteUrl.replace(/\/?$/, '/');

const FORMATOS = {
  aviador: 'Aviador', wayfarer: 'Wayfarer', redondo: 'Redondo', gatinho: 'Gatinho',
  quadrado: 'Quadrado', hexagonal: 'Hexagonal', oversized: 'Oversized', esportivo: 'Esportivo'
};
const PUBLICOS = { masculino: 'Masculino', feminino: 'Feminino', unissex: 'Unissex' };
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/ /g, ' ');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const foto = p => p.imagem ? p.imagem.replace(/^\.\//, '') : `assets/images/products/${p.id}-1.jpg`;
const temFoto = p => fs.existsSync(path.join(raiz, foto(p)));

function pagina(p) {
  const url = `${SITE}produto/${p.id}.html`;
  const img = temFoto(p) ? `${SITE}${foto(p)}` : `${SITE}assets/images/banners/banner-aviador.jpg`;
  const pix = p.preco * (1 - LOJA.descontoPix);
  const titulo = `${p.nome}: Óculos de Sol ${FORMATOS[p.formato]} ${p.lente}`;
  const descricao = `${p.descricao} Proteção UV400. ${brl(p.preco)} ou ${brl(pix)} no Pix. Frete grátis acima de ${brl(LOJA.freteGratisAcima)}.`;
  const relacionados = PRODUTOS
    .filter(o => o.id !== p.id)
    .sort((a, b) => (b.formato === p.formato) - (a.formato === p.formato) || (b.publico === p.publico) - (a.publico === p.publico))
    .slice(0, 4);

  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        name: p.nome,
        description: p.descricao,
        image: img,
        sku: p.id,
        brand: { '@type': 'Brand', name: LOJA.nome },
        category: `Óculos de sol > ${FORMATOS[p.formato]}`,
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: 'BRL',
          price: p.preco.toFixed(2),
          availability: p.estoque > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: LOJA.nome }
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: SITE },
          { '@type': 'ListItem', position: 2, name: FORMATOS[p.formato], item: `${SITE}index.html?formato=${p.formato}` },
          { '@type': 'ListItem', position: 3, name: p.nome, item: url }
        ]
      }
    ]
  };

  const msgWhats = encodeURIComponent(`Olá! Tenho interesse no ${p.nome} (${brl(p.preco)}). Ainda está disponível?`);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Página gerada por tools/gerar-paginas.js: edite o produto em assets/js/products.js e rode o gerador de novo -->
  <title>${esc(titulo)} | ${esc(LOJA.nome)}</title>
  <meta name="description" content="${esc(descricao)}">
  <meta name="theme-color" content="#302c9b">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="${esc(LOJA.nome)}">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:title" content="${esc(p.nome)} | ${esc(LOJA.nome)}">
  <meta property="og:description" content="${esc(descricao)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:alt" content="${esc(p.nome)}">
  <meta property="product:price:amount" content="${p.preco.toFixed(2)}">
  <meta property="product:price:currency" content="BRL">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
${JSON.stringify(ld, null, 2).replace(/^/gm, '  ')}
  </script>
  <link rel="icon" href="../assets/images/art/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="../assets/images/icons/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="../assets/images/icons/apple-touch-icon.png">
  <link rel="stylesheet" href="../assets/css/style-prefix.css">
  <link rel="stylesheet" href="../assets/css/store.css">
  <link rel="stylesheet" href="../assets/css/guia.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Parisienne&family=Playfair+Display:wght@600&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="pagina-guia">

  <header class="guia-topo">
    <div class="guia-topo-inner">
      <a href="../index.html" class="brand-logo">${esc(LOJA.nome)}</a>
      <a href="../index.html?sacola=1" class="guia-topo-link">Sacola →</a>
    </div>
  </header>

  <main class="produto">
    <nav class="produto-trilha" aria-label="Você está em">
      <a href="../index.html">Início</a> ›
      <a href="../index.html?formato=${p.formato}#produtos">${FORMATOS[p.formato]}</a> ›
      <span>${esc(p.nome)}</span>
    </nav>

    <div class="produto-grid">
      <div class="produto-foto">
        <img src="../${foto(p)}" alt="${esc(p.nome)}: óculos de sol ${esc(FORMATOS[p.formato].toLowerCase())} com lente ${esc(p.lente.toLowerCase())}" width="800" height="800">
      </div>

      <div class="produto-info">
        <p class="artigo-categoria">${FORMATOS[p.formato]} · ${PUBLICOS[p.publico]}</p>
        <h1 class="produto-nome">${esc(p.nome)}</h1>
        <div class="produto-preco">
          ${p.precoAntigo ? `<del>${brl(p.precoAntigo)}</del>` : ''}
          <b>${brl(p.preco)}</b>
          ${p.precoAntigo ? `<span class="produto-off">-${Math.round((1 - p.preco / p.precoAntigo) * 100)}%</span>` : ''}
        </div>
        <p class="produto-pix">${brl(pix)} no Pix (${Math.round(LOJA.descontoPix * 100)}% OFF)</p>
        <p class="produto-desc">${esc(p.descricao)}</p>

        <ul class="produto-specs">
          <li><span>Formato</span><b>${FORMATOS[p.formato]}</b></li>
          <li><span>Lente</span><b>${esc(p.lente)}</b></li>
          <li><span>Proteção</span><b>UV400 (100% UVA e UVB)</b></li>
          <li><span>Para</span><b>${PUBLICOS[p.publico]}</b></li>
          <li><span>Acompanha</span><b>Estojo e flanela</b></li>
          <li><span>Disponibilidade</span><b>${p.estoque > 0 ? 'Em estoque' : 'Esgotado'}</b></li>
        </ul>

        <div class="produto-acoes">
          <button class="produto-btn" data-adicionar="${p.id}" ${p.estoque > 0 ? '' : 'disabled'}>Adicionar à sacola</button>
          <a class="produto-btn produto-btn--whats" href="https://wa.me/${LOJA.whatsapp}?text=${msgWhats}" target="_blank" rel="noopener">Tirar dúvida no WhatsApp</a>
        </div>
        <p class="produto-frete">Frete grátis acima de ${brl(LOJA.freteGratisAcima)} · Troca fácil em até 7 dias após o recebimento</p>
      </div>
    </div>

    <section class="artigo-mais">
      <p class="artigo-mais-titulo">Você também pode gostar</p>
      <div class="produto-relacionados">
        ${relacionados.map(o => `<a href="./${o.id}.html" class="produto-rel">
          <img src="../${foto(o)}" alt="${esc(o.nome)}" loading="lazy" width="400" height="400">
          <span class="artigo-mais-cat">${FORMATOS[o.formato]}</span>
          <span class="artigo-mais-nome">${esc(o.nome)}</span>
          <span class="produto-rel-preco">${brl(o.preco)}</span>
        </a>`).join('\n        ')}
      </div>
    </section>
  </main>

  <footer class="guia-rodape">
    <p>© <span data-ano></span> ${esc(LOJA.nome)}. Todos os direitos reservados.
      · <a href="../paginas/politica-de-privacidade.html">Privacidade</a>
      · <a href="#" data-preferencias-cookies>Preferências de cookies</a></p>
  </footer>

  <script src="../assets/js/consentimento.js"></script>
  <script>
    document.querySelector('[data-ano]').textContent = new Date().getFullYear();
    var itemGA = { item_id: '${p.id}', item_name: ${JSON.stringify(p.nome)}, item_brand: ${JSON.stringify(LOJA.nome)}, item_category: '${FORMATOS[p.formato]}', price: ${p.preco}, quantity: 1 };
    if (window.azzurraEvento) azzurraEvento('view_item', { currency: 'BRL', value: ${p.preco}, items: [itemGA] });
    // "Adicionar à sacola": usa a mesma sacola da loja (salva no navegador) e abre a sacola na página inicial
    document.querySelectorAll('[data-adicionar]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-adicionar');
        var sacola = [];
        try { sacola = JSON.parse(localStorage.getItem('azzurra:sacola')) || []; } catch (e) {}
        if (!Array.isArray(sacola)) sacola = [];
        var item = sacola.find(function (i) { return i && i.id === id; });
        if (item) item.qtd = (Number(item.qtd) || 0) + 1; else sacola.push({ id: id, qtd: 1 });
        try { localStorage.setItem('azzurra:sacola', JSON.stringify(sacola)); } catch (e) {}
        if (window.azzurraEvento) azzurraEvento('add_to_cart', { currency: 'BRL', value: ${p.preco}, items: [itemGA] });
        setTimeout(function () { location.href = '../index.html?sacola=1'; }, 150);
      });
    });
  </script>
</body>
</html>
`;
}

// páginas de produto
const pastaProduto = path.join(raiz, 'produto');
fs.mkdirSync(pastaProduto, { recursive: true });
const ids = new Set(PRODUTOS.map(p => p.id));
for (const arq of fs.readdirSync(pastaProduto)) {
  // remove páginas de produtos que saíram do catálogo
  if (arq.endsWith('.html') && !ids.has(arq.replace(/\.html$/, ''))) fs.unlinkSync(path.join(pastaProduto, arq));
}
PRODUTOS.forEach(p => fs.writeFileSync(path.join(pastaProduto, `${p.id}.html`), pagina(p)));

// sitemap.xml
const hoje = new Date().toISOString().slice(0, 10);
const guia = fs.readdirSync(path.join(raiz, 'guia')).filter(a => a.endsWith('.html'));
const urls = [
  { loc: SITE, prioridade: '1.0' },
  ...PRODUTOS.map(p => ({ loc: `${SITE}produto/${p.id}.html`, prioridade: '0.8' })),
  ...guia.map(a => ({ loc: `${SITE}guia/${a}`, prioridade: '0.6' })),
  ...['trocas-e-devolucoes', 'prazos-de-entrega', 'politica-de-privacidade', 'termos-de-uso']
    .filter(a => fs.existsSync(path.join(raiz, 'paginas', `${a}.html`)))
    .map(a => ({ loc: `${SITE}paginas/${a}.html`, prioridade: '0.3' }))
];
fs.writeFileSync(path.join(raiz, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${hoje}</lastmod><priority>${u.prioridade}</priority></url>`).join('\n')}
</urlset>
`);

console.log(`${PRODUTOS.length} páginas de produto e sitemap com ${urls.length} endereços gerados.`);
