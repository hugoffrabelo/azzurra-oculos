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
