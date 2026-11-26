# Azzurra: loja de óculos de sol

Site estático (HTML, CSS e JS) baseado no template [Anon](https://github.com/codewithsadee/anon-ecommerce-website).

## Rodar localmente
```
node tools/servidor.js
```
Abra http://localhost:5173

## Onde editar
| O quê | Arquivo |
|---|---|
| Produtos, preços, estoque, WhatsApp, frete grátis, desconto Pix, oferta do dia | `assets/js/products.js` |
| Cores (paleta azul royal) | variáveis `--royal-*` no fim de `assets/css/store.css` |
| Fonte do logo (Dubiel) | coloque `Dubiel.woff2` (ou .woff/.ttf/.otf) em `assets/fonts/` |
| Fotos reais dos produtos | salve como `assets/images/products/<id>-1.jpg`, depois rode `python tools/comprimir-fotos.py`; prompts em `docs/prompts-imagens.md` |
| Banners e ilustrações provisórias | `node tools/gerar-artes.js` (gera `assets/images/art/`) |

## Como funciona a compra
Sacola salva no navegador do cliente. O botão "Finalizar pelo WhatsApp" abre uma conversa com o pedido já escrito.
Ainda não há pagamento online nem cálculo de frete.

## Páginas geradas
- **Páginas de produto** (`produto/`) e **sitemap.xml** são gerados a partir do catálogo. Sempre que mudar produtos ou preços em `assets/js/products.js`, rode:
  ```
  node tools/gerar-paginas.js
  ```
- **Páginas institucionais** (`paginas/`): Trocas e Devoluções, Prazos de Entrega, Política de Privacidade e Termos de Uso. São textos-modelo: preencha os campos destacados em amarelo e peça revisão jurídica.

## Analytics e cookies
Cole os IDs do Google Analytics 4, Meta Pixel e/ou Microsoft Clarity no topo de `assets/js/consentimento.js`.
O aviso de cookies só aparece quando há algum ID, e as ferramentas só carregam se o visitante aceitar.
Eventos enviados: `view_item`, `add_to_cart`, `begin_checkout` (clique em "Finalizar pelo WhatsApp") e `sign_up`.

## Avaliações
As notas do catálogo são de exemplo e estão ocultas (`mostrarAvaliacoes: false` em `products.js`). Ative quando tiver avaliações reais.

## Domínio próprio
Ao trocar de endereço, atualize `siteUrl` em `products.js`, rode `node tools/gerar-paginas.js` e troque `/azzurra-oculos/` por `/` no `404.html`.

## Ícones e fontes (hospedados no próprio site)
- Ícones: Ionicons 5.5.2 em `assets/vendor/ionicons/` (licença MIT). Só os ícones usados estão em `svg/`; para usar um ícone novo, copie o SVG dele do pacote `ionicons@5.5.2` para essa pasta.
- Fontes: Poppins, Bebas Neue, Parisienne e Playfair Display em `assets/fonts/` (licença SIL OFL), declaradas em `assets/css/fonts.css`.

## Provador virtual
- `assets/js/provador.js`: a pessoa usa a câmera ou envia uma foto; o MediaPipe Face Landmarker (Google, Apache 2.0) acha os olhos e o óculos é desenhado por cima. Tudo roda no navegador, nada é enviado.
- Arquivos do MediaPipe em `assets/vendor/mediapipe/` (`@mediapipe/tasks-vision` 1.2.3 e o modelo `face_landmarker.task`). Só são baixados quando alguém abre o provador.
- Abre pelo ícone de óculos no card, pelo botão na visualização rápida, ou com `index.html?provar=<id do produto>` (usado nas páginas de produto).
- Imagem do óculos: se existir `assets/images/provador/<id>.webp` (listado em `lista.json`), o provador usa a imagem real; senão usa a ilustração do `glasses-art.js`.
- Para adicionar imagens reais: salve as imagens de frente na pasta `fotos-provador` (ao lado de `site`) com o nome igual ao ID e rode `python site/tools/preparar-provador.py`. Ele tira o fundo liso, corta, reduz e atualiza a `lista.json`. Prompts em `docs/prompts-provador.md`.
- Ajuste fino: `LARGURA_ROSTO` (largura do óculos x largura do rosto) e `OLHO_ALTURA` no topo do `provador.js`; `ALFA_LENTE` (transparência das lentes) no `preparar-provador.py`.
- Realismo: movimento suavizado (filtro One Euro), apoio na ponte do nariz, sombra da armação e brilho ajustado à luz da câmera.
